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
let selfieSegmentation = null;

// MediaPipe Selfie Segmentationの初期化
function initializeModel() {
    if (!selfieSegmentation) {
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });

        selfieSegmentation.setOptions({
            modelSelection: 1, // 0: 一般モデル, 1: ランドスケープモデル（高精度）
        });
    }
    return selfieSegmentation;
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
        // モデルの初期化
        const model = initializeModel();

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

        // セグメンテーション結果を受け取るコールバック
        await new Promise((resolve, reject) => {
            model.onResults((results) => {
                try {
                    removeBackground(img, results);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            // セグメンテーション実行
            model.send({ image: img });
        });

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
function removeBackground(img, results) {
    const canvas = resultCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // 一時キャンバスでセグメンテーションマスクを処理
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');

    // セグメンテーションマスクを描画（ぼかし効果を適用）
    tempCtx.filter = 'blur(2px)'; // ガウシアンブラーでエッジを滑らかに
    tempCtx.drawImage(results.segmentationMask, 0, 0, img.width, img.height);
    tempCtx.filter = 'none'; // フィルタをリセット

    const maskImageData = tempCtx.getImageData(0, 0, img.width, img.height);

    // マスクをさらにスムージング
    const smoothedMask = smoothMaskData(maskImageData.data, img.width, img.height);

    // 元画像を描画
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;

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

// マスクデータをスムージング
function smoothMaskData(maskData, width, height) {
    const smoothed = new Uint8ClampedArray(width * height);

    // 3x3ガウシアンカーネル
    const kernel = [
        [1/16, 2/16, 1/16],
        [2/16, 4/16, 2/16],
        [1/16, 2/16, 1/16]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;

            // カーネルを適用
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const ny = Math.min(Math.max(y + ky, 0), height - 1);
                    const nx = Math.min(Math.max(x + kx, 0), width - 1);
                    const idx = (ny * width + nx) * 4;
                    sum += maskData[idx] * kernel[ky + 1][kx + 1];
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
