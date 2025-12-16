<template>
  <div class="container">
    <header class="header">
      <h1 class="logo">
        <NuxtLink to="/" style="text-decoration: none; color: inherit;">🎨 Pixel Studio</NuxtLink>
      </h1>
      <p class="tagline">画像形式変換ツール</p>
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
            <div class="upload-icon">🔄</div>
            <h2>画像をアップロード</h2>
            <p>クリックまたはドラッグ&ドロップで画像を選択</p>
            <p class="file-types">対応形式: PNG, JPEG, WebP, GIF, AVIF, BMP, TIFF など</p>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="handleFileSelect"
            >
          </div>
        </div>

        <!-- 形式選択セクション -->
        <div v-if="currentSection === 'selection'" class="selection-section">
          <div class="selection-content">
            <h2>変換設定</h2>

            <div class="original-preview">
              <h3>アップロードされた画像</h3>
              <div class="image-wrapper">
                <img :src="originalImageUrl" alt="元の画像">
              </div>
              <div class="file-info">
                <p>形式: {{ originalFormat.toUpperCase() }}</p>
                <p>サイズ: {{ formatFileSize(originalSize) }}</p>
              </div>
            </div>

            <div class="format-selection">
              <div class="setting-group">
                <label>
                  <strong>変換先の形式を選択:</strong>
                  <select v-model="outputFormat">
                    <optgroup label="一般的な形式">
                      <option value="jpeg">JPEG - 写真向け、高圧縮</option>
                      <option value="png">PNG - 透明度対応、可逆圧縮</option>
                      <option value="webp">WebP - 次世代形式、高効率</option>
                      <option value="avif">AVIF - 最新形式、超高効率</option>
                    </optgroup>
                    <optgroup label="その他">
                      <option value="gif">GIF - アニメーション対応</option>
                      <option value="bmp">BMP - 非圧縮形式</option>
                      <option value="ico">ICO - アイコン形式</option>
                    </optgroup>
                  </select>
                </label>
              </div>

              <div v-if="showQualitySlider" class="setting-group">
                <label>
                  <strong>品質: {{ quality }}%</strong>
                  <input
                    v-model.number="quality"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                  >
                </label>
                <p class="setting-hint">※ JPEG、WebP、AVIFで有効</p>
              </div>

              <div v-if="outputFormat === 'png'" class="setting-group">
                <label>
                  <input type="checkbox" v-model="preserveTransparency">
                  透明度を保持
                </label>
                <p class="setting-hint">※ 元画像に透明度がある場合のみ有効</p>
              </div>
            </div>

            <div class="controls">
              <button class="btn btn-primary" @click="startConversion">
                <span>🔄</span>
                変換する
              </button>
              <button class="btn btn-secondary" @click="resetToUpload">
                <span>←</span>
                戻る
              </button>
            </div>
          </div>
        </div>

        <!-- 処理中セクション -->
        <div v-if="currentSection === 'processing'" class="processing-section">
          <div class="loader-container">
            <div class="loader"></div>
            <p class="loading-text">変換中...</p>
            <p class="loading-subtext">{{ outputFormat.toUpperCase() }}形式に変換しています</p>
          </div>
        </div>

        <!-- 結果セクション -->
        <div v-if="currentSection === 'result'" class="result-section">
          <div class="format-info">
            <div class="format-badge">
              <span class="format-label">元の形式</span>
              <span class="format-value">{{ originalFormat.toUpperCase() }}</span>
            </div>
            <div class="arrow">→</div>
            <div class="format-badge">
              <span class="format-label">変換後</span>
              <span class="format-value">{{ outputFormat.toUpperCase() }}</span>
            </div>
          </div>

          <div class="image-preview">
            <div class="preview-container">
              <h3>変換結果</h3>
              <div class="image-wrapper">
                <img :src="convertedImageUrl" alt="変換後の画像">
              </div>
              <div class="file-info">
                <p>サイズ: {{ formatFileSize(convertedSize) }}</p>
                <p v-if="originalSize !== convertedSize" class="size-change" :class="{ 'size-reduced': convertedSize < originalSize, 'size-increased': convertedSize > originalSize }">
                  {{ sizeChangeText }}
                </p>
              </div>
            </div>
          </div>

          <!-- 変換設定 -->
          <div class="conversion-settings">
            <h4>変換設定</h4>

            <div class="setting-group">
              <label>
                出力形式:
                <select v-model="outputFormat" @change="convertImage">
                  <optgroup label="一般的な形式">
                    <option value="jpeg">JPEG - 写真向け、高圧縮</option>
                    <option value="png">PNG - 透明度対応、可逆圧縮</option>
                    <option value="webp">WebP - 次世代形式、高効率</option>
                    <option value="avif">AVIF - 最新形式、超高効率</option>
                  </optgroup>
                  <optgroup label="その他">
                    <option value="gif">GIF - アニメーション対応</option>
                    <option value="bmp">BMP - 非圧縮形式</option>
                    <option value="ico">ICO - アイコン形式</option>
                  </optgroup>
                </select>
              </label>
            </div>

            <div v-if="showQualitySlider" class="setting-group">
              <label>
                品質: {{ quality }}%
                <input
                  v-model.number="quality"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  @input="convertImage"
                >
              </label>
              <p class="setting-hint">※ JPEG、WebP、AVIFで有効</p>
            </div>

            <div v-if="outputFormat === 'png'" class="setting-group">
              <label>
                <input type="checkbox" v-model="preserveTransparency" @change="convertImage">
                透明度を保持
              </label>
              <p class="setting-hint">※ 元画像に透明度がある場合のみ有効</p>
            </div>
          </div>

          <div class="controls">
            <button class="btn btn-primary" @click="downloadResult">
              <span>💾</span>
              ダウンロード
            </button>
            <button class="btn btn-secondary" @click="resetToUpload">
              <span>🔄</span>
              別の画像を変換
            </button>
          </div>
        </div>
      </div>

      <div class="info-panel">
        <div class="info-card">
          <h3>💡 使い方</h3>
          <ol>
            <li>画像をアップロード</li>
            <li>変換したい形式を選択</li>
            <li>品質を調整（必要に応じて）</li>
            <li>「変換する」ボタンをクリック</li>
            <li>変換された画像をダウンロード</li>
          </ol>
        </div>

        <div class="info-card">
          <h3>📁 対応形式</h3>
          <ul>
            <li><strong>入力</strong>: PNG, JPEG, WebP, GIF, AVIF, BMP, TIFF, SVG など</li>
            <li><strong>出力</strong>: JPEG, PNG, WebP, AVIF, GIF, BMP, ICO</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>🎯 形式の特徴</h3>
          <ul>
            <li><strong>JPEG</strong>: 写真向け、透明度非対応、高圧縮</li>
            <li><strong>PNG</strong>: 透明度対応、可逆圧縮、Web標準</li>
            <li><strong>WebP</strong>: JPEGより30%小さい、透明度対応</li>
            <li><strong>AVIF</strong>: 最高効率、最新ブラウザのみ対応</li>
            <li><strong>GIF</strong>: アニメーション、256色まで</li>
            <li><strong>BMP</strong>: 非圧縮、ファイルサイズ大</li>
            <li><strong>ICO</strong>: Windowsアイコン形式</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>💡 使用例</h3>
          <ul>
            <li><strong>Web用に最適化</strong>: PNG/JPEG → WebP/AVIF</li>
            <li><strong>透明PNGを作成</strong>: JPEG/WebP → PNG</li>
            <li><strong>ファビコン作成</strong>: PNG → ICO</li>
            <li><strong>写真を軽量化</strong>: PNG → JPEG</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>⚠️ 注意事項</h3>
          <ul>
            <li>AVIFは新しい形式のため、古いブラウザでは表示できない場合があります</li>
            <li>GIF変換では色数が256色に制限されます</li>
            <li>JPEGに変換すると透明部分は白色になります</li>
            <li>BMP形式は非圧縮のため、ファイルサイズが大きくなります</li>
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
  title: '形式変換 - Pixel Studio',
  meta: [
    { name: 'description', content: '画像形式を簡単に変換。PNG、JPEG、WebP、AVIF、GIFなど多様な形式に対応' }
  ]
})

const currentSection = ref('upload')
const isDragging = ref(false)
const fileInput = ref(null)
const originalImageUrl = ref('')
const convertedImageUrl = ref('')
const originalSize = ref(0)
const convertedSize = ref(0)
const originalFormat = ref('')
const outputFormat = ref('webp')
const quality = ref(85)
const preserveTransparency = ref(true)
let originalImage = null

const showQualitySlider = computed(() => {
  return ['jpeg', 'webp', 'avif'].includes(outputFormat.value)
})

const sizeChangeText = computed(() => {
  if (originalSize.value === 0 || convertedSize.value === 0) return ''
  const diff = convertedSize.value - originalSize.value
  const percent = Math.round(Math.abs(diff) / originalSize.value * 100)
  if (diff > 0) {
    return `${percent}% 増加`
  } else if (diff < 0) {
    return `${percent}% 削減`
  }
  return '同じサイズ'
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

// 画像形式を検出
function detectImageFormat(file) {
  const type = file.type
  const formatMap = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/x-ms-bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico'
  }
  return formatMap[type] || 'unknown'
}

// 画像処理
async function processImage(file) {
  if (file.size > 50 * 1024 * 1024) {
    alert('ファイルサイズが大きすぎます。50MB以下の画像を選択してください。')
    return
  }

  originalSize.value = file.size
  originalFormat.value = detectImageFormat(file)

  try {
    const imageData = await loadImage(file)
    originalImageUrl.value = imageData

    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      img.src = imageData
    })

    originalImage = img

    // 形式選択セクションへ移動
    currentSection.value = 'selection'

  } catch (error) {
    console.error('Image loading failed:', error)
    alert('画像の読み込みに失敗しました。別の画像で試してください。\nエラー: ' + error.message)
    resetToUpload()
  }
}

// 変換を開始
async function startConversion() {
  currentSection.value = 'processing'

  try {
    await convertImage()
    currentSection.value = 'result'
  } catch (error) {
    console.error('Image conversion failed:', error)
    alert('画像変換に失敗しました。別の形式で試してください。\nエラー: ' + error.message)
    currentSection.value = 'selection'
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

// 画像を変換
async function convertImage() {
  if (!originalImage) return

  const canvas = document.createElement('canvas')
  canvas.width = originalImage.width
  canvas.height = originalImage.height
  const ctx = canvas.getContext('2d')

  // 透明度を保持しない場合は白背景を描画
  if (!preserveTransparency.value || outputFormat.value === 'jpeg' || outputFormat.value === 'bmp') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.drawImage(originalImage, 0, 0)

  // 形式に応じてMIMEタイプを設定
  const mimeTypeMap = {
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'avif': 'image/avif',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon'
  }

  let mimeType = mimeTypeMap[outputFormat.value] || 'image/png'

  // AVIFのブラウザサポートチェック
  if (outputFormat.value === 'avif') {
    const testCanvas = document.createElement('canvas')
    testCanvas.width = 1
    testCanvas.height = 1
    const supported = testCanvas.toDataURL('image/avif').startsWith('data:image/avif')

    if (!supported) {
      alert('お使いのブラウザはAVIF形式をサポートしていません。WebPまたは他の形式を選択してください。')
      outputFormat.value = 'webp'
      mimeType = 'image/webp'
    }
  }

  // 品質設定（0.0-1.0）
  const qualityValue = quality.value / 100

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        convertedSize.value = blob.size

        // 古いURLを解放
        if (convertedImageUrl.value && convertedImageUrl.value.startsWith('blob:')) {
          URL.revokeObjectURL(convertedImageUrl.value)
        }

        convertedImageUrl.value = URL.createObjectURL(blob)
      } else {
        // Blobの生成に失敗した場合（サポートされていない形式など）
        alert(`${outputFormat.value.toUpperCase()}形式への変換に失敗しました。他の形式を試してください。`)
      }
      resolve()
    }, mimeType, qualityValue)
  })
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
  if (!convertedImageUrl.value) return

  const link = document.createElement('a')
  link.href = convertedImageUrl.value

  // 拡張子を決定
  const extensionMap = {
    'jpeg': 'jpg',
    'png': 'png',
    'webp': 'webp',
    'avif': 'avif',
    'gif': 'gif',
    'bmp': 'bmp',
    'ico': 'ico'
  }

  const extension = extensionMap[outputFormat.value] || 'png'
  link.download = `converted-${Date.now()}.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function resetToUpload() {
  currentSection.value = 'upload'
  originalImageUrl.value = ''

  // URLを解放
  if (convertedImageUrl.value && convertedImageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(convertedImageUrl.value)
  }

  convertedImageUrl.value = ''
  originalSize.value = 0
  convertedSize.value = 0
  originalFormat.value = ''
  outputFormat.value = 'webp'
  quality.value = 85
  preserveTransparency.value = true
  originalImage = null

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

/* 形式選択セクション */
.selection-section {
  padding: 1rem;
}

.selection-content h2 {
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.original-preview {
  margin-bottom: 2rem;
}

.original-preview h3 {
  text-align: center;
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.125rem;
}

.format-selection {
  background: var(--background);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--surface-light);
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

.format-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.format-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--background);
  border-radius: 0.5rem;
  border: 1px solid var(--surface-light);
}

.format-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.format-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}

.arrow {
  font-size: 2rem;
  color: var(--accent);
}

.image-preview {
  margin-bottom: 2rem;
}

.preview-container h3 {
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
  max-height: 400px;
}

.image-wrapper img {
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  display: block;
}

.file-info {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.size-change {
  font-weight: 600;
  margin-top: 0.25rem;
}

.size-reduced {
  color: var(--accent);
}

.size-increased {
  color: #f59e0b;
}

/* 変換設定 */
.conversion-settings {
  background: var(--background);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--surface-light);
}

.conversion-settings h4 {
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

.setting-group input[type="checkbox"] {
  margin-right: 0.5rem;
  cursor: pointer;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.7;
  margin-top: 0.25rem;
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

  .format-info {
    flex-direction: column;
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
