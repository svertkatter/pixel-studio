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
        { name: 'description', content: '画像の圧縮、背景削除、ファイル形式変換が簡単にできる無料オンラインツール' }
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
