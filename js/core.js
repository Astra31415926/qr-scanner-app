// === ГЕНЕРАТОР: Создает QR в синем канале ===

document.getElementById("generateBtn").addEventListener("click", () => {
    const text = document.getElementById("textInput").value.trim();
    if (!text) {
        alert("Введите текст!");
        return;
    }

    const size = 300;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = qrUrl;

    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Оставляем данные только в синем канале (B)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const isBlack = (r < 128 && g < 128 && b < 128);

            data[i]     = 0;          // Красный в 0
            data[i + 1] = 0;          // Зеленый в 0
            data[i + 2] = isBlack ? 255 : 0; // Синий: 255 если точка черная
            data[i + 3] = 255;        // Непрозрачность
        }

        ctx.putImageData(imageData, 0, 0);

        const resultDiv = document.getElementById("qrResult");
        resultDiv.innerHTML = '';
        const hiddenQR = document.createElement("img");
        hiddenQR.src = canvas.toDataURL("image/png");
        resultDiv.appendChild(hiddenQR);
        document.getElementById("scanResult").innerHTML = "";
    };
});

// === СКАНЕР: Читает скрытый синий канал через камеру ===

const scanBtn = document.getElementById("scanBtn");
const scannerOverlay = document.getElementById("scannerOverlay");
const video = document.getElementById("video");
const closeScanner = document.getElementById("closeScanner");
const scanMessage = document.getElementById("scanMessage");
const scanResult = document.getElementById("scanResult");

let scanning = false;
let stream = null;

scanBtn.addEventListener("click", async () => {
    try {
        scannerOverlay.style.display = "flex";
        scanMessage.textContent = "Запуск камеры...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        video.play();
        scanning = true;
        requestAnimationFrame(scanFrame);
    } catch (err) {
        scanMessage.textContent = "Ошибка доступа к камере";
    }
});

closeScanner.addEventListener("click", stopScanner);

function stopScanner() {
    scanning = false;
    scannerOverlay.style.display = "none";
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    video.srcObject = null;
}

function scanFrame() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Создаем контрастный ч/б слой из синего канала для jsQR
        const processedData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const b = data[i + 2]; // Извлекаем синий
            
            // Если синего много (> 120), считаем это черным пикселем QR-кода
            // (библиотека jsQR лучше всего видит черный на белом)
            const val = b > 120 ? 0 : 255; 
            
            processedData[i]     = val;
            processedData[i + 1] = val;
            processedData[i + 2] = val;
            processedData[i + 3] = 255;
        }

        const code = jsQR(processedData, canvas.width, canvas.height, {
            inversionAttempts: "dontInvert"
        });

        if (code) {
            scanResult.innerHTML = "<strong>Найдено:</strong> " + code.data;
            scanResult.style.color = "#0f0";
            stopScanner();
            return;
        }
    }
    requestAnimationFrame(scanFrame);
}
