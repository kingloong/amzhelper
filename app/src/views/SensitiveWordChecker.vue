<script setup>
import { computed, ref } from 'vue'
import { SENSITIVE_WORD_TEMPLATES } from '../data/sensitiveWordTemplates'
import {
  analyzeSensitiveTerms,
  parseSensitiveTerms,
  renderHighlightedHtml,
  validateSensitiveCheckerInput,
} from '../utils/sensitiveWordChecker'

function createEmptyAnalysis() {
  return {
    checked: false,
    copyHtml: '',
    termRows: [],
    matchedTermsCount: 0,
    totalTermsCount: 0,
    matchCount: 0,
  }
}

const copyText = ref('')
const termText = ref('')
const analysis = ref(createEmptyAnalysis())

const hasMatches = computed(() => analysis.value.matchCount > 0)

function runCheck() {
  const validation = validateSensitiveCheckerInput(copyText.value, termText.value)

  if (!validation.valid) {
    alert(validation.message)
    return
  }

  const terms = parseSensitiveTerms(termText.value)

  if (!terms.length) {
    alert('请输入敏感词列表或使用通用模板')
    return
  }

  const result = analyzeSensitiveTerms(copyText.value, terms)

  analysis.value = {
    checked: true,
    copyHtml: renderHighlightedHtml(copyText.value, result.matches),
    termRows: terms.map(term => ({
      ...term,
      matched: result.matchedTermIds.has(term.id),
    })),
    matchedTermsCount: result.matchedTermsCount,
    totalTermsCount: result.totalTermsCount,
    matchCount: result.matchCount,
  }
}

function applyTemplate(content) {
  termText.value = content
}
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-6">
    <nav class="text-base text-gray-400">
      <router-link to="/" class="hover:text-blue-500 transition">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">敏感词检查</span>
    </nav>

    <div class="space-y-2">
      <h1 class="text-3xl lg:text-4xl font-bold text-gray-800">🛡️ 敏感词检查</h1>
      <p class="text-base text-gray-500">
        Text Sensitive Word Checker，适用于 Listing、文案和邮件内容的敏感词快速审核。
      </p>
    </div>

    <section class="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm space-y-5">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <div class="flex items-start justify-between mb-3 gap-4">
            <div>
              <span class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                输入区
              </span>
              <label class="block mt-3 text-xl font-bold text-gray-900 tracking-tight">文案内容</label>
              <p class="mt-1 text-sm text-gray-500">粘贴需要审核的 Listing、文案或邮件内容</p>
            </div>
            <span class="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {{ copyText.length }}/5000
            </span>
          </div>
          <textarea
            v-model="copyText"
            rows="12"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-700 resize-y outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 transition"
            placeholder="请输入需要检查的文案内容"
          />
          <p class="mt-2 text-xs text-gray-400">支持英文、数字、标点和中英混合文本，中文内容原样保留。</p>
        </div>

        <div>
          <div class="mb-3">
            <span class="inline-flex items-center rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">
              规则区
            </span>
            <label class="block mt-3 text-xl font-bold text-gray-900 tracking-tight">敏感词列表</label>
            <p class="mt-1 text-sm text-gray-500">支持手动输入，也可以从下方模板一键带入</p>
          </div>
          <textarea
            v-model="termText"
            rows="12"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-700 resize-y outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 transition"
            placeholder="每行输入一个敏感词，或使用逗号分隔"
          />
          <p class="mt-2 text-xs text-gray-400">支持换行、英文逗号、中文逗号分隔，匹配时忽略大小写，按整词或整短语检查。</p>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          type="button"
          class="px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          @click="runCheck"
        >
          开始检查
        </button>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h2 class="text-lg font-bold text-gray-800">文案命中结果</h2>
          <span class="text-sm text-gray-500">命中片段 {{ analysis.matchCount }}</span>
        </div>

        <div
          v-if="analysis.checked"
          class="min-h-[280px] rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-base leading-7 whitespace-pre-wrap break-words"
          v-html="analysis.copyHtml"
        />
        <div
          v-else
          class="min-h-[280px] rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-500"
        >
          点击“开始检查”后，这里会高亮显示文案中命中的敏感词。
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h2 class="text-lg font-bold text-gray-800">敏感词命中结果</h2>
          <span class="text-sm text-gray-500">命中 {{ analysis.matchedTermsCount }}/{{ analysis.totalTermsCount || 0 }}</span>
        </div>

        <div
          v-if="analysis.checked"
          class="min-h-[280px] rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 space-y-2 overflow-auto"
        >
          <div
            v-for="row in analysis.termRows"
            :key="row.id"
            class="rounded-lg px-3 py-2 text-sm break-words border"
            :class="row.matched ? 'bg-yellow-100 border-yellow-200 text-gray-900' : 'bg-white border-gray-200 text-gray-600'"
          >
            {{ row.display }}
          </div>
        </div>
        <div
          v-else
          class="min-h-[280px] rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-500"
        >
          点击“开始检查”后，这里会按输入顺序显示敏感词，并标记出命中的词条。
        </div>
      </div>
    </section>

    <section class="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
      <div class="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 class="text-xl font-bold text-gray-800">通用敏感词模板</h2>
          <p class="text-sm text-gray-500 mt-1">点击按钮可直接覆盖右侧敏感词输入框，后续仍可继续编辑。</p>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700 border border-yellow-200"
        >
          命中词将高亮为黄色
        </span>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div
          v-for="template in SENSITIVE_WORD_TEMPLATES"
          :key="template.id"
          class="rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-800">{{ template.title }}</h3>
                <p class="text-sm text-gray-500 mt-1">{{ template.description }}</p>
              </div>
              <button
                type="button"
                class="shrink-0 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
                @click="applyTemplate(template.content)"
              >
                复制到敏感词框
              </button>
            </div>
          </div>
          <pre class="max-h-72 overflow-auto px-5 py-4 text-sm leading-6 text-gray-600 whitespace-pre-wrap break-words bg-white">{{ template.content }}</pre>
        </div>
      </div>
    </section>

    <section
      v-if="analysis.checked"
      class="rounded-2xl border px-5 py-4"
      :class="hasMatches ? 'border-yellow-200 bg-yellow-50' : 'border-emerald-200 bg-emerald-50'"
    >
      <p class="text-sm font-medium" :class="hasMatches ? 'text-yellow-800' : 'text-emerald-700'">
        {{ hasMatches ? `已检测到 ${analysis.matchCount} 处敏感词命中，请结合高亮结果继续审核。` : '本次检查未发现命中的敏感词。' }}
      </p>
    </section>
  </div>
</template>
