<script setup>
import { ref } from 'vue'
import { API_BASE } from '../auth.js'

const files = ref([])
const uploading = ref(false)
const error = ref('')
const dragging = ref(false)
const uploadedFiles = ref([])
const copiedIndex = ref(-1)

function setFiles(list) {
  files.value = Array.from(list).filter(f => f.type === 'application/pdf')
  error.value = ''
}

function onFileChange(e) { setFiles(e.target.files) }

function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  if (e.dataTransfer.files.length) setFiles(e.dataTransfer.files)
}

async function upload() {
  if (!files.value.length) return
  uploading.value = true
  error.value = ''
  try {
    const fd = new FormData()
    files.value.forEach(f => fd.append('files', f))
    const res = await fetch(`${API_BASE}/api/pdf-upload`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    uploadedFiles.value = [...data.files, ...uploadedFiles.value]
    files.value = []
  } catch (e) {
    error.value = e.message
  } finally {
    uploading.value = false
  }
}

async function loadFiles() {
  try {
    const res = await fetch(`${API_BASE}/api/pdf-files`)
    const data = await res.json()
    uploadedFiles.value = data.files || []
  } catch {}
}

async function removeFile(filename) {
  try {
    const res = await fetch(`${API_BASE}/api/pdf-files/${encodeURIComponent(filename)}`, { method: 'DELETE' })
    if (res.ok) {
      uploadedFiles.value = uploadedFiles.value.filter(f => f.filename !== filename)
    }
  } catch {}
}

function getFileUrl(filename) {
  const base = window.location.port === '5173'
    ? `http://${window.location.hostname}:3002`
    : window.location.origin
  return `${base}/uploads/${encodeURIComponent(filename)}`
}

async function copyLink(filename, index) {
  try {
    await navigator.clipboard.writeText(getFileUrl(filename))
    copiedIndex.value = index
    setTimeout(() => { copiedIndex.value = -1 }, 2000)
  } catch {}
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('zh-CN')
}

loadFiles()
</script>

<template>
  <div class="p-8 lg:p-12 max-w-[1100px] mx-auto">
    <nav class="text-lg text-gray-400 mb-6">
      <router-link to="/" class="hover:text-blue-500">首页</router-link>
      <span class="mx-2">/</span>
      <span class="text-gray-600">PDF转链接</span>
    </nav>
    <h1 class="text-4xl font-bold text-gray-800 mb-10">📎 PDF转链接</h1>

    <!-- 上传区 -->
    <div class="bg-white rounded-xl border border-gray-200 p-10 mb-8">
      <h2 class="text-xl font-bold text-purple-600 mb-5 flex items-center gap-3">
        <span class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">📤</span>
        上传PDF文件
      </h2>
      <p class="text-base text-gray-500 mb-5">上传PDF文件后自动生成公开访问链接，可直接用于亚马逊后台提交说明书等文件。</p>

      <label
        class="block border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition"
        :class="dragging ? 'border-purple-400 bg-purple-50/30' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop="onDrop"
      >
        <input type="file" accept=".pdf" multiple class="hidden" @change="onFileChange" />
        <div class="text-5xl mb-3">📁</div>
        <p class="text-lg text-gray-600">点击选择PDF文件，或拖拽到此处</p>
        <p class="text-base text-gray-400 mt-1">支持多文件上传，单文件最大 20MB</p>
      </label>

      <div v-if="files.length" class="mt-5">
        <p class="text-base text-gray-600 mb-3">已选择 {{ files.length }} 个文件：</p>
        <ul class="text-base text-gray-500 space-y-2">
          <li v-for="f in files" :key="f.name" class="flex items-center gap-2">
            <span>📎</span> {{ f.name }} <span class="text-gray-400">({{ formatSize(f.size) }})</span>
          </li>
        </ul>
        <button @click="upload" :disabled="uploading"
          class="mt-5 px-8 py-3 bg-purple-500 text-white rounded-lg text-lg font-medium hover:bg-purple-600 disabled:opacity-50 transition">
          {{ uploading ? '上传中...' : '🚀 上传并生成链接' }}
        </button>
      </div>

      <p v-if="error" class="mt-5 text-red-500 text-base">{{ error }}</p>
    </div>

    <!-- 已上传文件列表 -->
    <div v-if="uploadedFiles.length" class="bg-white rounded-xl border border-gray-200 p-10 mb-8">
      <h2 class="text-xl font-bold text-green-600 mb-5 flex items-center gap-3">
        <span class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">🔗</span>
        已生成链接（{{ uploadedFiles.length }} 个文件）
      </h2>
      <div class="space-y-4">
        <div v-for="(f, i) in uploadedFiles" :key="f.filename"
          class="p-5 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-lg font-medium text-gray-700">{{ f.originalName }}</p>
              <p class="text-sm text-gray-400">{{ formatSize(f.size) }} · {{ formatTime(f.uploadedAt) }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button @click="copyLink(f.filename, i)"
                class="px-4 py-2 rounded-lg text-base transition"
                :class="copiedIndex === i ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'">
                {{ copiedIndex === i ? '✅ 已复制' : '📋 复制链接' }}
              </button>
              <a :href="getFileUrl(f.filename)" target="_blank"
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-base hover:bg-gray-300 transition">
                🔗 打开
              </a>
              <button @click="removeFile(f.filename)"
                class="px-4 py-2 bg-red-100 text-red-500 rounded-lg text-base hover:bg-red-200 transition">
                🗑
              </button>
            </div>
          </div>
          <div class="mt-2 p-3 bg-white rounded border border-gray-200 text-sm text-gray-500 break-all select-all cursor-pointer"
            @click="copyLink(f.filename, i)">
            {{ getFileUrl(f.filename) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 说明 -->
    <div class="bg-white rounded-xl border border-gray-200 p-10">
      <h2 class="text-xl font-bold text-gray-800 mb-5">📖 使用说明</h2>
      <div class="text-lg text-gray-600 space-y-3">
        <p><b>用途：</b>将PDF文件上传后生成公开链接，适用于亚马逊后台提交产品说明书、合规文件等场景。</p>
        <p><b>使用步骤：</b></p>
        <ul class="list-disc list-inside ml-4 space-y-1">
          <li>上传PDF文件，系统自动生成访问链接</li>
          <li>点击「复制链接」获取URL</li>
          <li>将链接粘贴到亚马逊后台对应位置</li>
        </ul>
        <p class="text-amber-600"><b>注意：</b>链接需要服务器保持运行才能访问。部署到公网服务器后链接才能被亚马逊访问到。</p>
      </div>
    </div>
  </div>
</template>
