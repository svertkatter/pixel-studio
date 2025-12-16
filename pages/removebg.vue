<template>
  <div class="container">
    <header class="header">
      <h1 class="logo">
        <NuxtLink to="/" style="text-decoration: none; color: inherit;">🎨 Pixel Studio</NuxtLink>
      </h1>
      <p class="tagline">背景削除ツール</p>
    </header>

    <main class="tool-container">
      <div class="tool-panel">
        <!-- アップロードセクション -->
        <div v-if="currentSection === 'upload'" class="upload-section">
          <div
            class="upload-box"
            :class="{ 'drag-over': isDragging }"
            @click="triggerFileInput"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <div class="upload-icon">📸</div>
            <h2>画像をアップロード</h2>
            <p>クリックまたはドラッグ&ドロップで画像を選択</p>
            <p class="file-types">対応形式: PNG, JPEG, WebP</p>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="handleFileSelect"
            >
          </div>
        </div>

        <!-- 処理中セクション -->
        <div v-if="currentSection === 'processing'" class="processing-section">
          <div class="loader-container">
            <div class="loader"></div>
            <p class="loading-text">背景を削除中...</p>
            <p class="loading-subtext">初回読み込み時はモデルのダウンロードに時間がかかる場合があります</p>
          </div>
        </div>

        <!-- 結果セクション -->
        <div v-if="currentSection === 'result'" class="result-section">
          <div class="image-comparison">
            <div class="image-container">
              <h3>元の画像</h3>
              <div class="image-wrapper">
                <img :src="originalImageUrl" alt="元の画像">
              </div>
            </div>
            <div class="arrow">→</div>
            <div class="image-container">
              <h3>背景削除後</h3>
              <div class="image-wrapper checkered-bg">
                <canvas ref="resultCanvas"></canvas>
              </div>
            </div>
          </div>

          <div class="controls">
            <button class="btn btn-primary" @click="downloadResult">
              <span>💾</span>
              PNG形式でダウンロード
            </button>
            <button class="btn btn-secondary" @click="resetToUpload">
              <span>🔄</span>
              別の画像を処理
            </button>
          </div>
        </div>
      </div>

      <div class="info-panel">
        <div class="info-card">
          <h3>💡 使い方</h3>
          <ol>
            <li>画像をアップロード</li>
            <li>自動で背景が削除されます</li>
            <li>結果をダウンロード</li>
          </ol>
        </div>

        <div class="info-card">
          <h3>✨ 特徴</h3>
          <ul>
            <li><strong>最高精度AI</strong> - @imgly/background-removalで業界最高水準</li>
            <li><strong>自動判定</strong> - 画像を分析して最適な手法を自動選択</li>
            <li><strong>ハイブリッド処理</strong> - 図形は色ベース、人物は最高精度AI</li>
            <li><strong>完全プライバシー保護</strong> - ブラウザ内で処理、画像は外部に送信されません</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>⚠️ 注意事項</h3>
          <ul>
            <li>単色背景の図形：色ベースで高速処理</li>
            <li>複雑な背景の人物：最高精度AIで処理</li>
            <li>初回のAI処理時のみモデルダウンロード（約30MB）</li>
          </ul>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p><NuxtLink to="/" style="color: inherit; text-decoration: none;">← トップページに戻る</NuxtLink></p>
      <p>&copy; 2024 Pixel Studio. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

useHead({
  title: '背景削除 - Pixel Studio',
  meta: [
    { name: 'description', content: '画像から背景を自動で削除するツール' }
  ]
})

const currentSection = ref('upload')
const isDragging = ref(false)
const fileInput = ref(null)
const resultCanvas = ref(null)
const originalImageUrl = ref('')
const currentImageBlob = ref(null)
let removeBackground = null

// @imgly/background-removalをロード
async function loadAIModel() {
  if (!removeBackground) {
    try {
      const module = await import('@imgly/background-removal')
      removeBackground = module.removeBackground

      console.log('AI model loaded successfully')
    } catch (error) {
      console.error('Failed to load AI model:', error)
      throw new Error('AIモデルの読み込みに失敗しました')
    }
  }
  return removeBackground
}

// ファイル選択のトリガー
function triggerFileInput() {
  fileInput.value?.click()
}

// ファイル選択時の処理
function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    processImage(file)
  }
}

// ドロップ時の処理
function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    processImage(file)
  } else {
    alert('画像ファイルをアップロードしてください。')
  }
}

// 画像の複雑さを分析
function analyzeImageComplexity(imageData, width, height) {
  const data = imageData.data
  const bgSamples = []
  const positions = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
  ]

  for (const [x, y] of positions) {
    const idx = (y * width + x) * 4
    bgSamples.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    })
  }

  const avgColor = {
    r: bgSamples.reduce((sum, c) => sum + c.r, 0) / bgSamples.length,
    g: bgSamples.reduce((sum, c) => sum + c.g, 0) / bgSamples.length,
    b: bgSamples.reduce((sum, c) => sum + c.b, 0) / bgSamples.length
  }

  const variance = bgSamples.reduce((sum, c) => {
    return sum +
      Math.pow(c.r - avgColor.r, 2) +
      Math.pow(c.g - avgColor.g, 2) +
      Math.pow(c.b - avgColor.b, 2)
  }, 0) / bgSamples.length

  return {
    isSimpleBackground: variance < 500,
    variance: variance
  }
}

// 画像処理（自動判定）
async function processImage(file) {
  if (file.size > 10 * 1024 * 1024) {
    alert('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。')
    return
  }

  currentSection.value = 'processing'

  try {
    const imageData = await loadImage(file)
    originalImageUrl.value = imageData

    const img = new Image()
    await new Promise((resolve) => {
      img.onload = resolve
      img.src = imageData
    })

    // 画像の複雑さを分析
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = img.width
    tempCanvas.height = img.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.drawImage(img, 0, 0)
    const analysis = analyzeImageComplexity(
      tempCtx.getImageData(0, 0, img.width, img.height),
      img.width,
      img.height
    )

    console.log('Image analysis:', analysis)

    // 背景の複雑さに応じて処理方法を選択
    if (analysis.isSimpleBackground) {
      console.log('Using color-based removal (simple background)')
      await removeBackgroundColorBased(img)
    } else {
      console.log('Using AI-based removal (complex background - @imgly)')
      await removeBackgroundAI(file, img)
    }

    currentSection.value = 'result'

  } catch (error) {
    console.error('Background removal failed:', error)
    alert('背景削除に失敗しました。別の画像で試してください。\nエラー: ' + error.message)
    resetToUpload()
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 色ベースの背景削除（図形用）
async function removeBackgroundColorBased(img) {
  const canvas = resultCanvas.value
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  const bgColor = detectBackgroundColor(imageData, canvas.width, canvas.height)
  const threshold = 40
  const alphaMask = new Uint8ClampedArray(canvas.width * canvas.height)

  for (let i = 0; i < pixels.length / 4; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]
    const color = { r, g, b }
    const distance = colorDistance(color, bgColor)

    if (distance < threshold) {
      alphaMask[i] = Math.round(255 * (distance / threshold))
    } else {
      alphaMask[i] = 255
    }
  }

  // 多段階スムージング
  let smoothedMask = alphaMask
  for (let pass = 0; pass < 3; pass++) {
    smoothedMask = smoothMaskAdvanced(smoothedMask, canvas.width, canvas.height)
  }

  for (let i = 0; i < pixels.length / 4; i++) {
    pixels[i * 4 + 3] = smoothedMask[i]
  }

  ctx.putImageData(imageData, 0, 0)

  canvas.toBlob((blob) => {
    currentImageBlob.value = blob
  }, 'image/png')
}

// AIベースの背景削除（@imgly/background-removal）
async function removeBackgroundAI(file, img) {
  const model = await loadAIModel()

  // @imgly/background-removalで処理
  const blob = await model(file)

  // 結果をCanvasに描画
  const resultImg = new Image()
  await new Promise((resolve) => {
    resultImg.onload = resolve
    resultImg.src = URL.createObjectURL(blob)
  })

  const canvas = resultCanvas.value
  canvas.width = resultImg.width
  canvas.height = resultImg.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(resultImg, 0, 0)

  currentImageBlob.value = blob
}

function detectBackgroundColor(imageData, width, height) {
  const data = imageData.data
  const samples = []

  const positions = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
  ]

  for (const [x, y] of positions) {
    const idx = (y * width + x) * 4
    samples.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    })
  }

  return {
    r: Math.round(samples.reduce((sum, c) => sum + c.r, 0) / samples.length),
    g: Math.round(samples.reduce((sum, c) => sum + c.g, 0) / samples.length),
    b: Math.round(samples.reduce((sum, c) => sum + c.b, 0) / samples.length)
  }
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  )
}

function smoothMaskAdvanced(maskData, width, height) {
  const smoothed = new Uint8ClampedArray(width * height)

  const kernel = [
    [1/273, 4/273, 7/273, 4/273, 1/273],
    [4/273, 16/273, 26/273, 16/273, 4/273],
    [7/273, 26/273, 41/273, 26/273, 7/273],
    [4/273, 16/273, 26/273, 16/273, 4/273],
    [1/273, 4/273, 7/273, 4/273, 1/273]
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0

      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const ny = Math.min(Math.max(y + ky, 0), height - 1)
          const nx = Math.min(Math.max(x + kx, 0), width - 1)
          const idx = ny * width + nx
          sum += maskData[idx] * kernel[ky + 2][kx + 2]
        }
      }

      smoothed[y * width + x] = Math.round(sum)
    }
  }

  return smoothed
}

// ダウンロード
function downloadResult() {
  if (!currentImageBlob.value) {
    resultCanvas.value?.toBlob((blob) => {
      downloadBlob(blob)
    }, 'image/png')
  } else {
    downloadBlob(currentImageBlob.value)
  }
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'removed-background-' + Date.now() + '.png'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function resetToUpload() {
  currentSection.value = 'upload'
  currentImageBlob.value = null
  originalImageUrl.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
/* ツールコンテナ */
.tool-container {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  margin-top: 2rem;
}

.tool-panel {
  background: var(--surface);
  border-radius: 1rem;
  padding: 2rem;
  border: 1px solid var(--surface-light);
  min-height: 600px;
}

/* アップロードセクション */
.upload-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
}

.upload-box {
  text-align: center;
  padding: 3rem;
  border: 3px dashed var(--surface-light);
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 500px;
}

.upload-box:hover {
  border-color: var(--primary-color);
  background: rgba(99, 102, 241, 0.05);
}

.upload-box.drag-over {
  border-color: var(--accent);
  background: rgba(34, 211, 238, 0.1);
  transform: scale(1.02);
}

.upload-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.upload-box h2 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.upload-box p {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.file-types {
  font-size: 0.875rem;
  opacity: 0.7;
}

/* 処理中セクション */
.processing-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
}

.loader-container {
  text-align: center;
}

.loader {
  width: 80px;
  height: 80px;
  border: 8px solid var(--surface-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.loading-subtext {
  font-size: 0.875rem;
  color: var(--text-secondary);
  max-width: 400px;
  margin: 0 auto;
}

/* 結果セクション */
.result-section {
  padding: 1rem;
}

.image-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 2rem;
}

.image-container h3 {
  text-align: center;
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.125rem;
}

.image-wrapper {
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid var(--surface-light);
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.image-wrapper img,
.image-wrapper canvas {
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  display: block;
}

.checkered-bg {
  background-image:
    linear-gradient(45deg, #2d3748 25%, transparent 25%),
    linear-gradient(-45deg, #2d3748 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2d3748 75%),
    linear-gradient(-45deg, transparent 75%, #2d3748 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.arrow {
  font-size: 2rem;
  color: var(--accent);
}

/* コントロールボタン */
.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
}

.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.5);
}

.btn-secondary {
  background: var(--surface-light);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--surface);
  transform: scale(1.05);
}

/* 情報パネル */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: var(--surface);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--surface-light);
}

.info-card h3 {
  margin-bottom: 1rem;
  color: var(--accent);
  font-size: 1.125rem;
}

.info-card ol,
.info-card ul {
  padding-left: 1.5rem;
}

.info-card li {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.info-card strong {
  color: var(--text-primary);
}

/* レスポンシブ */
@media (max-width: 1024px) {
  .tool-container {
    grid-template-columns: 1fr;
  }

  .info-panel {
    order: -1;
  }

  .image-comparison {
    grid-template-columns: 1fr;
  }

  .arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 768px) {
  .tool-panel {
    padding: 1.5rem;
  }

  .upload-box {
    padding: 2rem;
  }

  .upload-icon {
    font-size: 3rem;
  }

  .controls {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
