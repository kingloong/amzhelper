<script setup>
import { reactive } from 'vue'

const len = reactive({ cm: '', inch: '', m: '', ft: '' })
const lenRates = { cm: 1, inch: 2.54, m: 100, ft: 30.48 }
let lenLock = false
function onLen(key) {
  if (lenLock) return; lenLock = true
  const base = parseFloat(len[key])
  if (isNaN(base) || len[key] === '') { Object.keys(len).forEach(k => { if (k !== key) len[k] = '' }) }
  else { const cm = base * lenRates[key]; Object.keys(len).forEach(k => { if (k !== key) len[k] = +(cm / lenRates[k]).toFixed(6) }) }
  lenLock = false
}
function resetLen() { Object.keys(len).forEach(k => len[k] = '') }

const wt = reactive({ g: '', kg: '', lb: '', oz: '' })
const wtRates = { g: 1, kg: 1000, lb: 453.592, oz: 28.3495 }
let wtLock = false
function onWt(key) {
  if (wtLock) return; wtLock = true
  const base = parseFloat(wt[key])
  if (isNaN(base) || wt[key] === '') { Object.keys(wt).forEach(k => { if (k !== key) wt[k] = '' }) }
  else { const g = base * wtRates[key]; Object.keys(wt).forEach(k => { if (k !== key) wt[k] = +(g / wtRates[k]).toFixed(6) }) }
  wtLock = false
}
function resetWt() { Object.keys(wt).forEach(k => wt[k] = '') }

const temp = reactive({ c: '', f: '' })
let tempLock = false
function onTempC() { if (tempLock) return; tempLock = true; temp.f = temp.c === '' ? '' : +(parseFloat(temp.c) * 9 / 5 + 32).toFixed(4); tempLock = false }
function onTempF() { if (tempLock) return; tempLock = true; temp.c = temp.f === '' ? '' : +((parseFloat(temp.f) - 32) * 5 / 9).toFixed(4); tempLock = false }
function resetTemp() { temp.c = ''; temp.f = '' }

const vol = reactive({ lcm: '', wcm: '', hcm: '', linch: '', winch: '', hinch: '' })
function volM3cm() { const v = parseFloat(vol.lcm) * parseFloat(vol.wcm) * parseFloat(vol.hcm); return isNaN(v) ? '—' : +(v / 1e6).toFixed(6) }
function volFt3cm() { const v = parseFloat(vol.lcm) * parseFloat(vol.wcm) * parseFloat(vol.hcm); return isNaN(v) ? '—' : +(v / 28316.8).toFixed(6) }
function volM3inch() { const v = parseFloat(vol.linch) * parseFloat(vol.winch) * parseFloat(vol.hinch); return isNaN(v) ? '—' : +(v * 0.0000163871).toFixed(6) }
function volFt3inch() { const v = parseFloat(vol.linch) * parseFloat(vol.winch) * parseFloat(vol.hinch); return isNaN(v) ? '—' : +(v / 1728).toFixed(6) }
function resetVol() { Object.keys(vol).forEach(k => vol[k] = '') }

const box = reactive({ lcm: '', wcm: '', hcm: '', kg: '', linch: '', winch: '', hinch: '', lb: '' })
let boxLock = false
function onBoxCm() {
  if (boxLock) return; boxLock = true
  const c = v => isNaN(parseFloat(v)) ? '' : +(parseFloat(v) / 2.54).toFixed(4)
  box.linch = c(box.lcm); box.winch = c(box.wcm); box.hinch = c(box.hcm)
  box.lb = box.kg === '' ? '' : +(parseFloat(box.kg) * 2.20462).toFixed(4)
  boxLock = false
}
function onBoxInch() {
  if (boxLock) return; boxLock = true
  const c = v => isNaN(parseFloat(v)) ? '' : +(parseFloat(v) * 2.54).toFixed(4)
  box.lcm = c(box.linch); box.wcm = c(box.winch); box.hcm = c(box.hinch)
  box.kg = box.lb === '' ? '' : +(parseFloat(box.lb) / 2.20462).toFixed(4)
  boxLock = false
}
function resetBox() { Object.keys(box).forEach(k => box[k] = '') }

const pasteText = reactive({ text: '' })
function parsePaste() {
  const t = pasteText.text
  const dims = [...t.matchAll(/(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)/g)]
  const isInch = /inch|in\b|"/i.test(t)
  if (dims.length) {
    const [, l, w, h] = dims[0]
    if (isInch) { box.linch = l; box.winch = w; box.hinch = h; onBoxInch() }
    else { box.lcm = l; box.wcm = w; box.hcm = h; onBoxCm() }
  }
  const kgM = t.match(/(\d+\.?\d*)\s*kg/i)
  const lbM = t.match(/(\d+\.?\d*)\s*lbs?/i)
  if (kgM) { box.kg = kgM[1]; onBoxCm() }
  if (lbM) { box.lb = lbM[1]; if (isInch) onBoxInch(); else onBoxCm() }
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300'
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold text-gray-800">单位换算</h1>

    <!-- 长度 + 重量 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-700">📏 长度</h2>
          <button @click="resetLen" class="text-sm text-red-400 hover:text-red-600">重置</button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="[k, label] in [['cm','厘米 cm'],['inch','英寸 inch'],['m','米 m'],['ft','英尺 ft']]" :key="k">
            <label class="block text-sm text-gray-500 mb-1">{{ label }}</label>
            <input v-model="len[k]" @input="onLen(k)" type="number" :class="inp" placeholder="0" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-700">⚖️ 重量</h2>
          <button @click="resetWt" class="text-sm text-red-400 hover:text-red-600">重置</button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="[k, label] in [['g','克 g'],['kg','公斤 kg'],['lb','磅 lb'],['oz','盎司 oz']]" :key="k">
            <label class="block text-sm text-gray-500 mb-1">{{ label }}</label>
            <input v-model="wt[k]" @input="onWt(k)" type="number" :class="inp" placeholder="0" />
          </div>
        </div>
      </div>
    </div>

    <!-- 体积（上下结构，结果在右侧） -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-700">📦 体积</h2>
        <button @click="resetVol" class="text-sm text-red-400 hover:text-red-600">重置</button>
      </div>
      <div class="space-y-4">
        <!-- cm 行 -->
        <div class="flex items-end gap-3">
          <div class="w-28 shrink-0 text-sm text-gray-500 pb-2.5">长×宽×高 (cm)</div>
          <div class="flex gap-2">
            <div><label class="block text-xs text-gray-400 mb-1">长</label><input v-model="vol.lcm" type="number" class="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0" /></div>
            <div><label class="block text-xs text-gray-400 mb-1">宽</label><input v-model="vol.wcm" type="number" class="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0" /></div>
            <div><label class="block text-xs text-gray-400 mb-1">高</label><input v-model="vol.hcm" type="number" class="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0" /></div>
          </div>
          <div class="flex gap-3 shrink-0">
            <div><div class="text-xs text-gray-500 mb-1">立方米 m³</div><div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 w-32 text-center text-xl font-bold text-blue-600">{{ volM3cm() }}</div></div>
            <div><div class="text-xs text-gray-500 mb-1">立方英尺 ft³</div><div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 w-32 text-center text-xl font-bold text-blue-600">{{ volFt3cm() }}</div></div>
          </div>
        </div>
        <div class="border-t border-dashed border-gray-200"></div>
        <!-- inch 行 -->
        <div class="flex items-end gap-3">
          <div class="w-28 shrink-0 text-sm text-gray-500 pb-2.5">长×宽×高 (inch)</div>
          <div class="flex gap-2">
            <div><label class="block text-xs text-gray-400 mb-1">长</label><input v-model="vol.linch" type="number" class="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0" /></div>
            <div><label class="block text-xs text-gray-400 mb-1">宽</label><input v-model="vol.winch" type="number" class="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0" /></div>
            <div><label class="block text-xs text-gray-400 mb-1">高</label><input v-model="vol.hinch" type="number" class="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0" /></div>
          </div>
          <div class="flex gap-3 shrink-0">
            <div><div class="text-xs text-gray-500 mb-1">立方米 m³</div><div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 w-32 text-center text-xl font-bold text-blue-600">{{ volM3inch() }}</div></div>
            <div><div class="text-xs text-gray-500 mb-1">立方英尺 ft³</div><div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 w-32 text-center text-xl font-bold text-blue-600">{{ volFt3inch() }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 温度 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-700">🌡️ 温度</h2>
        <button @click="resetTemp" class="text-sm text-red-400 hover:text-red-600">重置</button>
      </div>
      <div class="grid grid-cols-2 gap-4 max-w-md">
        <div><label class="block text-sm text-gray-500 mb-1">摄氏度 ℃</label><input v-model="temp.c" @input="onTempC" type="number" :class="inp" placeholder="0" /></div>
        <div><label class="block text-sm text-gray-500 mb-1">华氏度 ℉</label><input v-model="temp.f" @input="onTempF" type="number" :class="inp" placeholder="0" /></div>
      </div>
    </div>

    <!-- 包装箱/产品盒换算 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-semibold text-gray-700">🗃️ 包装箱 / 产品盒换算</h2>
        <button @click="resetBox" class="text-sm text-red-400 hover:text-red-600">重置</button>
      </div>
      <div class="space-y-4">
        <div>
          <p class="text-sm font-medium text-gray-500 mb-3">厘米 / 公斤</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label class="block text-sm text-gray-500 mb-1">长 cm</label><input v-model="box.lcm" @input="onBoxCm" type="number" :class="inp" placeholder="0" /></div>
            <div><label class="block text-sm text-gray-500 mb-1">宽 cm</label><input v-model="box.wcm" @input="onBoxCm" type="number" :class="inp" placeholder="0" /></div>
            <div><label class="block text-sm text-gray-500 mb-1">高 cm</label><input v-model="box.hcm" @input="onBoxCm" type="number" :class="inp" placeholder="0" /></div>
            <div><label class="block text-sm text-gray-500 mb-1">重量 kg</label><input v-model="box.kg" @input="onBoxCm" type="number" :class="inp" placeholder="0" /></div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1 border-t border-dashed border-gray-200"></div>
          <span class="text-gray-400 text-sm">⇅ 双向换算</span>
          <div class="flex-1 border-t border-dashed border-gray-200"></div>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-500 mb-3">英寸 / 磅</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label class="block text-sm text-gray-500 mb-1">长 inch</label><input v-model="box.linch" @input="onBoxInch" type="number" :class="inp" placeholder="0" /></div>
            <div><label class="block text-sm text-gray-500 mb-1">宽 inch</label><input v-model="box.winch" @input="onBoxInch" type="number" :class="inp" placeholder="0" /></div>
            <div><label class="block text-sm text-gray-500 mb-1">高 inch</label><input v-model="box.hinch" @input="onBoxInch" type="number" :class="inp" placeholder="0" /></div>
            <div><label class="block text-sm text-gray-500 mb-1">重量 lb</label><input v-model="box.lb" @input="onBoxInch" type="number" :class="inp" placeholder="0" /></div>
          </div>
        </div>
        <div class="border-t border-gray-100 pt-4">
          <p class="text-sm text-gray-500 mb-2">📋 粘贴文本自动识别（支持 长×宽×高 格式，含 cm/inch/kg/lb）</p>
          <div class="flex gap-3">
            <textarea v-model="pasteText.text" rows="3" class="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="粘贴产品或包装箱尺寸信息..."></textarea>
            <button @click="parsePaste" class="bg-blue-500 text-white px-6 rounded-lg text-base font-medium hover:bg-blue-600 transition">识别</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
