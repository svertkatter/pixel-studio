<template>
  <div class="container">
    <header class="header">
      <h1 class="logo">
        <NuxtLink to="/" style="text-decoration: none; color: inherit;">🎨 Pixel Studio</NuxtLink>
      </h1>
      <p class="tagline">画像圧縮ツール</p>
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
            <div class="upload-icon">🗜️</div>
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
            <p class="loading-text">圧縮中...</p>
            <p class="loading-subtext">画像を最適化しています</p>
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
              <div class="file-info">
                <p>サイズ: {{ formatFileSize(originalSize) }}</p>
              </div>
            </div>
            <div class="arrow">→</div>
            <div class="image-container">
              <h3>圧縮後</h3>
              <div class="image-wrapper">
                <img :src="compressedImageUrl" alt="圧縮後の画像">
              </div>
              <div class="file-info">
                <p>サイズ: {{ formatFileSize(compressedSize) }}</p>
                <p class="compression-ratio">
                  {{ compressionRatio }}% 削減
                </p>
              </div>
            </div>
          </div>

          <!-- 圧縮設定 -->
          <div class="compression-settings">
            <h4>圧縮設定</h4>
            <div class="setting-group">
              <label>
                品質: {{ quality }}%
                <input
                  v-model.number="quality"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  @input="recompress"
                >
              </label>
            </div>
            <div class="setting-group">
              <label>
                出力形式:
                <select v-model="outputFormat" @change="recompress">
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
            </div>
          </div>

          <div class="controls">
            <button class="btn btn-primary" @click="downloadResult">
              <span>💾</span>
              ダウンロード
            </button>
            <button class="btn btn-secondary" @click="resetToUpload">
              <span>🔄</span>
              別の画像を圧縮
            </button>
          </div>
        </div>
      </div>

      <div class="info-panel">
        <div class="info-card">
          <h3>💡 使い方</h3>
          <ol>
            <li>画像をアップロード</li>
            <li>品質と形式を調整</li>
            <li>圧縮された画像をダウンロード</li>
          </ol>
        </div>

        <div class="info-card">
          <h3>✨ 特徴</h3>
          <ul>
            <li><strong>高品質圧縮</strong> - 画質を保ちながらファイルサイズを削減</li>
            <li><strong>リアルタイム調整</strong> - スライダーで品質を即座に変更</li>
            <li><strong>複数形式対応</strong> - JPEG、PNG、WebPに変換可能</li>
            <li><strong>プライバシー保護</strong> - ブラウザ内で処理、画像は外部に送信されません</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>📊 圧縮率の目安</h3>
          <ul>
            <li><strong>品質80-100%</strong>: 高品質、軽い圧縮（写真向け）</li>
            <li><strong>品質60-80%</strong>: バランス型（Web用画像）</li>
            <li><strong>品質40-60%</strong>: 高圧縮（サムネイル等）</li>
            <li><strong>WebP形式</strong>: JPEGより約30%小さいサイズ</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>⚠️ 注意事項</h3>
          <ul>
            <li>品質を下げすぎると画質が劣化します</li>
            <li>PNGは可逆圧縮のため、品質設定の影響は限定的です</li>
            <li>WebPは最も効率的ですが、一部の古いブラウザでは未対応です</li>
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
import { ref, computed } from 'vue'

useHead({
  title: '画像圧縮 - Pixel Studio',
  meta: [
    { name: 'description', content: '画質を保ちながらファイルサイズを削減する画像圧縮ツール' }
  ]
})

const currentSection = ref('upload')
const isDragging = ref(false)
const fileInput = ref(null)
const originalImageUrl = ref('')
const compressedImageUrl = ref('')
const originalSize = ref(0)
const compressedSize = ref(0)
const quality = ref(80)
const outputFormat = ref('jpeg')
let originalImage = null
let originalFile = null

const compressionRatio = computed(() => {
  if (originalSize.value === 0) return 0
  return Math.round((1 - compressedSize.value / originalSize.value) * 100)
})

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

// 画像処理
async function processImage(file) {
  if (file.size > 20 * 1024 * 1024) {
    alert('ファイルサイズが大きすぎます。20MB以下の画像を選択してください。')
    return
  }

  // サポートされていない形式をチェック
  if (file.type === 'image/avif') {
    alert('AVIF形式は現在サポートされていません。PNG、JPEG、WebP形式の画像をご使用ください。')
    return
  }

  currentSection.value = 'processing'
  originalFile = file
  originalSize.value = file.size

  try {
    const imageData = await loadImage(file)
    originalImageUrl.value = imageData

    const img = new Image()
    await new Promise((resolve) => {
      img.onload = resolve
      img.src = imageData
    })

    originalImage = img

    // 初期圧縮を実行
    await compressImage()

    currentSection.value = 'result'

  } catch (error) {
    console.error('Image compression failed:', error)
    alert('画像圧縮に失敗しました。別の画像で試してください。\nエラー: ' + error.message)
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

// 画像を圧縮
async function compressImage() {
  if (!originalImage) return

  const canvas = document.createElement('canvas')
  canvas.width = originalImage.width
  canvas.height = originalImage.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(originalImage, 0, 0)

  // 形式に応じてMIMEタイプを設定
  let mimeType = 'image/jpeg'
  if (outputFormat.value === 'png') {
    mimeType = 'image/png'
  } else if (outputFormat.value === 'webp') {
    mimeType = 'image/webp'
  }

  // 品質設定（0.0-1.0）
  const qualityValue = quality.value / 100

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        compressedSize.value = blob.size
        compressedImageUrl.value = URL.createObjectURL(blob)
      }
      resolve()
    }, mimeType, qualityValue)
  })
}

// 再圧縮（設定変更時）
async function recompress() {
  if (currentSection.value === 'result' && originalImage) {
    await compressImage()
  }
}

// ファイルサイズをフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// ダウンロード
function downloadResult() {
  if (!compressedImageUrl.value) return

  const link = document.createElement('a')
  link.href = compressedImageUrl.value

  // 拡張子を決定
  let extension = 'jpg'
  if (outputFormat.value === 'png') {
    extension = 'png'
  } else if (outputFormat.value === 'webp') {
    extension = 'webp'
  }

  link.download = `compressed-${Date.now()}.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function resetToUpload() {
  currentSection.value = 'upload'
  originalImageUrl.value = ''
  compressedImageUrl.value = ''
  originalSize.value = 0
  compressedSize.value = 0
  quality.value = 80
  outputFormat.value = 'jpeg'
  originalImage = null
  originalFile = null
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
  min-height: 200px;
}

.image-wrapper img {
  max-width: 100%;
  max-height: 300px;
  width: auto;
  height: auto;
  display: block;
}

.file-info {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.compression-ratio {
  color: var(--accent);
  font-weight: 600;
  font-size: 1rem;
  margin-top: 0.25rem;
}

.arrow {
  font-size: 2rem;
  color: var(--accent);
}

/* 圧縮設定 */
.compression-settings {
  background: var(--background);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--surface-light);
}

.compression-settings h4 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

.setting-group {
  margin-bottom: 1rem;
}

.setting-group label {
  display: block;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.setting-group input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-light);
  outline: none;
  -webkit-appearance: none;
}

.setting-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
}

.setting-group input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: none;
}

.setting-group select {
  width: 100%;
  padding: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--surface-light);
  border-radius: 0.5rem;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
}

.setting-group select:focus {
  outline: none;
  border-color: var(--primary-color);
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
