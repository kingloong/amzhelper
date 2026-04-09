import { createRouter, createWebHistory } from 'vue-router'
import { authStatus, checkDevice } from '../auth'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import AdminDevices from '../views/AdminDevices.vue'
import BidCalculator from '../views/BidCalculator.vue'
import ReviewCalculator from '../views/ReviewCalculator.vue'
import StorageCapacityCalculator from '../views/StorageCapacityCalculator.vue'
import FbaLabel from '../views/FbaLabel.vue'
import About from '../views/About.vue'
import UnitConverter from '../views/UnitConverter.vue'
import WordFrequency from '../views/WordFrequency.vue'
import TextCaseConverter from '../views/TextCaseConverter.vue'
import SensitiveWordChecker from '../views/SensitiveWordChecker.vue'
import BulkAdUpload from '../views/BulkAdUpload.vue'
import QuickLinks from '../views/QuickLinks.vue'
import PdfToLink from '../views/PdfToLink.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login, meta: { public: true } },
    { path: '/admin', component: AdminDevices, meta: { public: true } },
    { path: '/', component: Home },
    { path: '/tools/bid-calculator', component: BidCalculator },
    { path: '/tools/review-calculator', component: ReviewCalculator },
    { path: '/tools/storage-capacity-calculator', component: StorageCapacityCalculator },
    { path: '/tools/fba-label', component: FbaLabel },
    { path: '/tools/unit-converter', component: UnitConverter },
    { path: '/tools/word-frequency', component: WordFrequency },
    { path: '/tools/text-case-converter', component: TextCaseConverter },
    { path: '/tools/sensitive-word-checker', component: SensitiveWordChecker },
    { path: '/tools/bulk-ad-upload', component: BulkAdUpload },
    { path: '/tools/quick-links', component: QuickLinks },
    { path: '/tools/pdf-to-link', component: PdfToLink },
    { path: '/about', component: About },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) return

  // 每次导航都向服务器验证设备状态
  const status = await checkDevice()
  if (status !== 'approved') {
    return '/login'
  }
})

export default router
