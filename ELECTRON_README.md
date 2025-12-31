# Pixel Studio - Electronアプリ

Pixel Studioのデスクトップアプリ版です。Web版と同じ機能をオフラインで使用できます。

## 📥 ダウンロード

[GitHub Releases](https://github.com/svertkatter/pixel-studio/releases)から最新版をダウンロードしてください。

### macOS

- **Intel Mac**: `Pixel-Studio-x.x.x-x64.dmg`
- **Apple Silicon (M1/M2/M3)**: `Pixel-Studio-x.x.x-arm64.dmg`

#### 初回起動時の注意

署名なしアプリのため、初回起動時に警告が表示されます：

1. DMGファイルをダウンロード
2. アプリケーションフォルダにドラッグ
3. 右クリック →「開く」を選択
4. 「開く」をクリック

または：

1. システム環境設定 → セキュリティとプライバシー
2. 「このまま開く」をクリック

### Windows

- **インストーラー**: `Pixel-Studio-x.x.x-x64.exe`
- **ポータブル版**: `Pixel-Studio-x.x.x-x64-portable.exe`

#### SmartScreenの警告

署名なしアプリのため、SmartScreenの警告が表示されます：

1. 「詳細情報」をクリック
2. 「実行」をクリック

## 🚀 開発者向け

### ローカルで実行

```bash
# 依存関係をインストール
npm install

# 開発モードで起動
npm run electron:dev
```

### ビルド

```bash
# macOS用
npm run electron:build:mac

# Windows用 (Windowsマシンで実行)
npm run electron:build:win

# すべてのプラットフォーム
npm run electron:build
```

### リリース方法

1. `package.json`のバージョンを更新
2. Gitタグを作成してプッシュ:

```bash
git tag v1.0.0
git push origin v1.0.0
```

3. GitHub Actionsが自動的にビルドしてリリースを作成

または、手動でリリース:

1. GitHub ActionsのRelease Electron Appワークフローに移動
2. 「Run workflow」をクリック
3. バージョンを入力して実行

## 📁 プロジェクト構成

```
pixel-studio/
├── electron/
│   ├── main.js              # Electronメインプロセス
│   └── build/
│       ├── icon.svg         # アプリアイコン (SVG)
│       └── icon.png         # アプリアイコン (PNG)
├── .github/workflows/
│   └── release-electron.yml # リリース自動化
├── electron-builder.json5   # ビルド設定
└── package.json             # スクリプトと依存関係
```

## 🛠 技術スタック

- **Electron**: デスクトップアプリフレームワーク
- **Nuxt 3**: フロントエンド
- **electron-builder**: パッケージング
- **GitHub Actions**: 自動ビルド&リリース

## ⚠️ 既知の問題

- macOS/Windowsで初回起動時に警告が表示される（署名なしのため）
- アプリサイズが大きい（約150MB）

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)を参照
