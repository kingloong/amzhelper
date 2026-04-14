<script setup>
import { ref } from 'vue'
import { API_BASE } from '../auth.js'

const files = ref([])
const results = ref([])
const loading = ref(false)
const error = ref('')
const dragging = ref(false)
const typeLabels = { product: '产品标签', box: '外箱标签' }

function setFiles(list) {
  files.value = Array.from(list).filter(f => f.type === 'application/pdf')
  results.value = []
  error.value = ''
}

function onFileChange(e) { setFiles(e.target.files) }

function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  if (e.dataTransfer.files.length) setFiles(e.dataTransfer.files)
}

async function process() {
  if (!files.value.length) return
  loading.value = true
  error.value = ''
  results.value = []
  const fd = new FormData()
  files.value.forEach(f => fd.append('files', f))
  try {
    const res = await fetch(`${API_BASE}/api/process`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    results.value = data.results
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function download(r) {
  const bytes = Uint8Array.from(atob(r.data), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = r.name
  a.click()
  URL.revokeObjectURL(a.href)
}

function downloadAll() { results.value.forEach(download) }
</script>

<template>
  <div class="p-8 lg:p-12 max-w-[1100px] mx-auto">
  <nav class="text-lg text-gray-400 mb-6">
      <router-link to="/" class="hover:text-blue-500">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">FBA标签处理器</span>
    </nav>
    <h1 class="text-4xl font-bold text-gray-800 mb-10">◆ FBA标签处理器</h1>

    <!-- 上传区 -->
    <div class="bg-white rounded-xl border border-gray-200 p-10 mb-8">
      <h2 class="text-xl font-bold text-orange-600 mb-5 flex items-center gap-3">
        <span class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">📄</span>
        上传标签PDF
      </h2>
      <p class="text-base text-gray-500 mb-5">支持产品标签和外箱标签，自动识别类型并处理。可同时上传多个文件。</p>

      <label
        class="block border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition"
        :class="dragging ? 'border-orange-400 bg-orange-50/30' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/30'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop="onDrop"
      >
        <input type="file" accept=".pdf" multiple class="hidden" @change="onFileChange" />
        <div class="text-5xl mb-3">📁</div>
        <p class="text-lg text-gray-600">点击选择PDF文件，或拖拽到此处</p>
        <p class="text-base text-gray-400 mt-1">支持多文件上传</p>
      </label>

      <div v-if="files.length" class="mt-5">
        <p class="text-base text-gray-600 mb-3">已选择 {{ files.length }} 个文件：</p>
        <ul class="text-base text-gray-500 space-y-2">
          <li v-for="f in files" :key="f.name" class="flex items-center gap-2">
            <span>📎</span> {{ f.name }} <span class="text-gray-400">({{ (f.size/1024).toFixed(1) }}KB)</span>
          </li>
        </ul>
        <button @click="process" :disabled="loading"
          class="mt-5 px-8 py-3 bg-orange-500 text-white rounded-lg text-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition">
          {{ loading ? '处理中...' : '🚀 开始处理' }}
        </button>
      </div>

      <p v-if="error" class="mt-5 text-red-500 text-base">❌ {{ error }}</p>
    </div>

    <!-- 结果区 -->
    <div v-if="results.length" class="bg-white rounded-xl border border-gray-200 p-10 mb-8">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xl font-bold text-green-600 flex items-center gap-3">
          <span class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">✅</span>
          处理完成
        </h2>
        <button v-if="results.length > 1" @click="downloadAll"
          class="px-5 py-2.5 bg-green-500 text-white rounded-lg text-base hover:bg-green-600 transition">
          📥 全部下载
        </button>
      </div>
      <div class="space-y-4">
        <div v-for="r in results" :key="r.name"
          class="flex items-center justify-between p-5 bg-gray-50 rounded-lg">
          <div>
            <p class="text-lg font-medium text-gray-700">{{ r.name }}</p>
            <p class="text-base text-gray-400">类型：{{ typeLabels[r.type] || r.type }}</p>
          </div>
          <button @click="download(r)"
            class="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-base hover:bg-blue-600 transition">
            📥 下载
          </button>
        </div>
      </div>
    </div>

    <!-- 说明 -->
    <div class="bg-white rounded-xl border border-gray-200 p-10">
      <h2 class="text-xl font-bold text-gray-800 mb-5">📖 处理说明</h2>
      <div class="text-lg text-gray-600 space-y-3">
        <p><b>产品标签：</b>在每个标签的"新品/New"右侧添加 Made in China</p>
        <p><b>外箱标签：</b></p>
        <ul class="list-disc list-inside ml-4 space-y-1">
          <li>在 Single SKU 左侧居中位置添加 Made in China</li>
          <li>删除目的地下方的 FBA:XXX 公司名称信息</li>
        </ul>
      </div>
    </div>
  </div>
</template>
