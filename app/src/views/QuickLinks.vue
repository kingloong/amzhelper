<script setup>
import { ref, onMounted } from 'vue'

const links = [
  {
    name: '美国商标网（USPTO）',
    description: '美国专利商标局，查询和注册美国商标。',
    url: 'https://www.uspto.gov/trademarks',
    favicon: 'https://www.google.com/s2/favicons?domain=uspto.gov&sz=64',
  },
  {
    name: '美国版权网（Copyright.gov）',
    description: '美国版权局，查询和注册版权信息。',
    url: 'https://www.copyright.gov/',
    favicon: 'https://www.google.com/s2/favicons?domain=copyright.gov&sz=64',
  },
  {
    name: '海关编码查询',
    description: 'HS 编码在线查询，支持中英文搜索海关编码。',
    url: 'https://www.hsbianma.com/',
    favicon: 'https://www.google.com/s2/favicons?domain=hsbianma.com&sz=64',
  },
  {
    name: '17TRACK 物流查询',
    description: '全球物流单号查询平台，支持数百家快递和邮政。',
    url: 'https://www.17track.net/zh-cn',
    favicon: 'https://www.google.com/s2/favicons?domain=17track.net&sz=64',
  },
]

function getFaviconFromUrl(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}

const faviconErrors = ref({})

function onFaviconError(index) {
  faviconErrors.value[index] = true
}

function getInitial(name) {
  return name.charAt(0)
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-800 mb-2">常用工具跳转</h1>
    <p class="text-gray-500 mb-6">精选跨境电商常用外部工具网站，点击即可快速跳转。</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <a
        v-for="(link, index) in links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-4 p-5 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100 group"
      >
        <!-- Favicon / Fallback -->
        <div class="shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden">
          <img
            v-if="!faviconErrors[index]"
            :src="link.favicon"
            :alt="link.name"
            class="w-8 h-8 object-contain"
            @error="onFaviconError(index)"
          />
          <span v-else class="text-xl font-bold text-blue-500">{{ getInitial(link.name) }}</span>
        </div>

        <!-- Text -->
        <div class="flex-1 min-w-0">
          <h2 class="font-semibold text-base text-gray-800 group-hover:text-blue-600 transition flex items-center gap-1">
            {{ link.name }}
            <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </h2>
          <p class="text-sm text-gray-500 truncate">{{ link.description }}</p>
        </div>
      </a>
    </div>
  </div>
</template>
