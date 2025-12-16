// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/pixel-studio/' : '/',
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Pixel Studio - 画像処理ツール',
      meta: [
        { name: 'description', content: '画像の圧縮、背景削除、ファイル形式変換が簡単にできる無料オンラインツール' },
        // テーマカラー
        { name: 'theme-color', content: '#6366f1' },
        // iOS用メタタグ
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Pixel Studio' },
        // Android/Chrome用
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'application-name', content: 'Pixel Studio' },
        // Windows用
        { name: 'msapplication-TileColor', content: '#6366f1' },
        { name: 'msapplication-config', content: '/pixel-studio/browserconfig.xml' }
      ],
      link: [
        // 標準ファビコン
        { rel: 'icon', type: 'image/svg+xml', href: '/pixel-studio/favicon.svg' },
        // iOS用アイコン（SVGをフォールバックとして使用）
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/pixel-studio/apple-touch-icon.png' },
        // 様々なサイズのファビコン
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/pixel-studio/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/pixel-studio/favicon-16x16.png' },
        // Web App Manifest
        { rel: 'manifest', href: '/pixel-studio/site.webmanifest' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  // GitHub Pages用の設定
  nitro: {
    preset: 'static'
  },

  // クライアントサイドでのみ使用するパッケージ
  vite: {
    optimizeDeps: {
      exclude: ['@imgly/background-removal']
    }
  }
})
