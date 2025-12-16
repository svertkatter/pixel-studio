import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicDir = join(__dirname, '..', 'public')

// SVGファイルを読み込む
const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'))
const ogImageBuffer = readFileSync(join(publicDir, 'og-image.svg'))

// 生成するアイコンのサイズと名前を定義
const icons = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 150, name: 'mstile-150x150.png' },
]

// Maskable icons用（パディング付き）
const maskableIcons = [
  { size: 192, name: 'icon-maskable-192x192.png' },
  { size: 512, name: 'icon-maskable-512x512.png' },
]

console.log('🎨 Generating PNG icons from SVG...\n')

// 通常のアイコンを生成
for (const icon of icons) {
  await sharp(svgBuffer)
    .resize(icon.size, icon.size)
    .png()
    .toFile(join(publicDir, icon.name))

  console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`)
}

// Maskableアイコンを生成（20%のパディング付き）
for (const icon of maskableIcons) {
  const padding = Math.floor(icon.size * 0.2)
  const innerSize = icon.size - (padding * 2)

  // SVGをリサイズしてパディングを追加
  const resized = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer()

  // パディング付きのキャンバスを作成
  await sharp({
    create: {
      width: icon.size,
      height: icon.size,
      channels: 4,
      background: { r: 99, g: 102, b: 241, alpha: 1 }
    }
  })
    .composite([{
      input: resized,
      top: padding,
      left: padding
    }])
    .png()
    .toFile(join(publicDir, icon.name))

  console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size}, maskable)`)
}

// OGP画像を生成（1200x630）
console.log('\n📱 Generating social media images...\n')

await sharp(ogImageBuffer)
  .resize(1200, 630)
  .png()
  .toFile(join(publicDir, 'og-image.png'))

console.log('✓ Generated og-image.png (1200x630, for social media)')

// Twitter用の小さいバージョンも生成
await sharp(ogImageBuffer)
  .resize(800, 420)
  .png()
  .toFile(join(publicDir, 'twitter-image.png'))

console.log('✓ Generated twitter-image.png (800x420, for Twitter)')

console.log('\n✨ All icons and social images generated successfully!')
