<script setup>
import { reactive } from 'vue'
import {
  capitalizeWords,
  toLowercase,
  toUppercase,
  validateEnglishText,
} from '../utils/textCaseConverter'

const modules = reactive([
  {
    key: 'capitalize',
    title: '首字母大写',
    subtitle: 'Capitalize First Letter',
    description: '将每个单词的首字母转为大写，其余字母转为小写。',
    buttonLabel: '执行首字母大写转换',
    copyLabel: '复制首字母大写结果',
    input: '',
    output: '',
    accentClass: 'text-blue-600',
    panelClass: 'border-blue-100 bg-blue-50/70',
    actionClass: 'bg-blue-600 hover:bg-blue-700',
    transform: capitalizeWords,
  },
  {
    key: 'uppercase',
    title: '全部大写',
    subtitle: 'Uppercase',
    description: '将文本中的所有英文字母统一转换为大写。',
    buttonLabel: '执行全部大写转换',
    copyLabel: '复制全部大写结果',
    input: '',
    output: '',
    accentClass: 'text-emerald-600',
    panelClass: 'border-emerald-100 bg-emerald-50/70',
    actionClass: 'bg-emerald-600 hover:bg-emerald-700',
    transform: toUppercase,
  },
  {
    key: 'lowercase',
    title: '全部小写',
    subtitle: 'Lowercase',
    description: '将文本中的所有英文字母统一转换为小写。',
    buttonLabel: '执行全部小写转换',
    copyLabel: '复制全部小写结果',
    input: '',
    output: '',
    accentClass: 'text-amber-600',
    panelClass: 'border-amber-100 bg-amber-50/80',
    actionClass: 'bg-amber-500 hover:bg-amber-600',
    transform: toLowercase,
  },
])

function convertText(module) {
  const validation = validateEnglishText(module.input)

  if (!validation.valid) {
    alert(validation.message)
    return
  }

  module.output = module.transform(module.input)
}

async function copyText(module) {
  if (!module.output) {
    alert('请先完成转换')
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(module.output)
      alert('复制成功')
      return
    }
  } catch {
    // Fall back to execCommand when clipboard API is unavailable or blocked.
  }

  const textarea = document.createElement('textarea')
  textarea.value = module.output
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    alert('复制失败，请手动复制')
    return
  }

  alert('复制成功')
}
</script>

<template>
  <div class="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-6">
    <nav class="text-base text-gray-400">
      <router-link to="/" class="hover:text-blue-500 transition">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">英文大小写转换</span>
    </nav>

    <div class="space-y-3">
      <div class="space-y-1">
        <h1 class="text-3xl lg:text-4xl font-bold text-gray-800">🔤 英文大小写转换</h1>
        <p class="text-base text-gray-500">Text Case Converter</p>
      </div>
      <p class="text-sm text-gray-500">
        支持英文文本、数字、标点和换行。单个输入框上限 5000 字符，点击按钮后执行转换，非英文字母保持原样。
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
      <section
        v-for="module in modules"
        :key="module.key"
        class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div class="px-6 py-5 border-b border-gray-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold" :class="module.accentClass">{{ module.title }}</h2>
              <p class="text-sm text-gray-400 mt-1">{{ module.subtitle }}</p>
            </div>
          </div>
          <p class="mt-3 text-sm text-gray-500">{{ module.description }}</p>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">输入文本</label>
            <textarea
              v-model="module.input"
              rows="8"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-700 resize-y outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 transition"
              placeholder="请输入英文文本"
            />
          </div>

          <button
            type="button"
            class="w-full rounded-xl px-4 py-3 text-white text-sm font-medium transition"
            :class="module.actionClass"
            @click="convertText(module)"
          >
            {{ module.buttonLabel }}
          </button>

          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">输出文本</label>
            <div class="rounded-xl border px-4 py-3" :class="module.panelClass">
              <textarea
                :value="module.output"
                rows="8"
                readonly
                class="w-full bg-transparent text-base text-gray-700 resize-y outline-none"
                placeholder="转换结果会显示在这里"
              />
            </div>
          </div>

          <button
            type="button"
            class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            @click="copyText(module)"
          >
            {{ module.copyLabel }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
