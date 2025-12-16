import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicDir = join(__dirname, '..', 'public')

// SVGファイルを読み込む
const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'))

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

console.log('\n✨ All icons generated successfully!')
