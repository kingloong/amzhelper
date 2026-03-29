<script setup>
import { computed, reactive, ref } from 'vue'

const COMMISSION_RATE = 0.15
const FX_LOSS_RATE = 0.25
const reviewPercentFields = [
  { key: 'fiveStarPct', label: '5 星占比', accent: 'text-amber-500' },
  { key: 'fourStarPct', label: '4 星占比', accent: 'text-lime-500' },
  { key: 'threeStarPct', label: '3 星占比', accent: 'text-sky-500' },
  { key: 'twoStarPct', label: '2 星占比', accent: 'text-orange-500' },
  { key: 'oneStarPct', label: '1 星占比', accent: 'text-rose-500' },
]

const reviewForm = reactive({
  fiveStarPct: '', fourStarPct: '', threeStarPct: '', twoStarPct: '', oneStarPct: '', totalReviews: '', targetRating: '',
})
const costForm = reactive({
  productCost: '', firstLegCost: '', fbaFee: '', price: '', priceCurrency: 'RMB', exchangeRate: '6.5', reviewCommission: '90', expectedSales: '',
})
const displayCurrency = ref('RMB')
const reviewTouched = reactive({
  fiveStarPct: false, fourStarPct: false, threeStarPct: false, twoStarPct: false, oneStarPct: false, totalReviews: false, targetRating: false,
})
const costTouched = reactive({
  productCost: false, firstLegCost: false, fbaFee: false, price: false, exchangeRate: false, reviewCommission: false, expectedSales: false,
})

function validateRequiredNumber(value, { allowZero = false } = {}) {
  if (value === '') return '请输入对应值'
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '请输入有效数字'
  if (allowZero ? parsed < 0 : parsed <= 0) return '请输入有效数字'
  return ''
}

function validatePercent(value) {
  if (value === '') return '请输入对应值'
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return '请输入有效数字'
  return ''
}

const reviewErrors = computed(() => ({
  fiveStarPct: validatePercent(reviewForm.fiveStarPct),
  fourStarPct: validatePercent(reviewForm.fourStarPct),
  threeStarPct: validatePercent(reviewForm.threeStarPct),
  twoStarPct: validatePercent(reviewForm.twoStarPct),
  oneStarPct: validatePercent(reviewForm.oneStarPct),
  totalReviews: validateRequiredNumber(reviewForm.totalReviews),
  targetRating: (() => {
    const error = validateRequiredNumber(reviewForm.targetRating)
    if (error) return error
    return Number(reviewForm.targetRating) >= 5 ? '目标评分必须小于 5' : ''
  })(),
}))

const reviewPercentTotalError = computed(() => {
  if (reviewPercentFields.some(field => reviewErrors.value[field.key])) return ''
  const total = reviewPercentFields.reduce((sum, field) => sum + Number(reviewForm[field.key]), 0)
  return Math.abs(total - 100) > 0.01 ? '各星级百分比总和必须等于 100%' : ''
})

const displayedReviewErrors = computed(() => ({
  fiveStarPct: reviewTouched.fiveStarPct ? reviewErrors.value.fiveStarPct : '',
  fourStarPct: reviewTouched.fourStarPct ? reviewErrors.value.fourStarPct : '',
  threeStarPct: reviewTouched.threeStarPct ? reviewErrors.value.threeStarPct : '',
  twoStarPct: reviewTouched.twoStarPct ? reviewErrors.value.twoStarPct : '',
  oneStarPct: reviewTouched.oneStarPct ? reviewErrors.value.oneStarPct : '',
  totalReviews: reviewTouched.totalReviews ? reviewErrors.value.totalReviews : '',
  targetRating: reviewTouched.targetRating ? reviewErrors.value.targetRating : '',
  percentTotal: reviewPercentFields.some(field => reviewTouched[field.key]) ? reviewPercentTotalError.value : '',
}))

const canCalculateReview = computed(() => !Object.values(reviewErrors.value).some(Boolean) && !reviewPercentTotalError.value)

const reviewResult = computed(() => {
  if (!canCalculateReview.value) return null
  const totalReviews = Number(reviewForm.totalReviews)
  const targetRating = Number(reviewForm.targetRating)
  const currentRating =
    Number(reviewForm.fiveStarPct) * 0.05 +
    Number(reviewForm.fourStarPct) * 0.04 +
    Number(reviewForm.threeStarPct) * 0.03 +
    Number(reviewForm.twoStarPct) * 0.02 +
    Number(reviewForm.oneStarPct) * 0.01
  const currentTotalScore = currentRating * totalReviews
  const reached = targetRating <= currentRating
  const rawNeeded = reached ? 0 : (targetRating * totalReviews - currentTotalScore) / (5 - targetRating)
  return {
    currentRating,
    targetRating,
    requiredFiveStarReviews: reached ? 0 : Math.max(0, Math.ceil(rawNeeded)),
    reached,
  }
})

const costErrors = computed(() => ({
  productCost: validateRequiredNumber(costForm.productCost, { allowZero: true }),
  firstLegCost: validateRequiredNumber(costForm.firstLegCost, { allowZero: true }),
  fbaFee: validateRequiredNumber(costForm.fbaFee, { allowZero: true }),
  price: validateRequiredNumber(costForm.price),
  exchangeRate: validateRequiredNumber(costForm.exchangeRate),
  reviewCommission: validateRequiredNumber(costForm.reviewCommission, { allowZero: true }),
  expectedSales: validateRequiredNumber(costForm.expectedSales),
}))

const displayedCostErrors = computed(() => ({
  productCost: costTouched.productCost ? costErrors.value.productCost : '',
  firstLegCost: costTouched.firstLegCost ? costErrors.value.firstLegCost : '',
  fbaFee: costTouched.fbaFee ? costErrors.value.fbaFee : '',
  price: costTouched.price ? costErrors.value.price : '',
  exchangeRate: costTouched.exchangeRate ? costErrors.value.exchangeRate : '',
  reviewCommission: costTouched.reviewCommission ? costErrors.value.reviewCommission : '',
  expectedSales: costTouched.expectedSales ? costErrors.value.expectedSales : '',
}))

const canCalculateCostBase = computed(() =>
  !['productCost', 'firstLegCost', 'fbaFee', 'price', 'exchangeRate', 'reviewCommission'].some(key => costErrors.value[key]),
)

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits }).format(value)
}

function formatMoney(value, currency) {
  return `${currency === 'RMB' ? '¥' : '$'}${formatNumber(value)}`
}

const normalizedCost = computed(() => {
  if (!canCalculateCostBase.value) return null
  const exchangeRate = Number(costForm.exchangeRate)
  const productCostRmb = Number(costForm.productCost)
  const firstLegCostRmb = Number(costForm.firstLegCost)
  const fbaUsd = Number(costForm.fbaFee)
  const reviewCommissionRmb = Number(costForm.reviewCommission)
  const priceRaw = Number(costForm.price)
  const priceRmb = costForm.priceCurrency === 'RMB' ? priceRaw : priceRaw * exchangeRate
  const commissionRmb = priceRmb * COMMISSION_RATE
  const avgReviewCostRmb =
    productCostRmb + firstLegCostRmb + fbaUsd * exchangeRate + commissionRmb + reviewCommissionRmb + priceRmb * FX_LOSS_RATE
  const unitMarginRmb = priceRmb - productCostRmb - firstLegCostRmb - fbaUsd * exchangeRate - commissionRmb
  return {
    exchangeRate,
    commissionRmb,
    commissionUsd: commissionRmb / exchangeRate,
    avgReviewCostRmb,
    avgReviewCostUsd: avgReviewCostRmb / exchangeRate,
    unitMarginRmb,
  }
})

const costResult = computed(() => {
  if (!normalizedCost.value) return null
  const requiredReviews = reviewResult.value?.requiredFiveStarReviews ?? null
  const averageReviewCost = displayCurrency.value === 'RMB' ? normalizedCost.value.avgReviewCostRmb : normalizedCost.value.avgReviewCostUsd
  const totalReviewCost = requiredReviews === null ? null : averageReviewCost * requiredReviews
  const expectedSales = !costErrors.value.expectedSales ? Number(costForm.expectedSales) : null
  const paybackBase = expectedSales === null ? null : normalizedCost.value.unitMarginRmb * expectedSales
  const paybackDays =
    requiredReviews === null || paybackBase === null || paybackBase <= 0
      ? null
      : (normalizedCost.value.avgReviewCostRmb * requiredReviews) / paybackBase
  return { requiredReviews, averageReviewCost, totalReviewCost, paybackDays, paybackUnavailable: paybackBase !== null && paybackBase <= 0 }
})

const costOutputCards = computed(() => [
  { label: '平均单个测评费用', value: costResult.value ? formatMoney(costResult.value.averageReviewCost, displayCurrency.value) : '-', accent: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
  { label: '总测评费用', value: costResult.value?.totalReviewCost !== null && costResult.value?.totalReviewCost !== undefined ? formatMoney(costResult.value.totalReviewCost, displayCurrency.value) : '-', accent: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  { label: '回本周期', value: costResult.value?.paybackDays !== null && costResult.value?.paybackDays !== undefined ? `${formatNumber(costResult.value.paybackDays)} 天` : '-', accent: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
])

function markReviewTouched(key) { reviewTouched[key] = true }
function markAllReviewTouched() { Object.keys(reviewTouched).forEach(key => { reviewTouched[key] = true }) }
function markCostTouched(key) { costTouched[key] = true }
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1550px] mx-auto space-y-8">
    <nav class="text-sm text-gray-400 flex items-center gap-1">
      <router-link to="/" class="hover:text-blue-500 transition">首页</router-link>
      <span class="mx-1">/</span>
      <span class="text-gray-600 font-medium">评论计算器</span>
    </nav>

    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-8 lg:p-10 text-white shadow-lg">
      <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
      <div class="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
      <h1 class="relative text-3xl lg:text-4xl font-extrabold tracking-tight">⭐ 评论计算器</h1>
      <p class="relative mt-2 text-base text-white/85 max-w-2xl">计算达到目标评分所需的 5 星评论数量，并进一步估算测评成本和回本周期。</p>
    </div>

    <section class="bg-white rounded-3xl border border-gray-100 p-6 lg:p-8 shadow-md space-y-6">
      <div class="flex items-center gap-3">
        <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-xl">⭐</span>
        <div>
          <h2 class="text-xl font-bold text-gray-800">评论计算器</h2>
          <p class="text-sm text-gray-400">输入各星级百分比、原评论总数和目标评分，计算所需新增的 5 星评论数量。</p>
        </div>
      </div>

      <button type="button" class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all duration-200" @click="markAllReviewTouched">
        🚀 计算所需 5 星数量
      </button>

      <div class="review-top-layout grid gap-6 items-start">
        <div class="rounded-3xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3 mb-5">
            <div class="flex items-center gap-2.5">
              <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-sm">📊</span>
              <div>
                <h3 class="text-base font-bold text-gray-800">星级占比</h3>
                <p class="text-xs text-gray-400">五个百分比相加必须等于 100%</p>
              </div>
            </div>
            <span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">% 占比</span>
          </div>

          <div class="space-y-2.5">
            <div v-for="(field, idx) in reviewPercentFields" :key="field.key" class="review-star-field group rounded-xl border border-gray-100 bg-white px-4 py-3 hover:border-amber-200 hover:shadow-sm transition-all duration-200">
              <div class="flex items-center justify-between gap-3">
                <label :for="field.key" class="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span class="flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold text-white" :class="['bg-amber-400','bg-lime-500','bg-sky-500','bg-orange-400','bg-rose-400'][idx]">{{ 5 - idx }}</span>
                  {{ field.label }}
                </label>
                <div class="review-star-input relative">
                  <input
                    :id="field.key"
                    v-model="reviewForm[field.key]"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    class="w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-700 bg-gray-50/80 outline-none transition-all duration-200"
                    :class="displayedReviewErrors[field.key] ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 group-hover:border-amber-200'"
                    @input="markReviewTouched(field.key)"
                    @blur="markReviewTouched(field.key)"
                  >
                  <span class="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">%</span>
                </div>
              </div>
              <p v-if="displayedReviewErrors[field.key]" class="mt-1.5 text-xs text-red-500 pl-8">{{ displayedReviewErrors[field.key] }}</p>
            </div>
          </div>

          <p v-if="displayedReviewErrors.percentTotal" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 font-medium">⚠️ {{ displayedReviewErrors.percentTotal }}</p>
        </div>

        <div class="review-target-panel rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-5 shadow-sm md:sticky md:top-20">
          <div class="flex items-center gap-2.5 mb-5">
            <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-sm">🎯</span>
            <div>
              <h3 class="text-base font-bold text-emerald-800">评论目标</h3>
              <p class="text-xs text-emerald-600/70">填写原评论总数和目标评分</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
              <label for="totalReviews" class="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>原评论总数
              </label>
              <div class="relative mt-3">
                <input id="totalReviews" v-model="reviewForm.totalReviews" type="number" step="1" min="1" placeholder="输入评论总数" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-gray-50/50 outline-none transition-all duration-200" :class="displayedReviewErrors.totalReviews ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'" @input="markReviewTouched('totalReviews')" @blur="markReviewTouched('totalReviews')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">条</span>
              </div>
              <p v-if="displayedReviewErrors.totalReviews" class="mt-2 text-xs text-red-500">{{ displayedReviewErrors.totalReviews }}</p>
            </div>

            <div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm">
              <label for="targetRating" class="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>目标评分
              </label>
              <div class="relative mt-3">
                <input id="targetRating" v-model="reviewForm.targetRating" type="number" step="0.1" min="0" max="4.99" placeholder="如 4.5" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition-all duration-200" :class="displayedReviewErrors.targetRating ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-emerald-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'" @input="markReviewTouched('targetRating')" @blur="markReviewTouched('targetRating')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">分</span>
              </div>
              <p v-if="displayedReviewErrors.targetRating" class="mt-2 text-xs text-red-500">{{ displayedReviewErrors.targetRating }}</p>
              <p v-else class="mt-2 text-xs text-emerald-600/70">请输入小于 5 的目标评论分数。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 计算结果 -->
      <div class="review-result-layout grid gap-4">
        <div class="result-card-current group rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-50 to-white px-6 py-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <p class="text-sm font-medium text-gray-400 mb-2">当前评分</p>
          <div class="flex items-baseline gap-2">
            <p class="review-result-number review-result-number-dark">
              {{ reviewResult ? formatNumber(reviewResult.currentRating) : '-' }}
            </p>
            <span class="text-sm text-gray-400">/ 5.0</span>
          </div>
        </div>

        <div class="result-card-needed group rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50/50 px-6 py-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <p class="text-sm font-medium text-orange-400 mb-2">需要新增 5 星评论</p>
          <div class="flex items-baseline gap-2">
            <p class="review-result-number review-result-number-accent">
              {{ reviewResult ? formatNumber(reviewResult.requiredFiveStarReviews, 0) : '-' }}
            </p>
            <span class="text-sm text-orange-400">条</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 测评成本计算模块 -->
    <section class="bg-white rounded-3xl border border-gray-100 p-6 lg:p-8 shadow-md">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-xl">💰</span>
          <div>
            <h2 class="text-xl font-bold text-gray-800">测评成本计算</h2>
            <p class="text-sm text-gray-400">评估平均单个测评费用、总测评费用和回本周期</p>
          </div>
        </div>
        <div class="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button type="button" class="rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200" :class="displayCurrency === 'RMB' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" @click="displayCurrency = 'RMB'">¥ 人民币</button>
          <button type="button" class="rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200" :class="displayCurrency === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" @click="displayCurrency = 'USD'">$ 美元</button>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-6 items-start">
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <label for="productCost" class="block text-sm font-semibold text-gray-700">产品成本</label>
              <div class="relative mt-3">
                <input id="productCost" v-model="costForm.productCost" type="number" step="0.01" min="0" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.productCost ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('productCost')" @blur="markCostTouched('productCost')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">RMB</span>
              </div>
              <p v-if="displayedCostErrors.productCost" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.productCost }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">每件产品成本。</p>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <label for="firstLegCost" class="block text-sm font-semibold text-gray-700">头程</label>
              <div class="relative mt-3">
                <input id="firstLegCost" v-model="costForm.firstLegCost" type="number" step="0.01" min="0" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.firstLegCost ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('firstLegCost')" @blur="markCostTouched('firstLegCost')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">RMB</span>
              </div>
              <p v-if="displayedCostErrors.firstLegCost" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.firstLegCost }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">运输头程成本。</p>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <label for="fbaFee" class="block text-sm font-semibold text-gray-700">FBA 费用</label>
              <div class="relative mt-3">
                <input id="fbaFee" v-model="costForm.fbaFee" type="number" step="0.01" min="0" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.fbaFee ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('fbaFee')" @blur="markCostTouched('fbaFee')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">USD</span>
              </div>
              <p v-if="displayedCostErrors.fbaFee" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.fbaFee }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">平台收取的 FBA 费用。</p>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <div class="flex items-start justify-between gap-3">
                <label for="price" class="block text-sm font-semibold text-gray-700">售价</label>
                <div class="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                  <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold transition" :class="costForm.priceCurrency === 'RMB' ? 'bg-blue-600 text-white' : 'text-gray-500'" @click="costForm.priceCurrency = 'RMB'">RMB</button>
                  <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold transition" :class="costForm.priceCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-500'" @click="costForm.priceCurrency = 'USD'">USD</button>
                </div>
              </div>
              <div class="relative mt-3">
                <input id="price" v-model="costForm.price" type="number" step="0.01" min="0" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.price ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('price')" @blur="markCostTouched('price')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">{{ costForm.priceCurrency }}</span>
              </div>
              <p v-if="displayedCostErrors.price" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.price }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">支持人民币或美元输入。</p>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <label for="exchangeRate" class="block text-sm font-semibold text-gray-700">汇率</label>
              <div class="relative mt-3">
                <input id="exchangeRate" v-model="costForm.exchangeRate" type="number" step="0.01" min="0" class="w-full rounded-xl border px-4 py-3 pr-20 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.exchangeRate ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('exchangeRate')" @blur="markCostTouched('exchangeRate')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">RMB/USD</span>
              </div>
              <p v-if="displayedCostErrors.exchangeRate" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.exchangeRate }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">默认 6.5，用于 FBA 和佣金换算。</p>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <label for="reviewCommission" class="block text-sm font-semibold text-gray-700">测评佣金</label>
              <div class="relative mt-3">
                <input id="reviewCommission" v-model="costForm.reviewCommission" type="number" step="0.01" min="0" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.reviewCommission ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('reviewCommission')" @blur="markCostTouched('reviewCommission')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">RMB</span>
              </div>
              <p v-if="displayedCostErrors.reviewCommission" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.reviewCommission }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">默认 90，可按实际情况修改。</p>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <label for="expectedSales" class="block text-sm font-semibold text-gray-700">达到评分预计销量</label>
              <div class="relative mt-3">
                <input id="expectedSales" v-model="costForm.expectedSales" type="number" step="1" min="0" class="w-full rounded-xl border px-4 py-3 pr-16 text-base text-gray-700 bg-white outline-none transition" :class="displayedCostErrors.expectedSales ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'" @input="markCostTouched('expectedSales')" @blur="markCostTouched('expectedSales')">
                <span class="absolute inset-y-0 right-4 flex items-center text-sm text-gray-400">件</span>
              </div>
              <p v-if="displayedCostErrors.expectedSales" class="mt-2 text-sm text-red-500">{{ displayedCostErrors.expectedSales }}</p>
              <p v-else class="mt-2 text-sm text-gray-400">用于估算回本周期的预期销量。</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-violet-100 bg-violet-50/70 px-5 py-4">
              <p class="text-sm text-violet-700">佣金（自动计算）</p>
              <p class="mt-2 text-2xl font-bold text-violet-900">{{ normalizedCost ? `${formatMoney(normalizedCost.commissionRmb, 'RMB')} / ${formatMoney(normalizedCost.commissionUsd, 'USD')}` : '-' }}</p>
              <p class="mt-2 text-sm text-violet-700/80">售价 × 15%，不可手动修改。</p>
            </div>
            <div class="rounded-2xl border border-rose-100 bg-rose-50/70 px-5 py-4">
              <p class="text-sm text-rose-700">汇损</p>
              <p class="mt-2 text-2xl font-bold text-rose-900">{{ formatNumber(FX_LOSS_RATE * 100, 0) }}%</p>
              <p class="mt-2 text-sm text-rose-700/80">固定值 0.25，按售价参与计算。</p>
            </div>
          </div>
        </div>

        <aside class="space-y-4">
          <div class="rounded-3xl border border-gray-200 bg-gray-50/70 p-5">
            <p class="text-sm font-semibold text-gray-700">结果基准</p>
            <p class="mt-2 text-sm text-gray-500">总测评费用会直接引用上方“所需新增 5 星评论数量”。</p>
            <div class="mt-4 rounded-2xl border border-white bg-white px-5 py-4 shadow-sm">
              <p class="text-sm text-gray-500">所需新增 5 星数量</p>
              <p class="mt-2 text-3xl font-bold text-gray-900">{{ reviewResult ? formatNumber(reviewResult.requiredFiveStarReviews, 0) : '-' }}</p>
            </div>
          </div>

          <div v-for="card in costOutputCards" :key="card.label" class="rounded-3xl border px-5 py-5 shadow-sm" :class="card.bg">
            <p class="text-sm text-gray-500">{{ card.label }}</p>
            <p class="mt-3 text-3xl font-bold" :class="card.accent">{{ card.value }}</p>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <p class="text-sm font-semibold text-gray-700">说明</p>
            <ul class="mt-3 space-y-2 text-sm text-gray-500">
              <li>平均单个测评费用 = 产品成本 + 头程 + FBA 换算 + 佣金换算 + 测评佣金 + 售价 × 汇损。</li>
              <li>总测评费用 = 平均单个测评费用 × 所需新增 5 星数量。</li>
              <li v-if="costResult?.paybackUnavailable" class="text-red-500">当前单件利润为负或为零，无法计算有效回本周期。</li>
              <li v-else-if="!costResult?.paybackDays" class="text-gray-400">补全成本模块输入后会显示回本周期。</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.review-top-layout {
  grid-template-columns: minmax(0, 1fr);
}

.review-result-number {
  font-size: clamp(1.6rem, 2vw, 2.2rem);
  line-height: 0.9;
  font-weight: 800;
  flex-shrink: 0;
}

.review-result-number-dark {
  color: #0f172a;
}

.review-result-number-accent {
  color: #ea580c;
}

@media (min-width: 900px) {
  .review-top-layout {
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  }

  .review-target-panel {
    min-height: 100%;
  }

  .review-star-input {
    max-width: 250px;
  }

  .review-result-layout {
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  }

  .review-result-number {
    font-size: clamp(1.8rem, 2.2vw, 2.4rem);
  }
}
</style>
