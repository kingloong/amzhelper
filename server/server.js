const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument, PDFName, StandardFonts, rgb } = require('pdf-lib');
const zlib = require('zlib');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// ============ 持久化数据目录 ============
// Zeabur 挂载了 /data 持久硬盘，本地开发用 server 目录
const DATA_DIR = fs.existsSync('/data') ? '/data' : __dirname;

// ============ 设备认证系统 ============

const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const ACCESS_CODE = 'KL2026';   // 公司访问码，给同事用的
const ADMIN_KEY = 'admin888';          // 管理员密钥，只有你自己知道

function loadDevices() {
  try {
    return JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveDevices(devices) {
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2), 'utf8');
}

// 同事注册设备：输入访问码 + 自动生成的设备ID
app.post('/api/auth/register', (req, res) => {
  const { code, deviceId, name } = req.body;
  if (!code || !deviceId) return res.status(400).json({ error: '参数缺失' });
  if (code !== ACCESS_CODE && code !== ADMIN_KEY) return res.status(403).json({ error: '访问码错误' });

  const isAdmin = code === ADMIN_KEY;
  const devices = loadDevices();
  const existing = devices.find(d => d.deviceId === deviceId);
  if (existing) {
    // 管理员密钥可以直接把已有设备升级为已审批
    if (isAdmin && existing.status !== 'approved') {
      existing.status = 'approved';
      existing.approvedAt = new Date().toISOString();
      saveDevices(devices);
    }
    return res.json({ status: existing.status, message: existing.status === 'approved' ? '已授权' : '等待管理员审批' });
  }

  // 新设备：管理员密钥直接审批，普通访问码需等待审批
  const device = {
    id: crypto.randomUUID(),
    deviceId,
    name: name || '未命名设备',
    status: isAdmin ? 'approved' : 'pending',
    createdAt: new Date().toISOString(),
    approvedAt: isAdmin ? new Date().toISOString() : undefined,
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
  devices.push(device);
  saveDevices(devices);
  res.json({ status: device.status, message: isAdmin ? '管理员已授权' : '设备已登记，请等待管理员审批' });
});

// 检查设备状态
app.post('/api/auth/check', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ status: 'unknown' });

  const devices = loadDevices();
  const device = devices.find(d => d.deviceId === deviceId);
  if (!device) return res.json({ status: 'unknown' });
  res.json({ status: device.status });
});

// ============ 管理员接口 ============

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: '管理员密钥错误' });
  next();
}

// 获取所有设备列表
app.get('/api/admin/devices', adminAuth, (req, res) => {
  res.json(loadDevices());
});

// 审批通过
app.post('/api/admin/approve/:id', adminAuth, (req, res) => {
  const devices = loadDevices();
  const device = devices.find(d => d.id === req.params.id);
  if (!device) return res.status(404).json({ error: '设备不存在' });
  device.status = 'approved';
  device.approvedAt = new Date().toISOString();
  saveDevices(devices);
  res.json({ success: true });
});

// 移除设备
app.post('/api/admin/remove/:id', adminAuth, (req, res) => {
  let devices = loadDevices();
  devices = devices.filter(d => d.id !== req.params.id);
  saveDevices(devices);
  res.json({ success: true });
});

// 验证管理员密钥
app.post('/api/admin/verify', (req, res) => {
  const { key } = req.body;
  res.json({ valid: key === ADMIN_KEY });
});

// ============ FBA 标签处理 ============

function parseTextPositions(doc, page) {
  const ref = page.node.get(PDFName.of('Contents'));
  const ctx = doc.context;
  const resolved = ctx.lookup(ref);
  let stream;
  if (resolved.constructor.name === 'PDFArray') {
    const bufs = [];
    for (let i = 0; i < resolved.size(); i++) bufs.push(ctx.lookup(resolved.get(i)).getContents());
    stream = Buffer.concat(bufs);
  } else {
    stream = resolved.getContents();
  }
  let text;
  try { text = zlib.inflateSync(stream).toString('latin1'); } catch { text = stream.toString('latin1'); }

  const results = [];
  let curX = 0, curY = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    const tmMatch = t.match(/^[\d.\-]+\s+[\d.\-]+\s+[\d.\-]+\s+[\d.\-]+\s+([\d.\-]+)\s+([\d.\-]+)\s+Tm$/);
    if (tmMatch) { curX = parseFloat(tmMatch[1]); curY = parseFloat(tmMatch[2]); }
    const tjMatch = t.match(/\((.+?)\)\s*Tj$/);
    if (tjMatch) results.push({ x: curX, y: curY, raw: tjMatch[1] });
  }
  return results;
}

function detectType(doc) {
  const page = doc.getPages()[0];
  const { width, height } = page.getSize();
  const texts = parseTextPositions(doc, page);
  const hasSingleSKU = texts.some(t => t.raw.includes('Single SKU'));
  if (hasSingleSKU) return 'box';
  if (width >= 500 && height >= 700) return 'product';
  if (width < 500 && height < 700) return 'box';
  return 'unknown';
}

async function processProductLabel(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    const texts = parseTextPositions(doc, page);
    if (!texts.length) continue;

    // 按 x 坐标分组（同一列的标签 x 相近），再在每组内找最低 y（即 "New" 那一行）
    // 先按 y 降序排列，然后按相邻 y 差值分组识别每个标签
    const sorted = [...texts].sort((a, b) => b.y - a.y);
    const groups = [];
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = current[current.length - 1];
      // 同一个标签内的文字 y 差距 < 30，不同标签之间 > 30
      if (Math.abs(prev.x - sorted[i].x) < 30 && prev.y - sorted[i].y < 30) {
        current.push(sorted[i]);
      } else {
        groups.push(current);
        current = [sorted[i]];
      }
    }
    groups.push(current);

    // 每组标签：在最低 y 位置（"New" 行）的右侧添加 Made in China
    for (const group of groups) {
      const bottomText = group.reduce((min, t) => t.y < min.y ? t : min, group[0]);
      page.drawText('Made in China', {
        x: bottomText.x + 55, y: bottomText.y, size: 7,
        font: helvetica, color: rgb(0, 0, 0),
      });
    }
  }
  return doc.save();
}

async function processBoxLabel(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);

  for (const page of doc.getPages()) {
    const texts = parseTextPositions(doc, page);
    const fbaPositions = texts.filter(t => t.raw.startsWith('FBA:') && t.raw.length > 5);
    const skuPositions = texts.filter(t => t.raw.includes('Single SKU'));

    for (const fba of fbaPositions) {
      page.drawRectangle({
        x: fba.x - 2, y: fba.y - 2, width: 125, height: 8,
        color: rgb(1, 1, 1),
      });
    }
    for (const sku of skuPositions) {
      page.drawText('Made in China', {
        x: sku.x - 115, y: sku.y, size: 8,
        font: helvetica, color: rgb(0, 0, 0),
      });
    }
  }
  return doc.save();
}

async function processPdf(buffer) {
  const doc = await PDFDocument.load(buffer);
  const type = detectType(doc);
  if (type === 'product') return { bytes: await processProductLabel(buffer), type };
  if (type === 'box') return { bytes: await processBoxLabel(buffer), type };
  throw new Error('无法识别标签类型');
}

app.post('/api/process', upload.array('files'), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: '请上传PDF文件' });
    const results = [];
    for (const file of req.files) {
      const { bytes, type } = await processPdf(file.buffer);
      results.push({
        name: Buffer.from(file.originalname, 'latin1').toString('utf8').replace('.pdf', '_processed.pdf'),
        type,
        data: Buffer.from(bytes).toString('base64'),
      });
    }
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ PDF 转链接 ============

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PDF_META_FILE = path.join(DATA_DIR, 'pdf-files.json');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

function loadPdfMeta() {
  try { return JSON.parse(fs.readFileSync(PDF_META_FILE, 'utf8')); } catch { return []; }
}
function savePdfMeta(data) {
  fs.writeFileSync(PDF_META_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = crypto.randomUUID() + ext;
      cb(null, name);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  },
});

// 上传 PDF
app.post('/api/pdf-upload', pdfUpload.array('files', 20), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: '请上传PDF文件' });
  const meta = loadPdfMeta();
  const newFiles = req.files.map(f => ({
    filename: f.filename,
    originalName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
    size: f.size,
    uploadedAt: new Date().toISOString(),
  }));
  meta.unshift(...newFiles);
  savePdfMeta(meta);
  res.json({ files: newFiles });
});

// 获取文件列表
app.get('/api/pdf-files', (req, res) => {
  res.json({ files: loadPdfMeta() });
});

// 删除文件
app.delete('/api/pdf-files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const meta = loadPdfMeta().filter(f => f.filename !== filename);
  savePdfMeta(meta);
  res.json({ success: true });
});

// 提供上传文件的静态访问
app.use('/uploads', express.static(UPLOADS_DIR));

// ============ 订单形式发票 PDF 生成 ============

const INVOICE_I18N = {
  en: { invoice: 'INVOICE', invoiceNo: 'Invoice No.', orderNo: 'Order No.', date: 'Date', billTo: 'Bill To', description: 'Description', qty: 'Qty', unitPrice: 'Unit Price', amount: 'Amount', subtotal: 'Subtotal', total: 'Total', thankYou: 'Thank you for your purchase!', note: 'This is a commercial invoice issued for the above order.' },
  es: { invoice: 'FACTURA', invoiceNo: 'No. Factura', orderNo: 'No. Pedido', date: 'Fecha', billTo: 'Facturar a', description: 'Descripcion', qty: 'Cant.', unitPrice: 'Precio Unit.', amount: 'Importe', subtotal: 'Subtotal', total: 'Total', thankYou: 'Gracias por su compra!', note: 'Esta es una factura comercial emitida por el pedido anterior.' },
  fr: { invoice: 'FACTURE', invoiceNo: 'N Facture', orderNo: 'N Commande', date: 'Date', billTo: 'Facturer a', description: 'Description', qty: 'Qte', unitPrice: 'Prix Unit.', amount: 'Montant', subtotal: 'Sous-total', total: 'Total', thankYou: 'Merci pour votre achat !', note: 'Ceci est une facture commerciale emise pour la commande ci-dessus.' },
  de: { invoice: 'RECHNUNG', invoiceNo: 'Rechnungsnr.', orderNo: 'Bestellnr.', date: 'Datum', billTo: 'Rechnung an', description: 'Beschreibung', qty: 'Menge', unitPrice: 'Einzelpreis', amount: 'Betrag', subtotal: 'Zwischensumme', total: 'Gesamt', thankYou: 'Vielen Dank fur Ihren Einkauf!', note: 'Dies ist eine Handelsrechnung fur die oben genannte Bestellung.' },
  it: { invoice: 'FATTURA', invoiceNo: 'N. Fattura', orderNo: 'N. Ordine', date: 'Data', billTo: 'Fatturare a', description: 'Descrizione', qty: 'Q.ta', unitPrice: 'Prezzo Unit.', amount: 'Importo', subtotal: 'Subtotale', total: 'Totale', thankYou: 'Grazie per il suo acquisto!', note: 'Questa e una fattura commerciale emessa per l\'ordine di cui sopra.' },
};

function sanitizeInvoiceText(s) {
  if (s == null) return '';
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
}

app.post('/api/invoice/generate', async (req, res) => {
  try {
    const { language = 'en', orderNumber, brandName, buyerName, invoiceDate, buyerAddress, items = [], total } = req.body;
    const t = INVOICE_I18N[language] || INVOICE_I18N.en;

    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const marginX = 50;
    const black = rgb(0.15, 0.15, 0.15);
    const gray = rgb(0.5, 0.5, 0.5);
    const line = rgb(0.8, 0.8, 0.8);
    const accent = rgb(0.23, 0.51, 0.96);

    page.drawText(sanitizeInvoiceText(brandName || ''), { x: marginX, y: height - 70, size: 22, font: bold, color: black });
    const title = t.invoice;
    const titleW = bold.widthOfTextAtSize(title, 32);
    page.drawText(title, { x: width - marginX - titleW, y: height - 75, size: 32, font: bold, color: accent });

    page.drawLine({ start: { x: marginX, y: height - 95 }, end: { x: width - marginX, y: height - 95 }, thickness: 1.5, color: accent });

    let infoY = height - 125;
    const drawInfoRow = (label, value) => {
      const text = `${label}: ${value}`;
      const w = helv.widthOfTextAtSize(text, 11);
      page.drawText(text, { x: width - marginX - w, y: infoY, size: 11, font: helv, color: black });
      infoY -= 16;
    };
    drawInfoRow(t.orderNo, sanitizeInvoiceText(orderNumber || ''));
    drawInfoRow(t.date, sanitizeInvoiceText(invoiceDate || new Date().toISOString().slice(0, 10)));

    let billY = height - 125;
    page.drawText(t.billTo, { x: marginX, y: billY, size: 11, font: bold, color: gray });
    billY -= 18;
    page.drawText(sanitizeInvoiceText(buyerName || ''), { x: marginX, y: billY, size: 12, font: bold, color: black });
    billY -= 16;
    if (buyerAddress) {
      page.drawText(sanitizeInvoiceText(buyerAddress), { x: marginX, y: billY, size: 11, font: helv, color: black });
    }

    let tableY = height - 240;
    const colX = { desc: marginX, qty: marginX + 280, unit: marginX + 340, amt: marginX + 420 };
    const tableRight = width - marginX;

    page.drawRectangle({ x: marginX, y: tableY - 6, width: tableRight - marginX, height: 24, color: rgb(0.95, 0.96, 0.98) });
    page.drawText(t.description, { x: colX.desc + 6, y: tableY + 2, size: 10, font: bold, color: black });
    page.drawText(t.qty, { x: colX.qty, y: tableY + 2, size: 10, font: bold, color: black });
    page.drawText(t.unitPrice, { x: colX.unit, y: tableY + 2, size: 10, font: bold, color: black });
    const amtHdrW = bold.widthOfTextAtSize(t.amount, 10);
    page.drawText(t.amount, { x: tableRight - 6 - amtHdrW, y: tableY + 2, size: 10, font: bold, color: black });

    tableY -= 28;
    for (const it of items) {
      const name = sanitizeInvoiceText(it.name || '');
      const qty = String(it.qty || 0);
      const unit = `$${Number(it.unitPrice || 0).toFixed(2)}`;
      const amt = `$${Number(it.amount || 0).toFixed(2)}`;

      page.drawText(name, { x: colX.desc + 6, y: tableY, size: 11, font: helv, color: black, maxWidth: 260 });
      page.drawText(qty, { x: colX.qty, y: tableY, size: 11, font: helv, color: black });
      page.drawText(unit, { x: colX.unit, y: tableY, size: 11, font: helv, color: black });
      const amtW = helv.widthOfTextAtSize(amt, 11);
      page.drawText(amt, { x: tableRight - 6 - amtW, y: tableY, size: 11, font: helv, color: black });

      page.drawLine({ start: { x: marginX, y: tableY - 8 }, end: { x: tableRight, y: tableY - 8 }, thickness: 0.5, color: line });
      tableY -= 24;
    }

    tableY -= 10;
    const subtotalVal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const subtotalStr = `$${subtotalVal.toFixed(2)}`;
    const totalStr = `$${Number(total || subtotalVal).toFixed(2)}`;

    const drawTotalRow = (label, value, isBold, size) => {
      const font = isBold ? bold : helv;
      const labelStr = `${label}:`;
      const labelW = font.widthOfTextAtSize(labelStr, size);
      const valueW = font.widthOfTextAtSize(value, size);
      page.drawText(labelStr, { x: tableRight - 130 - labelW, y: tableY, size, font, color: black });
      page.drawText(value, { x: tableRight - 6 - valueW, y: tableY, size, font, color: black });
      tableY -= size + 8;
    };
    drawTotalRow(t.subtotal, subtotalStr, false, 11);
    page.drawLine({ start: { x: tableRight - 180, y: tableY + 8 }, end: { x: tableRight, y: tableY + 8 }, thickness: 0.5, color: line });
    drawTotalRow(t.total, totalStr, true, 14);

    const footerY = 90;
    page.drawLine({ start: { x: marginX, y: footerY + 40 }, end: { x: width - marginX, y: footerY + 40 }, thickness: 0.5, color: line });
    page.drawText(t.thankYou, { x: marginX, y: footerY + 20, size: 12, font: bold, color: accent });
    page.drawText(t.note, { x: marginX, y: footerY, size: 9, font: helv, color: gray });

    const bytes = await doc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${orderNumber || 'order'}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ 托管前端静态文件 ============

const distPath = path.join(__dirname, '..', 'app', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Vue Router history 模式：所有非 API 路由返回 index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
