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

// ============ 设备认证系统 ============

const DEVICES_FILE = path.join(__dirname, 'devices.json');
const ACCESS_CODE = 'amzhelper2024';   // 公司访问码，给同事用的
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
  if (code !== ACCESS_CODE) return res.status(403).json({ error: '访问码错误' });

  const devices = loadDevices();
  const existing = devices.find(d => d.deviceId === deviceId);
  if (existing) {
    return res.json({ status: existing.status, message: existing.status === 'approved' ? '已授权' : '等待管理员审批' });
  }

  // 新设备，加入待审批列表
  const device = {
    id: crypto.randomUUID(),
    deviceId,
    name: name || '未命名设备',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
  devices.push(device);
  saveDevices(devices);
  res.json({ status: 'pending', message: '设备已登记，请等待管理员审批' });
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
  if (width >= 600 && height >= 780) return 'product';
  if (width < 400 && height < 500) return 'box';
  return 'unknown';
}

async function processProductLabel(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    const texts = parseTextPositions(doc, page);
    const colStarts = [22, 222, 422];
    const rowYs = [694, 622, 550, 478, 406, 334, 262, 190, 118, 46];
    for (const cx of colStarts) {
      for (const ry of rowYs) {
        const hasContent = texts.some(t => Math.abs(t.x - cx) < 15 && Math.abs(t.y - ry) < 5);
        if (hasContent) {
          page.drawText('Made in China', {
            x: cx + 55, y: ry, size: 7,
            font: helvetica, color: rgb(0, 0, 0),
          });
        }
      }
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

// ============ 托管前端静态文件 ============

const distPath = path.join(__dirname, '..', 'app', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Vue Router history 模式：所有非 API 路由返回 index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
