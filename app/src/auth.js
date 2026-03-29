import { ref } from 'vue'

// 本地开发时用 3002 端口，部署后前后端同源，用空字符串
const API_BASE = window.location.port === '5173'
  ? 'http://' + window.location.hostname + ':3002'
  : ''
const DEVICE_ID_KEY = 'amzhelper_device_id'
const ADMIN_KEY_STORAGE = 'amzhelper_admin_key'

// 获取或生成设备唯一 ID（绑定到这台电脑的浏览器）
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export const deviceId = getDeviceId()
export const authStatus = ref('checking') // checking | unknown | pending | approved

// 检查当前设备是否已授权
export async function checkDevice() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const data = await res.json()
    authStatus.value = data.status // unknown | pending | approved
    return data.status
  } catch {
    authStatus.value = 'unknown'
    return 'unknown'
  }
}

// 用访问码注册设备
export async function registerDevice(code, name) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId, name }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { success: false, error: err.error }
    }
    const data = await res.json()
    authStatus.value = data.status
    return { success: true, status: data.status, message: data.message }
  } catch {
    return { success: false, error: '无法连接服务器' }
  }
}

// 退出登录（清除本机设备ID）
export function logout() {
  localStorage.removeItem(DEVICE_ID_KEY)
  authStatus.value = 'unknown'
}

// ============ 管理员功能 ============

export function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || ''
}

export function setAdminKey(key) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key)
}

export async function verifyAdminKey(key) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    const data = await res.json()
    return data.valid
  } catch {
    return false
  }
}

export async function fetchDevices(adminKey) {
  const res = await fetch(`${API_BASE}/api/admin/devices`, {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error('权限不足')
  return res.json()
}

export async function approveDevice(id, adminKey) {
  const res = await fetch(`${API_BASE}/api/admin/approve/${id}`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  return res.json()
}

export async function removeDevice(id, adminKey) {
  const res = await fetch(`${API_BASE}/api/admin/remove/${id}`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  return res.json()
}
