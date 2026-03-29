<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  analyzeText,
  DISPLAY_COUNTS,
  downloadAnalysisCsv,
  PHRASE_OPTIONS,
} from '../utils/wordFrequency'

const text = ref('')
const debouncedText = ref('')
const caseSensitive = ref(false)
const excludeStopWords = ref(true)
const displayCount = ref(10)
const phraseSize = ref(1)

let debounceTimer = null

function syncLatestText() {
  clearTimeout(debounceTimer)
  debouncedText.value = text.value
}

watch(text, value => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedText.value = value
  }, 300)
})

watch([caseSensitive, excludeStopWords, displayCount, phraseSize], () => {
  if (text.value !== debouncedText.value) {
    syncLatestText()
  }
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
})

const analysis = computed(() =>
  analyzeText(debouncedText.value, {
    caseSensitive: caseSensitive.value,
    excludeStopWords: excludeStopWords.value,
    phraseSize: phraseSize.value,
    topN: displayCount.value,
  }),
)

const summaryCards = computed(() => [
  { label: '当前字符数', value: analysis.value.summary.characterCount },
  { label: '当前单词数', value: analysis.value.summary.wordCount },
  { label: '当前句子数', value: analysis.value.summary.sentenceCount },
])

const hasPendingUpdate = computed(() => text.value !== debouncedText.value)
const canExport = computed(() => analysis.value.hasContent)
const resultsTitle = computed(() =>
  analysis.value.settings.phraseSize === 1 ? '单词出现次数统计' : '词组出现次数统计',
)

function clearText() {
  text.value = ''
  syncLatestText()
}

function exportCsv() {
  if (!canExport.value) {
    return
  }

  if (text.value !== debouncedText.value) {
    syncLatestText()
  }

  downloadAnalysisCsv(analysis.value)
}
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-6">
    <nav class="text-base text-gray-400">
      <router-link to="/" class="hover:text-blue-500 transition">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">词频统计工具</span>
    </nav>

    <div class="space-y-2">
      <h1 class="text-3xl lg:text-4xl font-bold text-gray-800">📊 词频统计工具</h1>
      <p class="text-base text-gray-500">
        面向 Amazon Listing 文本分析，支持词频统计、停用词过滤、双词组和三词组组合统计。
      </p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] gap-6 items-start">
      <section class="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-bold text-blue-600">文本输入区域</h2>
            <p class="text-sm text-gray-500 mt-1">支持直接粘贴 Listing 内容，输入后自动统计。</p>
          </div>
          <button
            type="button"
            class="shrink-0 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition"
            @click="clearText"
          >
            一键清空
          </button>
        </div>

        <textarea
          v-model="text"
          rows="18"
          placeholder="请输入文本"
          class="w-full min-h-[400px] rounded-2xl border-2 border-blue-200 bg-blue-50/30 px-5 py-4 text-base text-gray-700 resize-y outline-none focus:border-blue-500 focus:bg-white transition"
        />

        <div class="mt-3 flex items-center justify-between gap-3 text-sm">
          <p class="text-gray-400">支持多行粘贴，按 300ms 防抖更新统计。</p>
          <p v-if="hasPendingUpdate" class="text-blue-500 font-medium">正在根据最新输入更新统计...</p>
        </div>
      </section>

      <section class="space-y-5">
        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📈</span>
            <span>字符统计信息</span>
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            <div
              v-for="card in summaryCards"
              :key="card.label"
              class="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-4"
            >
              <p class="text-sm text-gray-500">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-bold text-blue-700">{{ card.value }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div>
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>⚙️</span>
              <span>设置选项</span>
            </h2>
            <div class="space-y-3">
              <label class="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                <input
                  v-model="caseSensitive"
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                区分大小写
              </label>
              <label class="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                <input
                  v-model="excludeStopWords"
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                排除语法词
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-2">显示数量</label>
              <select
                v-model.number="displayCount"
                class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-base text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              >
                <option v-for="count in DISPLAY_COUNTS" :key="count" :value="count">
                  前 {{ count }} 个
                </option>
              </select>
            </div>
            <div>
              <p class="block text-sm font-medium text-gray-500 mb-2">词组类型</p>
              <div class="space-y-2">
                <label
                  v-for="option in PHRASE_OPTIONS"
                  :key="option.value"
                  class="flex items-center gap-3 text-sm text-gray-600 cursor-pointer"
                >
                  <input
                    v-model.number="phraseSize"
                    type="radio"
                    name="phraseSize"
                    :value="option.value"
                    class="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  >
                  {{ option.label }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>🔝</span>
                <span>{{ resultsTitle }}</span>
              </h2>
              <p class="mt-2 text-sm text-gray-500">
                有效项 {{ analysis.totalTerms }}，唯一{{ analysis.termLabel }} {{ analysis.totalUniqueTerms }}
              </p>
            </div>
            <button
              type="button"
              :disabled="!canExport"
              class="shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              @click="exportCsv"
            >
              📥 结果导出
            </button>
          </div>

          <div v-if="analysis.rows.length" class="rounded-xl border border-gray-100 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-4 py-3 text-left font-medium">排名</th>
                  <th class="px-4 py-3 text-left font-medium">{{ analysis.termLabel }}</th>
                  <th class="px-4 py-3 text-right font-medium">次数</th>
                  <th class="px-4 py-3 text-right font-medium">占比</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in analysis.rows"
                  :key="row.term"
                  class="border-t border-gray-100 hover:bg-blue-50/40 transition"
                >
                  <td class="px-4 py-3 text-gray-500">{{ row.rank }}</td>
                  <td class="px-4 py-3 font-medium text-gray-700 break-all">{{ row.term }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">{{ row.count }}</td>
                  <td class="px-4 py-3 text-right text-blue-600 font-medium">{{ row.ratioText }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-5 py-8 text-center text-sm text-gray-500"
          >
            {{ analysis.hasContent ? '当前设置下没有可统计的词条。' : '请输入 Listing 文本后查看统计结果。' }}
          </div>
        </div>
      </section>
    </div>

    <section class="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5">
      <h2 class="text-lg font-bold text-amber-800 mb-3">💡 Amazon 字符限制提示</h2>
      <div class="space-y-2 text-sm text-amber-900">
        <p>Product Title 最多不超过 200 字符。</p>
        <p>Bullet Point 每行最多不超过 500 字符。</p>
        <p>Search Terms 每行最多不超过 250 字符。</p>
      </div>
    </section>
  </div>
</template>
