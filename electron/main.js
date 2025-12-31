import { app, BrowserWindow, Menu } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000

let mainWindow
let nuxtProcess

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: join(__dirname, 'build', 'icon.png'),
    show: false,
    backgroundColor: '#0f172a'
  })

  // Nuxtサーバーが起動するまで待機
  const loadURL = () => {
    const url = `http://localhost:${port}`
    mainWindow.loadURL(url)
  }

  // 開発モードの場合は少し待ってから読み込み
  if (isDev) {
    setTimeout(loadURL, 3000)
  } else {
    loadURL()
  }

  // ウィンドウの準備ができたら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // メニューバーをカスタマイズ
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'Pixel Studioについて' },
        { type: 'separator' },
        { role: 'quit', label: '終了' }
      ]
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直す' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' },
        { role: 'selectAll', label: 'すべて選択' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全画面表示' }
      ]
    },
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '閉じる' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startNuxtServer() {
  return new Promise((resolve, reject) => {
    // Nuxt 3サーバーを起動
    nuxtProcess = spawn('node', ['.output/server/index.mjs'], {
      env: { ...process.env, PORT: port.toString() },
      stdio: 'inherit'
    })

    nuxtProcess.on('error', (err) => {
      console.error('Nuxt server error:', err)
      reject(err)
    })

    // サーバーの起動を待つ
    setTimeout(resolve, 2000)
  })
}

app.on('ready', async () => {
  try {
    if (!isDev) {
      await startNuxtServer()
    }
    createWindow()
  } catch (error) {
    console.error('Failed to start app:', error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (nuxtProcess) {
    nuxtProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (nuxtProcess) {
    nuxtProcess.kill()
  }
})
