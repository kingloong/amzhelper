<script setup>
import { ref, reactive } from 'vue'
import * as XLSX from 'xlsx'

const matchTypes = ['Exact', 'Phrase', 'Broad']
const biddingStrategies = ['Fixed bid', 'Dynamic bids - up and down', 'Dynamic bids - down only']

const productName = ref('')
const sku = ref('')
const defaultBudget = ref(1)
const bulkKeywords = ref('')

const keywords = reactive([])

const batchMatch = ref('Exact')
const batchBid = ref(0.75)
const batchTos = ref(100)
const batchRos = ref(50)
const batchPp = ref(50)
const batchBudget = ref(50)
const batchStrategy = ref('Fixed bid')

function parseBulkKeywords() {
  const lines = bulkKeywords.value.split('\n').map(s => s.trim()).filter(Boolean)
  const existing = new Set(keywords.map(k => k.text))
  lines.forEach(text => {
    if (!existing.has(text)) {
      keywords.push({ text, match: 'Exact', bid: 0.75, tos: 100, ros: 50, pp: 50, budget: 50, strategy: 'Fixed bid', customName: '' })
      existing.add(text)
    }
  })
  bulkKeywords.value = ''
}

function removeKeyword(i) { keywords.splice(i, 1) }

function applyAll(field) {
  const map = { match: batchMatch, bid: batchBid, tos: batchTos, ros: batchRos, pp: batchPp, budget: batchBudget, strategy: batchStrategy }
  keywords.forEach(k => k[field] = map[field].value)
}

function getCampaignName(kw) {
  if (kw.customName) return kw.customName
  return `${productName.value}+${kw.match}+${kw.text}`
}

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}

function generateRows() {
  const headers = ['Product','Entity','Operation','Campaign ID','Ad Group ID','Portfolio ID','Ad ID','Keyword ID','Product Targeting ID','Campaign Name','Ad Group Name','Start Date','End Date','Targeting Type','State','Daily Budget','SKU','Ad Group Default Bid','Bid','Keyword Text','Native Language Keyword','Native Language Locale','Match Type','Bidding Strategy','Placement','Percentage','Product Targeting Expression']
  const rows = [headers]
  const today = getToday()
  const budget = defaultBudget.value

  keywords.forEach(kw => {
    const name = getCampaignName(kw)
    const c = new Array(27).fill(null)
    c[0]='Sponsored Products'; c[1]='Campaign'; c[2]='Create'; c[3]=name; c[9]=name; c[11]=today; c[13]='Manual'; c[14]='enabled'; c[15]=budget; c[23]=kw.strategy
    rows.push(c)
  })
  const placements = [['placementTop','tos'],['placementRestOfSearch','ros'],['placementProductPage','pp']]
  placements.forEach(([p, field]) => {
    keywords.forEach(kw => {
      const name = getCampaignName(kw)
      const r = new Array(27).fill(null)
      r[0]='Sponsored Products'; r[1]='Bidding Adjustment'; r[2]='Create'; r[3]=name; r[14]='enabled'; r[24]=p; r[25]=kw[field]
      rows.push(r)
    })
  })
  keywords.forEach(kw => {
    const name = getCampaignName(kw)
    const r = new Array(27).fill(null)
    r[0]='Sponsored Products'; r[1]='Ad Group'; r[2]='Create'; r[3]=name; r[4]=name; r[10]=name; r[14]='enabled'; r[17]=0.3
    rows.push(r)
  })
  keywords.forEach(kw => {
    const name = getCampaignName(kw)
    const r = new Array(27).fill(null)
    r[0]='Sponsored Products'; r[1]='Product Ad'; r[2]='Create'; r[3]=name; r[4]=name; r[14]='enabled'; r[16]=sku.value
    rows.push(r)
  })
  keywords.forEach(kw => {
    const name = getCampaignName(kw)
    const r = new Array(27).fill(null)
    r[0]='Sponsored Products'; r[1]='Keyword'; r[2]='Create'; r[3]=name; r[4]=name; r[14]='enabled'; r[18]=kw.bid; r[19]=kw.text; r[22]=kw.match
    rows.push(r)
  })
  return rows
}

function exportExcel() {
  if (!keywords.length) return alert('请先添加关键词')
  if (!productName.value) return alert('请填写产品名')
  if (!sku.value) return alert('请填写SKU')
  const rows = generateRows()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `批量广告_${productName.value}_${getToday()}.xlsx`)
}
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1600px] mx-auto">
    <nav class="text-base text-gray-400 mb-4">
      <router-link to="/" class="hover:text-blue-500">首页</router-link> /
      <span class="text-gray-700">批量广告上传</span>
    </nav>
    <h1 class="text-2xl font-bold mb-6">📢 批量广告上传工具</h1>

    <!-- 基本信息 -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">基本信息</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">产品名 *</label>
          <input v-model="productName" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">SKU *</label>
          <input v-model="sku" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">广告类型</label>
          <select class="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700" disabled>
            <option>Manual</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">默认预算 (Daily Budget)</label>
          <input v-model.number="defaultBudget" type="number" class="w-full border rounded px-3 py-2" />
        </div>
      </div>
    </div>

    <!-- 批量导入关键词 -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">批量导入关键词</h2>
      <textarea v-model="bulkKeywords" rows="4" class="w-full border rounded px-3 py-2 mb-3" placeholder="每行一个关键词，粘贴后点击导入"></textarea>
      <button @click="parseBulkKeywords" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">导入关键词</button>
    </div>

    <!-- 关键词列表 -->
    <div v-if="keywords.length" class="bg-white rounded-lg shadow mb-6 overflow-x-auto">
      <div class="p-6 pb-0">
        <h2 class="text-lg font-semibold mb-4">关键词列表 ({{ keywords.length }})</h2>
      </div>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="border-b px-3 py-3 w-10">#</th>
            <th class="border-b px-3 py-3 min-w-[140px]">关键词</th>
            <th class="border-b px-3 py-3">投放方式</th>
            <th class="border-b px-3 py-3">Bid</th>
            <th class="border-b px-3 py-3">TOP%</th>
            <th class="border-b px-3 py-3">ROS%</th>
            <th class="border-b px-3 py-3">PP%</th>
            <th class="border-b px-3 py-3">预算</th>
            <th class="border-b px-3 py-3">Bidding Strategy</th>
            <th class="border-b px-3 py-3 min-w-[200px]">广告活动名（选填）</th>
            <th class="border-b px-3 py-3 w-12">操作</th>
          </tr>
          <!-- 批量设置行 -->
          <tr class="bg-blue-50">
            <td class="border-b px-3 py-2 text-center text-blue-600 font-semibold">批量</td>
            <td class="border-b px-3 py-2 text-xs text-blue-500">统一设置 ↓</td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <select v-model="batchMatch" class="border rounded px-1.5 py-1 text-sm flex-1">
                  <option v-for="m in matchTypes" :key="m">{{ m }}</option>
                </select>
                <button @click="applyAll('match')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <input v-model.number="batchBid" type="number" step="0.01" class="border rounded px-1.5 py-1 w-16 text-sm" />
                <button @click="applyAll('bid')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <input v-model.number="batchTos" type="number" class="border rounded px-1.5 py-1 w-14 text-sm" />
                <button @click="applyAll('tos')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <input v-model.number="batchRos" type="number" class="border rounded px-1.5 py-1 w-14 text-sm" />
                <button @click="applyAll('ros')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <input v-model.number="batchPp" type="number" class="border rounded px-1.5 py-1 w-14 text-sm" />
                <button @click="applyAll('pp')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <input v-model.number="batchBudget" type="number" class="border rounded px-1.5 py-1 w-16 text-sm" />
                <button @click="applyAll('budget')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-2 py-2">
              <div class="flex items-center gap-1">
                <select v-model="batchStrategy" class="border rounded px-1.5 py-1 text-sm flex-1">
                  <option v-for="s in biddingStrategies" :key="s">{{ s }}</option>
                </select>
                <button @click="applyAll('strategy')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 shrink-0">应用</button>
              </div>
            </td>
            <td class="border-b px-3 py-2"></td>
            <td class="border-b px-3 py-2"></td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(kw, i) in keywords" :key="i" class="hover:bg-gray-50">
            <td class="border-b px-3 py-2.5 text-center text-gray-500">{{ i + 1 }}</td>
            <td class="border-b px-3 py-2.5 font-medium">{{ kw.text }}</td>
            <td class="border-b px-2 py-1.5">
              <select v-model="kw.match" class="border rounded px-1.5 py-1.5 w-full text-sm">
                <option v-for="m in matchTypes" :key="m">{{ m }}</option>
              </select>
            </td>
            <td class="border-b px-2 py-1.5">
              <input v-model.number="kw.bid" type="number" step="0.01" class="border rounded px-1.5 py-1.5 w-16 text-sm" />
            </td>
            <td class="border-b px-2 py-1.5">
              <input v-model.number="kw.tos" type="number" class="border rounded px-1.5 py-1.5 w-14 text-sm" />
            </td>
            <td class="border-b px-2 py-1.5">
              <input v-model.number="kw.ros" type="number" class="border rounded px-1.5 py-1.5 w-14 text-sm" />
            </td>
            <td class="border-b px-2 py-1.5">
              <input v-model.number="kw.pp" type="number" class="border rounded px-1.5 py-1.5 w-14 text-sm" />
            </td>
            <td class="border-b px-2 py-1.5">
              <input v-model.number="kw.budget" type="number" class="border rounded px-1.5 py-1.5 w-16 text-sm" />
            </td>
            <td class="border-b px-2 py-1.5">
              <select v-model="kw.strategy" class="border rounded px-1.5 py-1.5 w-full text-sm">
                <option v-for="s in biddingStrategies" :key="s">{{ s }}</option>
              </select>
            </td>
            <td class="border-b px-2 py-1.5">
              <input v-model="kw.customName" class="border rounded px-1.5 py-1.5 w-full text-sm" :placeholder="getCampaignName(kw)" />
            </td>
            <td class="border-b px-3 py-2.5 text-center">
              <button @click="removeKeyword(i)" class="text-red-400 hover:text-red-600 text-lg">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 导出 -->
    <div class="flex items-center gap-4 mb-4">
      <button @click="exportExcel" class="bg-green-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-green-700" :disabled="!keywords.length">
        📥 导出Excel
      </button>
    </div>

    <p class="text-xs text-gray-400 mt-2">🔒 数据完全在浏览器中处理，不会上传到任何服务器</p>
  </div>
</template>
