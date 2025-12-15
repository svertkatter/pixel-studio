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
let removeBackground = null;

// @imgly/background-removalを動的にロード
async function loadAIModel() {
    if (!removeBackground) {
        try {
            // esm.sh経由でロード（依存関係を自動解決）
            const module = await import('https://esm.sh/@imgly/background-removal@1.4.5');
            removeBackground = module.removeBackground;
            console.log('AI model loaded successfully');
        } catch (error) {
            console.error('Failed to load AI model:', error);
            throw new Error('AIモデルの読み込みに失敗しました');
        }
    }
    return removeBackground;
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

// 画像の複雑さを分析
function analyzeImageComplexity(imageData, width, height) {
    const data = imageData.data;
    const bgSamples = [];
    const positions = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
        [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ];

    for (const [x, y] of positions) {
        const idx = (y * width + x) * 4;
        bgSamples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        });
    }

    const avgColor = {
        r: bgSamples.reduce((sum, c) => sum + c.r, 0) / bgSamples.length,
        g: bgSamples.reduce((sum, c) => sum + c.g, 0) / bgSamples.length,
        b: bgSamples.reduce((sum, c) => sum + c.b, 0) / bgSamples.length
    };

    const variance = bgSamples.reduce((sum, c) => {
        return sum +
            Math.pow(c.r - avgColor.r, 2) +
            Math.pow(c.g - avgColor.g, 2) +
            Math.pow(c.b - avgColor.b, 2);
    }, 0) / bgSamples.length;

    return {
        isSimpleBackground: variance < 500,
        variance: variance
    };
}

// 画像処理（自動判定）
async function processImage(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。');
        return;
    }

    uploadSection.style.display = 'none';
    processingSection.style.display = 'flex';
    resultSection.style.display = 'none';

    try {
        const imageData = await loadImage(file);
        originalImage.src = imageData;

        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = imageData;
        });

        // 画像の複雑さを分析
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        const analysis = analyzeImageComplexity(
            tempCtx.getImageData(0, 0, img.width, img.height),
            img.width,
            img.height
        );

        console.log('Image analysis:', analysis);

        // 背景の複雑さに応じて処理方法を選択
        if (analysis.isSimpleBackground) {
            console.log('Using color-based removal (simple background)');
            await removeBackgroundColorBased(img);
        } else {
            console.log('Using AI-based removal (complex background - @imgly)');
            await removeBackgroundAI(file, img);
        }

        processingSection.style.display = 'none';
        resultSection.style.display = 'block';

    } catch (error) {
        console.error('Background removal failed:', error);
        alert('背景削除に失敗しました。別の画像で試してください。\nエラー: ' + error.message);
        resetToUpload();
    }
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 色ベースの背景削除（図形用）
async function removeBackgroundColorBased(img) {
    const canvas = resultCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const bgColor = detectBackgroundColor(imageData, canvas.width, canvas.height);
    const threshold = 40;
    const alphaMask = new Uint8ClampedArray(canvas.width * canvas.height);

    for (let i = 0; i < pixels.length / 4; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const color = { r, g, b };
        const distance = colorDistance(color, bgColor);

        if (distance < threshold) {
            alphaMask[i] = Math.round(255 * (distance / threshold));
        } else {
            alphaMask[i] = 255;
        }
    }

    // 多段階スムージング
    let smoothedMask = alphaMask;
    for (let pass = 0; pass < 3; pass++) {
        smoothedMask = smoothMaskAdvanced(smoothedMask, canvas.width, canvas.height);
    }

    for (let i = 0; i < pixels.length / 4; i++) {
        pixels[i * 4 + 3] = smoothedMask[i];
    }

    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
        currentImageBlob = blob;
    }, 'image/png');
}

// AIベースの背景削除（@imgly/background-removal）
async function removeBackgroundAI(file, img) {
    const model = await loadAIModel();

    // Configを設定
    const { Config } = await import('https://esm.sh/@imgly/background-removal@1.4.5');
    Config.publicPath = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/';

    // @imgly/background-removalで処理
    const blob = await model(file);

    // 結果をCanvasに描画
    const resultImg = new Image();
    await new Promise((resolve) => {
        resultImg.onload = resolve;
        resultImg.src = URL.createObjectURL(blob);
    });

    const canvas = resultCanvas;
    canvas.width = resultImg.width;
    canvas.height = resultImg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(resultImg, 0, 0);

    currentImageBlob = blob;
}

function detectBackgroundColor(imageData, width, height) {
    const data = imageData.data;
    const samples = [];

    const positions = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
        [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ];

    for (const [x, y] of positions) {
        const idx = (y * width + x) * 4;
        samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        });
    }

    return {
        r: Math.round(samples.reduce((sum, c) => sum + c.r, 0) / samples.length),
        g: Math.round(samples.reduce((sum, c) => sum + c.g, 0) / samples.length),
        b: Math.round(samples.reduce((sum, c) => sum + c.b, 0) / samples.length)
    };
}

function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

function smoothMaskAdvanced(maskData, width, height) {
    const smoothed = new Uint8ClampedArray(width * height);

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

newImageBtn.addEventListener('click', () => {
    resetToUpload();
    fileInput.value = '';
});

function resetToUpload() {
    uploadSection.style.display = 'flex';
    processingSection.style.display = 'none';
    resultSection.style.display = 'none';
    currentImageBlob = null;
}
