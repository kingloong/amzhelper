<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

// 临时仓库代号
const TEMP_WAREHOUSES = [
  'KRB4','KRB6','KRB9','HOU3','SCA7','MCE1','ATL7','FTW8','MDT9',
  'QXX6','XPH8','SSD','SMI1','HGA6','HDC3','HLA6','FAR1','HNE1','HMD3','XF4'
]

const dragging = ref(false)
const fileName = ref('')
const results = ref([])
const expandedRow = ref(null)

function generateEmailBody(asin, productName, quantity, location) {
  return `Dear Amazon Seller Support Team,

ASIN:${asin}
Product Name: ${productName}
Quantity: ${quantity}
Warehouse Location: ${location}
Despite multiple attempts to address the situation, managing and selling these units has proven challenging.

From the perspective of a seller, efficient inventory management is crucial in ensuring that our customers receive their products promptly. However, the limitations imposed by the temporary warehouse, particularly in terms of logistics and order processing, have negatively impacted the customer experience. Given that this product has consistently achieved high sales, we are eager to maintain a reliable supply to meet customer demand.

From Amazon's standpoint, transferring this inventory to a standard fulfillment center would not only allow us to improve our management and sales efforts but also help relieve the burden on the temporary warehouse. This change would enhance overall logistics efficiency and contribute to greater customer satisfaction, a mutual goal we share.

Therefore, I kindly request your assistance in transferring this inventory to a more suitable fulfillment center. We believe this move will increase the visibility and sales opportunities for the product while ensuring seamless cooperation with Amazon.

Should you require any further information or documentation to support this request, please do not hesitate to contact me. I sincerely appreciate Amazon's continued support and look forward to maintaining a positive and productive partnership.

Best regards`
}

function generateEmailSubject(asin, location) {
  return `${asin} ${location} 临时调配`
}

function generateFullEmail(asin, productName, quantity, location) {
  const subject = generateEmailSubject(asin, location)
  const body = generateEmailBody(asin, productName, quantity, location)
  return `邮件标题：${subject}\n\n${body}`
}

function parseExcel(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    // 找到表头行（跳过空行），确定列索引
    let headerIdx = 0
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].length > 10) {
        headerIdx = i
        break
      }
    }

    const matched = []
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 21) continue

      const location = String(row[20] || '').trim()
      if (TEMP_WAREHOUSES.includes(location)) {
        const asin = String(row[2] || '').trim()
        const title = String(row[4] || '').trim()
        const quantity = row[18] != null ? Number(row[18]) : 0
        matched.push({ asin, title, quantity, location })
      }
    }
    results.value = matched
  }
  reader.readAsArrayBuffer(file)
}

function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  fileName.value = file.name
  parseExcel(file)
}

function handleDrop(e) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (!file) return
  fileName.value = file.name
  parseExcel(file)
}

function handleDragOver(e) {
  e.preventDefault()
  dragging.value = true
}

function handleDragLeave() {
  dragging.value = false
}

function toggleExpand(idx) {
  expandedRow.value = expandedRow.value === idx ? null : idx
}

function exportExcel() {
  if (!results.value.length) return
  const header = ['ASIN', 'Title', 'Ending Warehouse Balance', 'Location', '邮件模板']
  const data = results.value.map(r => [
    r.asin,
    r.title,
    r.quantity,
    r.location,
    generateFullEmail(r.asin, r.title, r.quantity, r.location)
  ])
  const ws = XLSX.utils.aoa_to_sheet([header, ...data])

  // 设置邮件模板列宽度
  ws['!cols'] = [
    { wch: 14 },  // ASIN
    { wch: 40 },  // Title
    { wch: 24 },  // Ending Warehouse Balance
    { wch: 12 },  // Location
    { wch: 80 },  // 邮件模板
  ]

  // 设置邮件模板列自动换行
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let r = 1; r <= range.e.r; r++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c: 4 })
    if (ws[cellAddr]) {
      ws[cellAddr].s = { alignment: { wrapText: true, vertical: 'top' } }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '临时仓邮件')
  XLSX.writeFile(wb, `临时仓邮件模板_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function clearData() {
  results.value = []
  fileName.value = ''
  expandedRow.value = null
}

const totalQuantity = computed(() => results.value.reduce((sum, r) => sum + r.quantity, 0))
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1600px] mx-auto">
    <!-- 面包屑 -->
    <nav class="text-base text-gray-400 mb-4">
      <router-link to="/" class="hover:text-blue-500">首页</router-link> /
      <span class="text-gray-700">临时仓邮件生成</span>
    </nav>
    <h1 class="text-2xl font-bold mb-6">📧 临时仓邮件生成工具</h1>

    <!-- 上传区域 -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">上传库存分布表格</h2>
      <div
        :class="[
          'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        ]"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="handleFileChange"
        />
        <div v-if="!fileName" class="text-gray-500">
          <p class="text-4xl mb-3">📁</p>
          <p class="text-lg font-medium">点击或拖拽上传文件</p>
          <p class="text-sm text-gray-400 mt-1">支持 .xlsx / .xls 格式（亚马逊后台库存仓库地址分布表格）</p>
        </div>
        <div v-else class="text-green-600">
          <p class="text-4xl mb-3">✅</p>
          <p class="text-lg font-medium">{{ fileName }}</p>
          <p class="text-sm text-gray-400 mt-1">点击重新上传 或 拖拽新文件替换</p>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="results.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">临时仓记录数</p>
        <p class="text-2xl font-bold text-blue-600">{{ results.length }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">涉及仓库数</p>
        <p class="text-2xl font-bold text-orange-500">{{ [...new Set(results.map(r => r.location))].length }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">涉及ASIN数</p>
        <p class="text-2xl font-bold text-purple-600">{{ [...new Set(results.map(r => r.asin))].length }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">总库存数量</p>
        <p class="text-2xl font-bold text-green-600">{{ totalQuantity }}</p>
      </div>
    </div>

    <!-- 结果表格 -->
    <div v-if="results.length" class="bg-white rounded-lg shadow mb-6 overflow-x-auto">
      <div class="p-6 pb-0 flex items-center justify-between">
        <h2 class="text-lg font-semibold">临时仓库存明细 ({{ results.length }} 条)</h2>
      </div>
      <table class="w-full text-sm border-collapse mt-4">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="border-b px-4 py-3 w-10">#</th>
            <th class="border-b px-4 py-3">ASIN</th>
            <th class="border-b px-4 py-3">Title</th>
            <th class="border-b px-4 py-3 text-right">Ending Warehouse Balance</th>
            <th class="border-b px-4 py-3">Location</th>
            <th class="border-b px-4 py-3">邮件标题</th>
            <th class="border-b px-4 py-3 w-20 text-center">邮件预览</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(r, i) in results" :key="i">
            <tr class="hover:bg-gray-50">
              <td class="border-b px-4 py-3 text-center text-gray-500">{{ i + 1 }}</td>
              <td class="border-b px-4 py-3 font-mono text-blue-700">{{ r.asin }}</td>
              <td class="border-b px-4 py-3 max-w-xs truncate" :title="r.title">{{ r.title }}</td>
              <td class="border-b px-4 py-3 text-right font-medium">{{ r.quantity }}</td>
              <td class="border-b px-4 py-3">
                <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">{{ r.location }}</span>
              </td>
              <td class="border-b px-4 py-3 text-gray-600 text-xs">{{ generateEmailSubject(r.asin, r.location) }}</td>
              <td class="border-b px-4 py-3 text-center">
                <button
                  @click="toggleExpand(i)"
                  class="text-blue-500 hover:text-blue-700 text-sm"
                >{{ expandedRow === i ? '收起' : '展开' }}</button>
              </td>
            </tr>
            <tr v-if="expandedRow === i">
              <td colspan="7" class="bg-gray-50 px-6 py-4 border-b">
                <pre class="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{{ generateFullEmail(r.asin, r.title, r.quantity, r.location) }}</pre>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 操作按钮 -->
    <div v-if="results.length" class="flex items-center gap-4 mb-4">
      <button
        @click="exportExcel"
        class="bg-green-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-green-700 transition"
      >
        📥 导出Excel
      </button>
      <button
        @click="clearData"
        class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg text-lg hover:bg-gray-300 transition"
      >
        清除数据
      </button>
    </div>

    <!-- 说明 -->
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <h2 class="text-lg font-semibold mb-3">使用说明</h2>
      <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600">
        <li>从亚马逊后台下载<strong>库存仓库地址分布表格</strong>（Inventory Ledger 或类似报表）</li>
        <li>将表格文件拖拽或点击上传到上方区域</li>
        <li>系统自动识别 U 列（Location）中属于临时仓的记录</li>
        <li>点击"导出Excel"即可下载包含邮件模板的表格，邮件模板可直接复制粘贴发送</li>
      </ol>
      <div class="mt-4 p-3 bg-orange-50 rounded text-sm text-orange-700">
        当前已配置的临时仓代号：{{ TEMP_WAREHOUSES.join('、') }}
      </div>
    </div>

    <p class="text-xs text-gray-400 mt-4">🔒 数据完全在浏览器中处理，不会上传到任何服务器</p>
  </div>
</template>
