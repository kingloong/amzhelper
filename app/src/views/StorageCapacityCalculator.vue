<script setup>
import { computed, reactive } from 'vue'

const POINTS_RATE = 0.15
const SAMPLE_PRICES = [20, 30, 50, 80, 100]

const fieldConfigs = [
  {
    key: 'currentCapacity',
    label: '现有 FBA 库容限制',
    unit: '立方英尺',
    placeholder: '例如 1000',
    required: true,
    helper: '当前已经分配的 FBA 库容',
  },
  {
    key: 'plannedCapacity',
    label: '计划申请 FBA 库容',
    unit: '立方英尺',
    placeholder: '例如 200',
    required: true,
    helper: '本次计划额外申请的 FBA 库容',
  },
  {
    key: 'monthlySales',
    label: '申请月份销售额预估',
    unit: '美元',
    placeholder: '例如 2000',
    required: true,
    helper: '用于计算竞价费用和目标销量',
  },
  {
    key: 'averagePrice',
    label: '平均商品价格',
    unit: '美元',
    placeholder: '选填，例如 20',
    required: false,
    helper: '选填，用于生成自定义月销量和日销量',
  },
]

const form = reactive({
  currentCapacity: '',
  plannedCapacity: '',
  monthlySales: '',
  averagePrice: '',
})

const touched = reactive({
  currentCapacity: false,
  plannedCapacity: false,
  monthlySales: false,
  averagePrice: false,
})

function validateField(value, required) {
  if (value === '') {
    return required ? '请输入对应值' : ''
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return '请输入有效数字'
  }

  if (parsed <= 0) {
    return '值必须为正数'
  }

  return ''
}

const rawErrors = computed(() => ({
  currentCapacity: validateField(form.currentCapacity, true),
  plannedCapacity: validateField(form.plannedCapacity, true),
  monthlySales: validateField(form.monthlySales, true),
  averagePrice: validateField(form.averagePrice, false),
}))

const displayErrors = computed(() => ({
  currentCapacity: touched.currentCapacity ? rawErrors.value.currentCapacity : '',
  plannedCapacity: touched.plannedCapacity ? rawErrors.value.plannedCapacity : '',
  monthlySales: touched.monthlySales ? rawErrors.value.monthlySales : '',
  averagePrice: touched.averagePrice ? rawErrors.value.averagePrice : '',
}))

const numericValues = computed(() => ({
  currentCapacity: rawErrors.value.currentCapacity ? null : Number(form.currentCapacity),
  plannedCapacity: rawErrors.value.plannedCapacity ? null : Number(form.plannedCapacity),
  monthlySales: rawErrors.value.monthlySales ? null : Number(form.monthlySales),
  averagePrice: rawErrors.value.averagePrice || form.averagePrice === '' ? null : Number(form.averagePrice),
}))

const canCalculateBidResults = computed(() =>
  numericValues.value.currentCapacity !== null &&
  numericValues.value.plannedCapacity !== null &&
  numericValues.value.monthlySales !== null,
)

const canCalculateSalesExamples = computed(() => numericValues.value.monthlySales !== null)
const canCalculateCustomSales = computed(() =>
  numericValues.value.monthlySales !== null && numericValues.value.averagePrice !== null,
)

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrency(value) {
  return `$${formatNumber(value)}`
}

function formatPercent(value) {
  return `${formatNumber(value * 100)}%`
}

function formatUnits(value, unit) {
  return `${formatNumber(value)} ${unit}`
}

const emptyBidResults = [
  { label: '新的总 FBA 库容限制', value: '-', featured: false },
  { label: '额外库容占比', value: '-', featured: false },
  { label: '按比例分摊销售额', value: '-', featured: false },
  { label: '绩效积分赚取率（每 $1 销售额）', value: '$0.15', featured: false },
  { label: '绩效积分总额', value: '-', featured: false },
  { label: '库容竞价费用', value: '-', featured: true },
]

const bidResults = computed(() => {
  if (!canCalculateBidResults.value) {
    return null
  }

  const totalCapacity = numericValues.value.currentCapacity + numericValues.value.plannedCapacity
  const plannedRatio = numericValues.value.plannedCapacity / totalCapacity
  const allocatedSales = numericValues.value.monthlySales * plannedRatio
  const totalPoints = allocatedSales * POINTS_RATE
  const bidFee = totalPoints / numericValues.value.plannedCapacity

  return [
    { label: '新的总 FBA 库容限制', value: formatUnits(totalCapacity, '立方英尺'), featured: false },
    { label: '额外库容占比', value: formatPercent(plannedRatio), featured: false },
    { label: '按比例分摊销售额', value: formatCurrency(allocatedSales), featured: false },
    { label: '绩效积分赚取率（每 $1 销售额）', value: '$0.15', featured: false },
    { label: '绩效积分总额', value: formatCurrency(totalPoints), featured: false },
    { label: '库容竞价费用', value: `${formatCurrency(bidFee)} / 立方英尺`, featured: true },
  ]
})

const visibleBidResults = computed(() => bidResults.value ?? emptyBidResults)

const sampleRows = computed(() =>
  SAMPLE_PRICES.map(price => {
    if (!canCalculateSalesExamples.value) {
      return { price, monthlyOrders: null, dailyOrders: null }
    }

    const monthlyOrders = numericValues.value.monthlySales / price
    const dailyOrders = monthlyOrders / 30

    return { price, monthlyOrders, dailyOrders }
  }),
)

const customSalesResult = computed(() => {
  if (!canCalculateCustomSales.value) {
    return null
  }

  const monthlyOrders = numericValues.value.monthlySales / numericValues.value.averagePrice
  const dailyOrders = monthlyOrders / 30

  return {
    averagePrice: numericValues.value.averagePrice,
    monthlyOrders,
    dailyOrders,
  }
})

function markTouched(key) {
  touched[key] = true
}
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1500px] mx-auto space-y-6">
    <nav class="text-base text-gray-400">
      <router-link to="/" class="hover:text-blue-500 transition">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">库容申请计算器</span>
    </nav>

    <div class="space-y-2">
      <h1 class="text-3xl lg:text-4xl font-bold text-gray-800">📦 库容申请计算器</h1>
      <p class="text-base text-gray-500">
        根据现有库容、计划申请库容和销售额预估，实时估算 FBA 库容竞价费用，并提供目标销量参考。
      </p>
    </div>

    <section class="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
      <div class="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 class="text-xl font-bold text-blue-600">输入区域</h2>
          <p class="mt-1 text-sm text-gray-500">前 3 项为必填，平均商品价格为选填项。</p>
        </div>
        <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
          自动更新结果
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          v-for="field in fieldConfigs"
          :key="field.key"
          class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
        >
          <label :for="field.key" class="block text-sm font-semibold text-gray-700 mb-2">
            {{ field.label }}
          </label>
          <div class="relative">
            <input
              :id="field.key"
              v-model="form[field.key]"
              type="number"
              step="any"
              min="0"
              :placeholder="field.placeholder"
              class="w-full rounded-xl border px-4 py-3 pr-24 text-base text-gray-700 bg-white outline-none transition"
              :class="displayErrors[field.key] ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'"
              @input="markTouched(field.key)"
              @blur="markTouched(field.key)"
            >
            <span class="absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
              {{ field.unit }}
            </span>
          </div>
          <p v-if="displayErrors[field.key]" class="mt-2 text-sm text-red-500">
            {{ displayErrors[field.key] }}
          </p>
          <p v-else class="mt-2 text-sm text-gray-400">
            {{ field.helper }}
          </p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-6 items-start">
      <div class="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 class="text-xl font-bold text-gray-800">库容竞价费用结果</h2>
            <p class="mt-1 text-sm text-gray-500">根据库容申请比例和销售额预估自动计算目标底价。</p>
          </div>
          <span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-100">
            结果概览
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in visibleBidResults"
            :key="item.label"
            class="rounded-2xl border px-5 py-4 transition"
            :class="item.featured
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-100 shadow-sm'
              : 'border-gray-100 bg-gray-50'"
          >
            <div class="flex items-start justify-between gap-3">
              <p :class="item.featured ? 'text-sm font-semibold text-emerald-700' : 'text-sm text-gray-500'">
                {{ item.label }}
              </p>
              <span
                v-if="item.featured"
                class="rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
              >
                核心结果
              </span>
            </div>
            <p
              class="mt-2 break-words"
              :class="item.featured ? 'text-[2rem] font-bold text-emerald-800 leading-tight' : 'text-2xl font-bold text-gray-800'"
            >
              {{ item.value }}
            </p>
            <p v-if="item.featured" class="mt-2 text-sm text-emerald-700/80">
              这是本次库容申请的目标竞价费用参考。
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <section class="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 class="text-xl font-bold text-gray-800">目标销量参考</h2>
              <p class="mt-1 text-sm text-gray-500">默认示例区间始终按销售额预估自动换算。</p>
            </div>
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
              月销量 / 日销量
            </span>
          </div>

          <div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-5 py-5 mb-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-emerald-700">自定义区间</p>
                <h3 class="mt-1 text-lg font-bold text-gray-800">平均价格结果</h3>
                <p class="mt-1 text-sm text-gray-500">
                  {{ customSalesResult ? '根据你填写的平均商品价格生成实时销量参考。' : '填写有效的平均商品价格后，这里会自动显示对应结果。' }}
                </p>
              </div>
              <div class="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                平均价格 {{ customSalesResult ? formatCurrency(customSalesResult.averagePrice) : '-' }}
              </div>
            </div>

            <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="rounded-2xl border border-white/80 bg-white/90 px-5 py-4 shadow-sm">
                <p class="text-sm font-medium text-gray-500">月销量</p>
                <p class="mt-3 text-3xl font-bold text-gray-900">
                  {{ customSalesResult ? formatNumber(customSalesResult.monthlyOrders) : '-' }}
                </p>
                <p class="mt-2 text-xs uppercase tracking-[0.2em] text-gray-400">Monthly Volume</p>
              </div>
              <div class="rounded-2xl border border-white/80 bg-white/90 px-5 py-4 shadow-sm">
                <p class="text-sm font-medium text-gray-500">日销量</p>
                <p class="mt-3 text-3xl font-bold text-emerald-700">
                  {{ customSalesResult ? formatNumber(customSalesResult.dailyOrders) : '-' }}
                </p>
                <p class="mt-2 text-xs uppercase tracking-[0.2em] text-gray-400">Daily Volume</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 sm:p-5">
            <div class="flex items-center justify-between gap-3 mb-4">
              <div>
                <p class="text-sm font-semibold text-gray-700">默认参考区间</p>
                <p class="mt-1 text-sm text-gray-500">不同平均价格下的月销量和日销量参考。</p>
              </div>
              <span class="hidden sm:inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 border border-gray-200">
                $20 - $100
              </span>
            </div>

            <div class="space-y-3">
              <div
                v-for="row in sampleRows"
                :key="row.price"
                class="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm transition hover:border-emerald-100 hover:bg-emerald-50/40"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="sm:min-w-28">
                    <p class="text-xs uppercase tracking-[0.16em] text-gray-400">Average Price</p>
                    <p class="mt-1 text-xl font-bold text-gray-800">${{ row.price }}</p>
                  </div>

                  <div class="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                    <div class="rounded-xl bg-gray-50 px-4 py-3">
                      <p class="text-sm text-gray-500">月销量</p>
                      <p class="mt-2 text-lg font-bold text-gray-900">
                        {{ row.monthlyOrders === null ? '-' : formatNumber(row.monthlyOrders) }}
                      </p>
                    </div>
                    <div class="rounded-xl bg-emerald-50 px-4 py-3">
                      <p class="text-sm text-emerald-700">日销量</p>
                      <p class="mt-2 text-lg font-bold text-emerald-700">
                        {{ row.dailyOrders === null ? '-' : formatNumber(row.dailyOrders) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5">
      <h2 class="text-lg font-bold text-amber-800 mb-3">备注说明</h2>
      <div class="space-y-2 text-sm text-amber-900">
        <p>计算结果仅为目标底价，实际后台填写的库容竞价费用以竞价最低者为准。</p>
        <p>库容审核通过后可提前一个月使用，不必等待下月。</p>
      </div>
    </section>
  </div>
</template>
