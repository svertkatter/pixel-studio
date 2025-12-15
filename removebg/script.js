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
        // 画像を読み込む
        const imageData = await loadImage(file);

        // 元画像の表示
        originalImage.src = imageData;

        // 画像要素を作成
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = imageData;
        });

        // 背景を削除
        await removeBackground(img);

        // 結果画面を表示
        processingSection.style.display = 'none';
        resultSection.style.display = 'block';

    } catch (error) {
        console.error('Background removal failed:', error);
        alert('背景削除に失敗しました。別の画像で試してください。\nエラー: ' + error.message);
        resetToUpload();
    }
}

// 画像ファイルを読み込む
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 背景色を検出（四隅の色から推測）
function detectBackgroundColor(imageData, width, height) {
    const data = imageData.data;
    const samples = [];

    // 四隅と各辺の中央からサンプリング
    const positions = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1], // 四隅
        [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1], // 上下中央
        [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)] // 左右中央
    ];

    for (const [x, y] of positions) {
        const idx = (y * width + x) * 4;
        samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        });
    }

    // 最も多い色を背景色とする（簡易的に平均を使用）
    const avgColor = {
        r: Math.round(samples.reduce((sum, c) => sum + c.r, 0) / samples.length),
        g: Math.round(samples.reduce((sum, c) => sum + c.g, 0) / samples.length),
        b: Math.round(samples.reduce((sum, c) => sum + c.b, 0) / samples.length)
    };

    return avgColor;
}

// 色の距離を計算
function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

// 背景を削除（色ベース + エッジスムージング）
async function removeBackground(img) {
    const canvas = resultCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // 元画像を描画
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // 背景色を検出
    const bgColor = detectBackgroundColor(imageData, canvas.width, canvas.height);

    // 閾値（色の許容範囲）
    const threshold = 40; // 調整可能

    // アルファマスクを作成
    const alphaMask = new Uint8ClampedArray(canvas.width * canvas.height);

    for (let i = 0; i < pixels.length / 4; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];

        const color = { r, g, b };
        const distance = colorDistance(color, bgColor);

        // 距離に基づいてアルファ値を計算（グラデーション効果）
        if (distance < threshold) {
            // 背景に近い色は透明に（グラデーション）
            alphaMask[i] = Math.round(255 * (distance / threshold));
        } else {
            // 十分離れた色は不透明
            alphaMask[i] = 255;
        }
    }

    // マスクを多段階スムージング
    let smoothedMask = alphaMask;
    for (let pass = 0; pass < 3; pass++) {
        smoothedMask = smoothMaskAdvanced(smoothedMask, canvas.width, canvas.height);
    }

    // スムージングされたマスクを適用
    for (let i = 0; i < pixels.length / 4; i++) {
        pixels[i * 4 + 3] = smoothedMask[i];
    }

    // 更新した画像データをcanvasに戻す
    ctx.putImageData(imageData, 0, 0);

    // Blobに変換
    canvas.toBlob((blob) => {
        currentImageBlob = blob;
    }, 'image/png');
}

// 高度なマスクスムージング（5x5ガウシアンカーネル）
function smoothMaskAdvanced(maskData, width, height) {
    const smoothed = new Uint8ClampedArray(width * height);

    // 5x5ガウシアンカーネル（より強力）
    const kernel = [
        [1/273, 4/273, 7/273, 4/273, 1/273],
        [4/273, 16/273, 26/273, 16/273, 4/273],
        [7/273, 26/273, 41/273, 26/273, 7/273],
        [4/273, 16/273, 26/273, 16/273, 4/273],
        [1/273, 4/273, 7/273, 4/273, 1/273]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;

            // カーネルを適用
            for (let ky = -2; ky <= 2; ky++) {
                for (let kx = -2; kx <= 2; kx++) {
                    const ny = Math.min(Math.max(y + ky, 0), height - 1);
                    const nx = Math.min(Math.max(x + kx, 0), width - 1);
                    const idx = ny * width + nx;
                    sum += maskData[idx] * kernel[ky + 2][kx + 2];
                }
            }

            smoothed[y * width + x] = Math.round(sum);
        }
    }

    return smoothed;
}

// ダウンロード
downloadBtn.addEventListener('click', () => {
    if (!currentImageBlob) {
        // Blobがまだない場合はCanvasから直接ダウンロード
        resultCanvas.toBlob((blob) => {
            downloadBlob(blob);
        }, 'image/png');
    } else {
        downloadBlob(currentImageBlob);
    }
});

function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'removed-background-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

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
