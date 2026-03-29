<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logout } from './auth'

const route = useRoute()
const router = useRouter()
const isPublicPage = computed(() => route.path === '/login' || route.path === '/admin')

function handleLogout() {
  logout()
  router.push('/login')
}
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const toolsExpanded = ref(true)

const tools = [
  { name: '广告位竞价计算', path: '/tools/bid-calculator', icon: '🔹', active: true },
  { name: '评论计算器', path: '/tools/review-calculator', icon: '⭐', active: true },
  { name: '库容申请计算器', path: '/tools/storage-capacity-calculator', icon: '📦', active: true },
  { name: 'FBA标签处理器', path: '/tools/fba-label', icon: '🔸', active: true },
  { name: '单位换算', path: '/tools/unit-converter', icon: '📐', active: true },
  { name: '词频统计工具', path: '/tools/word-frequency', icon: '📊', active: true },
  { name: '英文大小写转换', path: '/tools/text-case-converter', icon: '🔤', active: true },
  { name: '敏感词检查', path: '/tools/sensitive-word-checker', icon: '🛡️', active: true },
  { name: '批量广告上传', path: '/tools/bulk-ad-upload', icon: '📢', active: true },
  { name: '常用工具跳转', path: '/tools/quick-links', icon: '🔗', active: true },
  { name: '利润计算器', path: '', icon: '💹', active: false },
]
</script>

<template>
  <!-- 登录页/管理页：不显示导航和侧边栏 -->
  <router-view v-if="isPublicPage" />

  <!-- 已登录：显示完整布局 -->
  <template v-else>
    <!-- 顶部导航栏 -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-14 flex items-center px-4">
      <button class="md:hidden mr-3 text-xl" @click="sidebarOpen = !sidebarOpen">☰</button>
      <button class="hidden md:block mr-3 text-xl text-gray-500 hover:text-blue-600" @click="sidebarCollapsed = !sidebarCollapsed">☰</button>
      <router-link to="/" class="flex items-center gap-2 font-bold text-lg text-blue-600 shrink-0">
        🚀 Amzhelper 跨境帮手
      </router-link>
      <nav class="hidden md:flex flex-1 justify-center items-center gap-6 text-base text-gray-600">
        <router-link to="/" class="hover:text-blue-600">首页</router-link>
        <router-link to="/tools/bid-calculator" class="hover:text-blue-600">功能区</router-link>
        <a href="#" class="hover:text-blue-600">提需求</a>
        <router-link to="/about" class="hover:text-blue-600">关于我们</router-link>
      </nav>
      <div class="shrink-0">
        <button
          class="text-sm border border-red-400 text-red-500 px-4 py-1.5 rounded hover:bg-red-50 transition"
          @click="handleLogout"
        >退出</button>
      </div>
    </header>

    <!-- 遮罩 -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/30 z-30 md:hidden" @click="sidebarOpen = false"></div>

    <!-- 左侧边栏 -->
    <aside
      :class="[
        'fixed top-14 left-0 bottom-0 z-40 bg-gray-900 text-gray-300 transition-all duration-200 overflow-y-auto',
        sidebarCollapsed ? 'md:w-0 md:overflow-hidden' : 'md:w-56',
        sidebarOpen ? 'w-56 translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <div class="p-4 w-56">
        <button
          class="flex items-center justify-between w-full text-base font-bold text-white mb-3"
          @click="toolsExpanded = !toolsExpanded"
        >
          <span>🛠 运营工具</span>
          <span class="text-xs">{{ toolsExpanded ? '▼' : '▶' }}</span>
        </button>
        <ul v-show="toolsExpanded" class="space-y-1">
          <li v-for="t in tools" :key="t.name">
            <router-link
              v-if="t.active"
              :to="t.path"
              :class="[
                'block px-3 py-2 rounded text-sm transition',
                route.path === t.path ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'
              ]"
              @click="sidebarOpen = false"
            >
              {{ t.icon }} {{ t.name }}
            </router-link>
            <span v-else class="block px-3 py-2 rounded text-sm text-gray-600 cursor-not-allowed">
              {{ t.icon }} {{ t.name }}
            </span>
          </li>
        </ul>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main :class="['pt-14 min-h-screen bg-gray-50 transition-all duration-200', sidebarCollapsed ? 'md:ml-0' : 'md:ml-56']">
      <router-view />
    </main>
  </template>
</template>
