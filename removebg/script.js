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
let bodyPixModel = null;

// BodyPixモデルのロード（高精度設定）
async function loadModel() {
    if (!bodyPixModel) {
        bodyPixModel = await bodyPix.load({
            architecture: 'ResNet50', // より高精度なモデル
            outputStride: 16, // 細かいセグメンテーション
            quantBytes: 4 // 高精度な量子化
        });
    }
    return bodyPixModel;
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
        // モデルのロード
        await loadModel();

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

        // セグメンテーションを実行（高精度設定）
        const segmentation = await bodyPixModel.segmentPerson(img, {
            flipHorizontal: false,
            internalResolution: 'high', // 高解像度で処理
            segmentationThreshold: 0.5, // より細かく検出
            maxDetections: 1,
            scoreThreshold: 0.5,
            nmsRadius: 20
        });

        // 背景を削除した画像を生成
        await removeBackground(img, segmentation);

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

// 背景を削除（エッジスムージング付き）
async function removeBackground(img, segmentation) {
    const canvas = resultCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // 元画像を描画
    ctx.drawImage(img, 0, 0);

    // 画像データを取得
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // セグメンテーションマスクを取得
    const maskData = segmentation.data;
    const width = segmentation.width;
    const height = segmentation.height;

    // マスクをスムージング（3x3ガウシアンブラー）
    const smoothedMask = smoothMask(maskData, width, height);

    // マスクを適用（グラデーション対応）
    for (let i = 0; i < smoothedMask.length; i++) {
        const y = Math.floor(i / width);
        const x = i % width;

        // 元画像の対応するピクセル位置を計算
        const imgX = Math.floor((x / width) * canvas.width);
        const imgY = Math.floor((y / height) * canvas.height);
        const pixelIndex = (imgY * canvas.width + imgX) * 4;

        // スムージングされたマスク値でアルファチャンネルを設定
        pixels[pixelIndex + 3] = Math.round(smoothedMask[i] * 255);
    }

    // 更新した画像データをcanvasに戻す
    ctx.putImageData(imageData, 0, 0);

    // Blobに変換
    canvas.toBlob((blob) => {
        currentImageBlob = blob;
    }, 'image/png');
}

// マスクをスムージングする関数
function smoothMask(mask, width, height) {
    const smoothed = new Float32Array(mask.length);
    const kernel = [
        [1/16, 2/16, 1/16],
        [2/16, 4/16, 2/16],
        [1/16, 2/16, 1/16]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const ny = Math.min(Math.max(y + ky, 0), height - 1);
                    const nx = Math.min(Math.max(x + kx, 0), width - 1);
                    const idx = ny * width + nx;
                    sum += mask[idx] * kernel[ky + 1][kx + 1];
                }
            }

            smoothed[y * width + x] = sum;
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
