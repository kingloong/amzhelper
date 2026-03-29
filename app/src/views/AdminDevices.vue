<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getAdminKey, setAdminKey, verifyAdminKey, fetchDevices, approveDevice, removeDevice } from '../auth'

const adminKey = ref(getAdminKey())
const loggedIn = ref(false)
const devices = ref([])
const error = ref('')
const loading = ref(false)
let refreshTimer = null

onMounted(async () => {
  if (adminKey.value) {
    const valid = await verifyAdminKey(adminKey.value)
    if (valid) {
      loggedIn.value = true
      await loadDevices()
      startAutoRefresh()
    }
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

function startAutoRefresh() {
  refreshTimer = setInterval(loadDevices, 5000)
}

async function handleLogin() {
  error.value = ''
  const valid = await verifyAdminKey(adminKey.value)
  if (valid) {
    setAdminKey(adminKey.value)
    loggedIn.value = true
    await loadDevices()
    startAutoRefresh()
  } else {
    error.value = '管理员密钥错误'
  }
}

async function loadDevices() {
  try {
    devices.value = await fetchDevices(adminKey.value)
  } catch (e) {
    error.value = e.message
  }
}

async function handleApprove(device) {
  loading.value = true
  await approveDevice(device.id, adminKey.value)
  await loadDevices()
  loading.value = false
}

async function handleRemove(device) {
  if (!confirm(`确定移除设备「${device.name}」？该设备将无法再访问系统。`)) return
  loading.value = true
  await removeDevice(device.id, adminKey.value)
  await loadDevices()
  loading.value = false
}

const pendingDevices = () => devices.value.filter(d => d.status === 'pending')
const approvedDevices = () => devices.value.filter(d => d.status === 'approved')

function formatTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4" v-if="!loggedIn">
    <div class="w-full max-w-sm">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-6">
          <div class="text-4xl mb-3">🔐</div>
          <h1 class="text-xl font-bold text-gray-800">设备管理后台</h1>
          <p class="text-sm text-gray-500 mt-1">请输入管理员密钥</p>
        </div>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <input
            v-model="adminKey"
            type="password"
            placeholder="管理员密钥"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            autofocus
          />
          <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
          <button type="submit" class="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition">
            进入管理
          </button>
        </form>
      </div>
    </div>
  </div>

  <div v-else class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">设备管理</h1>

    <!-- 待审批 -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2">
        ⏳ 待审批设备
        <span v-if="pendingDevices().length" class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
          {{ pendingDevices().length }}
        </span>
      </h2>
      <div v-if="!pendingDevices().length" class="text-gray-400 text-sm py-4">暂无待审批设备</div>
      <div v-else class="space-y-3">
        <div v-for="d in pendingDevices()" :key="d.id"
          class="bg-white rounded-lg border-2 border-yellow-200 p-4 flex items-center justify-between">
          <div>
            <div class="font-semibold text-gray-800">{{ d.name }}</div>
            <div class="text-xs text-gray-400 mt-1">
              申请时间：{{ formatTime(d.createdAt) }} · IP：{{ d.ip }}
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button @click="handleApprove(d)" :disabled="loading"
              class="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition disabled:opacity-50">
              通过
            </button>
            <button @click="handleRemove(d)" :disabled="loading"
              class="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50">
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已授权 -->
    <div>
      <h2 class="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
        ✅ 已授权设备
        <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
          {{ approvedDevices().length }}
        </span>
      </h2>
      <div v-if="!approvedDevices().length" class="text-gray-400 text-sm py-4">暂无已授权设备</div>
      <div v-else class="space-y-3">
        <div v-for="d in approvedDevices()" :key="d.id"
          class="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <div class="font-semibold text-gray-800">{{ d.name }}</div>
            <div class="text-xs text-gray-400 mt-1">
              授权时间：{{ formatTime(d.approvedAt) }} · IP：{{ d.ip }}
            </div>
          </div>
          <button @click="handleRemove(d)" :disabled="loading"
            class="px-4 py-2 border border-red-300 text-red-500 text-sm rounded-lg hover:bg-red-50 transition disabled:opacity-50">
            移除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
