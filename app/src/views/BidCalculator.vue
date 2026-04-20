<script setup>
import { reactive, computed } from 'vue'

const strategies = ['动态竞价 - 提高和降低', '动态竞价 - 只降低', '固定竞价']
const placements = ['First page Top of Search', 'Product pages', 'Rest of search']
const placementLabels = { 'First page Top of Search': 'TOS', 'Product pages': 'PP', 'Rest of search': 'ROS' }

function getCoeff(strategy, placement) {
  if (strategy === '动态竞价 - 提高和降低')
    return placement === 'First page Top of Search' ? 2 : 1.5
  return 1
}

// 左侧：百分比 → CPC
const left = reactive({
  strategy: '动态竞价 - 提高和降低',
  baseCpc: 1.05,
  rows: [{ pct: 30, cvr: 10 }, { pct: 20, cvr: 10 }, { pct: 20, cvr: 10 }],
})

const leftResults = computed(() =>
  left.rows.map((r, i) => {
    const cpc = +(left.baseCpc * (1 + r.pct / 100) * getCoeff(left.strategy, placements[i])).toFixed(2)
    const budget = r.cvr > 0 ? +(cpc / (r.cvr / 100)).toFixed(2) : 0
    return { cpc, budget }
  })
)
const leftTotal = computed(() => leftResults.value.reduce((s, r) => s + r.budget, 0).toFixed(2))

// 右侧：CPC → 百分比
const right = reactive({
  strategy: '固定竞价',
  baseCpc: 3,
  rows: [{ targetCpc: 4.5, cvr: 15 }, { targetCpc: 5, cvr: 10 }, { targetCpc: 1.8, cvr: 8 }],
})

const rightResults = computed(() =>
  right.rows.map((r, i) => {
    const coeff = getCoeff(right.strategy, placements[i])
    const pct = right.baseCpc > 0 ? Math.round((r.targetCpc / right.baseCpc / coeff - 1) * 100) : 0
    const budget = r.cvr > 0 ? +(r.targetCpc / (r.cvr / 100)).toFixed(2) : 0
    return { pct, budget }
  })
)
const rightTotal = computed(() => rightResults.value.reduce((s, r) => s + r.budget, 0).toFixed(2))
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1600px] mx-auto">
    <nav class="text-base text-gray-400 mb-4">
      <router-link to="/" class="hover:text-blue-500 transition">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">广告位竞价计算</span>
    </nav>
    <h1 class="text-3xl font-bold text-gray-800 mb-8">◆ 广告位竞价计算器</h1>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <!-- 左侧：百分比 → CPC -->
      <div class="bg-white rounded-xl border border-gray-200 p-8">
        <h2 class="text-lg font-bold text-blue-600 mb-6 flex items-center gap-2.5">
          <span class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base">📊</span>
          正向计算：百分比 → CPC
        </h2>
        <div class="grid grid-cols-2 gap-5 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">竞价策略</label>
            <select v-model="left.strategy"
              class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition">
              <option v-for="s in strategies" :key="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">基础 CPC ($)</label>
            <input v-model.number="left.baseCpc" type="number" step="0.01" min="0"
              class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition" />
          </div>
        </div>

        <div class="rounded-lg border border-gray-100 overflow-hidden">
          <table class="w-full text-base">
            <thead>
              <tr class="bg-gray-50 text-gray-500 text-sm">
                <th class="text-left py-4 px-5 font-medium">广告位</th>
                <th class="py-4 px-4 font-medium">竞价调整%</th>
                <th class="py-4 px-4 font-medium">实际CPC</th>
                <th class="py-4 px-4 font-medium">转化率%</th>
                <th class="py-4 px-4 font-medium">预算</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in placements" :key="p" class="border-t border-gray-50 hover:bg-blue-50/30 transition">
                <td class="py-4 px-5 font-medium text-gray-700">{{ placementLabels[p] }}</td>
                <td class="py-4 px-4 text-center">
                  <input v-model.number="left.rows[i].pct" type="number" step="1"
                    class="w-20 border border-gray-200 rounded-md px-3 py-2 text-center text-base focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" />
                </td>
                <td class="py-4 px-4 text-center font-semibold text-blue-600 text-lg">${{ leftResults[i].cpc }}</td>
                <td class="py-4 px-4 text-center">
                  <input v-model.number="left.rows[i].cvr" type="number" step="0.1" min="0"
                    class="w-20 border border-gray-200 rounded-md px-3 py-2 text-center text-base focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" />
                </td>
                <td class="py-4 px-4 text-center text-gray-700">${{ leftResults[i].budget }}</td>
              </tr>
            </tbody>
          </table>
          <div class="bg-blue-50 px-5 py-4 flex justify-between items-center border-t border-blue-100">
            <span class="text-base text-gray-600">广告活动总预算</span>
            <span class="text-xl font-bold text-blue-700">${{ leftTotal }}</span>
          </div>
        </div>

        <p class="mt-4 text-sm text-gray-400">
          实际CPC = 基础CPC × (1 + 调整%) × 策略系数 ｜ 预算 = CPC ÷ 转化率
        </p>
      </div>

      <!-- 右侧：CPC → 百分比 -->
      <div class="bg-white rounded-xl border border-gray-200 p-8">
        <h2 class="text-lg font-bold text-purple-600 mb-6 flex items-center gap-2.5">
          <span class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-base">🔄</span>
          反向计算：CPC → 百分比
        </h2>
        <div class="grid grid-cols-2 gap-5 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">竞价策略</label>
            <select v-model="right.strategy"
              class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base bg-gray-50 focus:bg-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none transition">
              <option v-for="s in strategies" :key="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">基础 CPC ($)</label>
            <input v-model.number="right.baseCpc" type="number" step="0.01" min="0"
              class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base bg-gray-50 focus:bg-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none transition" />
          </div>
        </div>

        <div class="rounded-lg border border-gray-100 overflow-hidden">
          <table class="w-full text-base">
            <thead>
              <tr class="bg-gray-50 text-gray-500 text-sm">
                <th class="text-left py-4 px-5 font-medium">广告位</th>
                <th class="py-4 px-4 font-medium">目标CPC</th>
                <th class="py-4 px-4 font-medium">竞价调整%</th>
                <th class="py-4 px-4 font-medium">转化率%</th>
                <th class="py-4 px-4 font-medium">预算</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in placements" :key="p" class="border-t border-gray-50 hover:bg-purple-50/30 transition">
                <td class="py-4 px-5 font-medium text-gray-700">{{ placementLabels[p] }}</td>
                <td class="py-4 px-4 text-center">
                  <input v-model.number="right.rows[i].targetCpc" type="number" step="0.01"
                    class="w-22 border border-gray-200 rounded-md px-3 py-2 text-center text-base focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none" />
                </td>
                <td class="py-4 px-4 text-center font-semibold text-purple-600 text-lg">{{ rightResults[i].pct }}%</td>
                <td class="py-4 px-4 text-center">
                  <input v-model.number="right.rows[i].cvr" type="number" step="0.1" min="0"
                    class="w-20 border border-gray-200 rounded-md px-3 py-2 text-center text-base focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none" />
                </td>
                <td class="py-4 px-4 text-center text-gray-700">${{ rightResults[i].budget }}</td>
              </tr>
            </tbody>
          </table>
          <div class="bg-purple-50 px-5 py-4 flex justify-between items-center border-t border-purple-100">
            <span class="text-base text-gray-600">广告活动总预算</span>
            <span class="text-xl font-bold text-purple-700">${{ rightTotal }}</span>
          </div>
        </div>

        <p class="mt-4 text-sm text-gray-400">
          竞价调整% = (目标CPC ÷ 基础CPC ÷ 策略系数) - 1 ｜ 预算 = CPC ÷ 转化率
        </p>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="mt-8 bg-white rounded-xl border border-gray-200 p-8">
      <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>📖</span> 使用说明
      </h2>
      <ul class="text-base text-gray-600 list-disc list-inside space-y-2">
        <li><b>左侧（正向）</b>：输入基础CPC和各广告位的竞价调整百分比，自动算出实际CPC和预算</li>
        <li><b>右侧（反向）</b>：输入目标CPC，自动反算出需要设置的竞价调整百分比</li>
        <li>「动态竞价-提高和降低」策略下，TOS 最高提价100%（×2），PP/ROS 最高提价50%（×1.5）</li>
        <li>预算 = 实际CPC ÷ 转化率，总预算 = 三个广告位预算之和</li>
      </ul>
    </div>
  </div>
</template>
