// DOM要素
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const resultSection = document.getElementById('resultSection');
const originalImage = document.getElementById('originalImage');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const newImageBtn = document.getElementById('newImageBtn');

let currentImageBlob = null;

// @imgly/background-removal をCDNから動的に読み込む
let removeBackground = null;

async function loadBackgroundRemovalLibrary() {
    try {
        // unpkg CDNを使用して読み込む
        const module = await import('https://unpkg.com/@imgly/background-removal@1.4.5/dist/index.mjs');
        removeBackground = module.removeBackground;
        return true;
    } catch (error) {
        console.error('Failed to load background removal library:', error);
        alert('背景削除ライブラリの読み込みに失敗しました。ページを再読み込みしてください。\nエラー: ' + error.message);
        return false;
    }
}

// ファイルアップロードのイベントリスナー
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
});

// ドラッグ&ドロップ
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('drag-over');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('drag-over');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    } else {
        alert('画像ファイルをアップロードしてください。');
    }
});

// 画像処理
async function processImage(file) {
    // 画像サイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。');
        return;
    }

    // アップロード画面を非表示、処理中画面を表示
    uploadSection.style.display = 'none';
    processingSection.style.display = 'flex';
    resultSection.style.display = 'none';

    try {
        // ライブラリが未ロードの場合は読み込む
        if (!removeBackground) {
            const loaded = await loadBackgroundRemovalLibrary();
            if (!loaded) {
                resetToUpload();
                return;
            }
        }

        // 元画像の表示
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // 背景削除処理
        const imageBlob = await removeBackground(file, {
            model: 'medium', // small, medium, large から選択
            output: {
                format: 'image/png',
                quality: 0.8
            }
        });

        currentImageBlob = imageBlob;

        // 結果をCanvasに描画
        const img = new Image();
        img.onload = () => {
            resultCanvas.width = img.width;
            resultCanvas.height = img.height;
            const ctx = resultCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 結果画面を表示
            processingSection.style.display = 'none';
            resultSection.style.display = 'block';
        };
        img.src = URL.createObjectURL(imageBlob);

    } catch (error) {
        console.error('Background removal failed:', error);
        alert('背景削除に失敗しました。別の画像で試してください。\nエラー: ' + error.message);
        resetToUpload();
    }
}

// ダウンロード
downloadBtn.addEventListener('click', () => {
    if (!currentImageBlob) return;

    const url = URL.createObjectURL(currentImageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'removed-background-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// 新しい画像を処理
newImageBtn.addEventListener('click', () => {
    resetToUpload();
    fileInput.value = '';
});

// アップロード画面にリセット
function resetToUpload() {
    uploadSection.style.display = 'flex';
    processingSection.style.display = 'none';
    resultSection.style.display = 'none';
    currentImageBlob = null;
}
