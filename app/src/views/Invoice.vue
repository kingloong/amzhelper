<script setup>
import { reactive, computed, ref } from 'vue'
import { API_BASE } from '../auth.js'

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  language: 'en',
  orderNumber: '',
  brandName: '',
  buyerName: '',
  invoiceDate: today,
  buyerAddress: '',
  items: [
    { name: '', qty: 1, unitPrice: 0 }
  ],
  overrideTotal: '',
})

const languages = [
  { code: 'en', label: 'English 英语（默认）' },
  { code: 'es', label: 'Español 西班牙语' },
  { code: 'fr', label: 'Français 法语' },
  { code: 'de', label: 'Deutsch 德语' },
  { code: 'it', label: 'Italiano 意大利语' },
]

const loading = ref(false)
const error = ref('')

const computedTotal = computed(() =>
  form.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0)
)

const displayTotal = computed(() => {
  const o = parseFloat(form.overrideTotal)
  return !isNaN(o) && form.overrideTotal !== '' ? o : computedTotal.value
})

function addItem() {
  form.items.push({ name: '', qty: 1, unitPrice: 0 })
}
function removeItem(i) {
  if (form.items.length > 1) form.items.splice(i, 1)
}

async function generate() {
  error.value = ''
  if (!form.orderNumber || !form.brandName || !form.buyerName) {
    error.value = '请填写订单号、品牌名和买家名字'
    return
  }
  if (form.items.some(it => !it.name || !it.qty || !it.unitPrice)) {
    error.value = '每个产品都需要填写名称、数量和单价'
    return
  }
  loading.value = true
  try {
    const payload = {
      ...form,
      total: displayTotal.value,
      items: form.items.map(it => ({
        name: it.name,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        amount: Number(it.qty) * Number(it.unitPrice),
      })),
    }
    const res = await fetch(`${API_BASE}/api/invoice/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'PDF生成失败' }))
      throw new Error(err.error)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice_${form.orderNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300'
</script>

<template>
  <div class="p-8 lg:p-12 max-w-[1100px] mx-auto">
    <nav class="text-lg text-gray-400 mb-6">
      <router-link to="/" class="hover:text-blue-500">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">订单形式发票</span>
    </nav>
    <h1 class="text-4xl font-bold text-gray-800 mb-10">🧾 订单形式发票</h1>

    <div class="bg-white rounded-xl border border-gray-200 p-10 mb-8">
      <!-- 语言 -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">发票语言</label>
        <select v-model="form.language" :class="inp + ' max-w-md'">
          <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.label }}</option>
        </select>
      </div>

      <!-- 基本信息 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">订单号 Order Number *</label>
          <input v-model="form.orderNumber" :class="inp" placeholder="114-1234567-8901234" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">品牌名 Brand Name *</label>
          <input v-model="form.brandName" :class="inp" placeholder="Your Brand" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">买家名字 Buyer Name *</label>
          <input v-model="form.buyerName" :class="inp" placeholder="John Smith" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">发票日期 Invoice Date</label>
          <input v-model="form.invoiceDate" type="date" :class="inp" />
        </div>
      </div>

      <div class="mb-8">
        <label class="block text-sm font-medium text-gray-700 mb-2">买家地址 Buyer Address（城市，州，邮编）</label>
        <input v-model="form.buyerAddress" :class="inp" placeholder="Los Angeles, CA 90001" />
      </div>

      <!-- 产品明细 -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium text-gray-700">产品明细 Items</label>
          <button @click="addItem" class="text-sm text-blue-500 hover:text-blue-700">+ 添加产品</button>
        </div>
        <div class="space-y-3">
          <div v-for="(it, i) in form.items" :key="i" class="grid grid-cols-12 gap-3 items-end">
            <div class="col-span-6">
              <label class="block text-xs text-gray-600 mb-1">产品名</label>
              <input v-model="it.name" :class="inp" placeholder="Product name" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">数量</label>
              <input v-model.number="it.qty" type="number" min="1" :class="inp" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">单价 (USD)</label>
              <input v-model.number="it.unitPrice" type="number" step="0.01" min="0" :class="inp" />
            </div>
            <div class="col-span-1 text-sm text-gray-600 pb-3">
              ${{ ((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)).toFixed(2) }}
            </div>
            <div class="col-span-1 pb-2">
              <button v-if="form.items.length > 1" @click="removeItem(i)"
                class="text-red-400 hover:text-red-600 text-lg">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 总金额 -->
      <div class="mb-6 bg-gray-50 rounded-lg p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600">自动合计</div>
            <div class="text-2xl font-bold text-gray-800">${{ computedTotal.toFixed(2) }}</div>
          </div>
          <div class="flex-1 max-w-xs ml-8">
            <label class="block text-sm text-gray-700 mb-2">总金额（可选：手动覆盖）</label>
            <input v-model="form.overrideTotal" type="number" step="0.01" :class="inp"
              :placeholder="computedTotal.toFixed(2)" />
          </div>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-base mb-4">{{ error }}</p>

      <button @click="generate" :disabled="loading"
        class="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition">
        {{ loading ? '生成中...' : '🖨️ 生成并下载 PDF' }}
      </button>
    </div>

    <!-- 说明 -->
    <div class="bg-white rounded-xl border border-gray-200 p-8">
      <h2 class="text-lg font-bold text-gray-800 mb-4">📖 说明</h2>
      <ul class="text-base text-gray-600 space-y-2 list-disc list-inside">
        <li>填写订单信息后点击"生成并下载 PDF"，浏览器会自动下载发票文件</li>
        <li>语言默认英文，支持西班牙语、法语、德语、意大利语</li>
        <li>金额单位为美元（USD），自动合计，也可手动覆盖总金额</li>
        <li>可以添加多个产品明细行</li>
      </ul>
    </div>
  </div>
</template>
