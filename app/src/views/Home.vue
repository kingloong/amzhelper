<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 mb-4">欢迎使用 Amzhelper 跨境帮手 🚀</h1>
    <p class="text-gray-600 mb-8">一站式亚马逊运营工具平台，助力卖家高效运营。</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <router-link to="/tools/bid-calculator"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">🔹</div>
        <h2 class="font-semibold text-lg mb-1">广告位竞价计算</h2>
        <p class="text-sm text-gray-500">根据目标 ACOS 和转化率，快速计算合理竞价。</p>
      </router-link>
      <router-link to="/tools/review-calculator"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">⭐</div>
        <h2 class="font-semibold text-lg mb-1">评论计算器</h2>
        <p class="text-sm text-gray-500">计算达到目标评分所需的 5 星评论数量，并评估测评成本与回本周期。</p>
      </router-link>
      <router-link to="/tools/storage-capacity-calculator"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">📦</div>
        <h2 class="font-semibold text-lg mb-1">库容申请计算器</h2>
        <p class="text-sm text-gray-500">快速评估 FBA 库容竞价费用，并同步查看目标销量参考。</p>
      </router-link>
      <router-link to="/tools/fba-label"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">🔸</div>
        <h2 class="font-semibold text-lg mb-1">FBA标签处理器</h2>
        <p class="text-sm text-gray-500">快速处理 FBA 商品标签，支持批量生成与打印。</p>
      </router-link>
      <router-link to="/tools/unit-converter"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">📐</div>
        <h2 class="font-semibold text-lg mb-1">单位换算</h2>
        <p class="text-sm text-gray-500">长度、重量、温度、体积及包装箱尺寸换算。</p>
      </router-link>
      <router-link to="/tools/word-frequency"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">📊</div>
        <h2 class="font-semibold text-lg mb-1">词频统计工具</h2>
        <p class="text-sm text-gray-500">分析 Listing 关键词词频，支持停用词过滤与词组统计。</p>
      </router-link>
      <router-link to="/tools/text-case-converter"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">🔤</div>
        <h2 class="font-semibold text-lg mb-1">英文大小写转换</h2>
        <p class="text-sm text-gray-500">针对纯英文文本执行首字母大写、全大写和全小写转换。</p>
      </router-link>
      <router-link to="/tools/sensitive-word-checker"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">🛡️</div>
        <h2 class="font-semibold text-lg mb-1">敏感词检查</h2>
        <p class="text-sm text-gray-500">比对文案与敏感词列表，高亮命中的词条和文案片段。</p>
      </router-link>
      <router-link to="/tools/invoice"
        class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100">
        <div class="text-2xl mb-2">🧾</div>
        <h2 class="font-semibold text-lg mb-1">订单形式发票</h2>
        <p class="text-sm text-gray-500">生成亚马逊订单的PDF发票，支持多语言。</p>
      </router-link>
      <div class="block p-6 bg-white rounded-lg shadow border border-gray-100 opacity-50 cursor-not-allowed">
        <div class="text-2xl mb-2">💹</div>
        <h2 class="font-semibold text-lg mb-1">利润计算器</h2>
        <p class="text-sm text-gray-500">即将上线，敬请期待。</p>
      </div>
    </div>
  </div>
</template>
