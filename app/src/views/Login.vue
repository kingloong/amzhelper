<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authStatus, checkDevice, registerDevice } from '../auth'

const router = useRouter()
const code = ref('')
const deviceName = ref('')
const error = ref('')
const loading = ref(false)
let pollTimer = null

onMounted(async () => {
  const status = await checkDevice()
  if (status === 'approved') {
    router.push('/')
  } else if (status === 'pending') {
    startPolling()
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function startPolling() {
  pollTimer = setInterval(async () => {
    const status = await checkDevice()
    if (status === 'approved') {
      clearInterval(pollTimer)
      router.push('/')
    }
  }, 3000)
}

async function handleSubmit() {
  error.value = ''
  if (!code.value.trim()) {
    error.value = '请输入访问码'
    return
  }
  loading.value = true
  const result = await registerDevice(code.value.trim(), deviceName.value.trim() || undefined)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }

  if (result.status === 'approved') {
    router.push('/')
  } else {
    startPolling()
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-6">
          <div class="text-4xl mb-3">🚀</div>
          <h1 class="text-2xl font-bold text-gray-800">Amzhelper 跨境帮手</h1>
          <p class="text-sm text-gray-500 mt-1">内部工具平台，请输入公司访问码</p>
        </div>

        <!-- 等待审批状态 -->
        <div v-if="authStatus === 'pending'" class="text-center py-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full mb-4">
            <span class="text-3xl">⏳</span>
          </div>
          <h2 class="text-lg font-semibold text-gray-800 mb-2">等待管理员审批</h2>
          <p class="text-sm text-gray-500">你的设备已登记，管理员审批通过后将自动进入系统。</p>
          <div class="mt-4 flex items-center justify-center gap-2 text-sm text-blue-500">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            正在等待审批...
          </div>
        </div>

        <!-- 输入访问码 -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <input
              v-model="deviceName"
              type="text"
              placeholder="你的名字（方便管理员识别）"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            />
          </div>
          <div>
            <input
              v-model="code"
              type="password"
              placeholder="请输入公司访问码"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
              autofocus
            />
          </div>
          <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {{ loading ? '提交中...' : '申请使用' }}
          </button>
        </form>

        <p class="text-xs text-gray-400 text-center mt-6">仅限公司内部使用，访问码请联系管理员</p>
      </div>
    </div>
  </div>
</template>
