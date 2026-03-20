// === Генератор QR (обычный + скрытый в синем канале) ===

document.getElementById("generateBtn").addEventListener("click", () => {
  const text = document.getElementById("textInput").value.trim();
  if (!text) {
    alert("Введите текст или URL!");
    return;
  }

  const size = 300;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

  // 1. Загружаем обычный QR-код
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = qrUrl;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Рисуем оригинальный QR
    ctx.drawImage(img, 0, 0, size, size);

    // Получаем пиксельные данные
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // Преобразуем в "скрытый" QR — только синий канал
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // const a = data[i + 3];

      // Если пиксель был "чёрным" в QR → синий = 255
      // Если был "белым" → синий = 0
      const isBlack = (r < 128 && g < 128 && b < 128);

      data[i]     = 0;           // R = 0
      data[i + 1] = 0;           // G = 0
      data[i + 2] = isBlack ? 255 : 0;  // B = 255 или 0
      // data[i + 3] остается 255 (полная непрозрачность)
    }

    // Записываем изменённые данные обратно
    ctx.putImageData(imageData, 0, 0);

    // Показываем результат
    const resultDiv = document.getElementById("qrResult");
    resultDiv.innerHTML = '';
    const hiddenQR = document.createElement("img");
    hiddenQR.src = canvas.toDataURL("image/png");
    hiddenQR.alt = "Скрытый QR-код (только синий канал)";
    hiddenQR.style.maxWidth = "100%";
    hiddenQR.style.borderRadius = "12px";
    hiddenQR.style.boxShadow = "0 4px 15px rgba(0,0,0,0.6)";
    resultDiv.appendChild(hiddenQR);

    document.getElementById("scanResult").innerHTML = "";
  };

  img.onerror = () => {
    alert("Не удалось загрузить QR-код с сервера. Попробуйте позже.");
  };
});


// === Сканер QR (будет доработан на следующем этапе для чтения только синего канала) ===

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
    scanMessage.textContent = "Запускаем камеру...";

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = stream;
    video.play();
    scanning = true;
    scanMessage.textContent = "Наведите на скрытый QR-код";

    requestAnimationFrame(scanFrame);
  } catch (err) {
    console.error("Ошибка камеры:", err);
    scanMessage.textContent = "Не удалось открыть камеру. Проверьте разрешения.";
    alert("Камера недоступна. Разрешите доступ в настройках браузера.");
  }
});

closeScanner.addEventListener("click", stopScanner);

function stopScanner() {
  scanning = false;
  scannerOverlay.style.display = "none";
  scanMessage.textContent = "";

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
}

function scanFrame() {
  if (!scanning) return;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // На этом этапе пока используем обычное распознавание
    // (следующий шаг — извлечение только синего канала)
    const code = jsQR(data, canvas.width, canvas.height, {
      inversionAttempts: "dontInvert"
    });

    if (code) {
      scanResult.textContent = "Результат: " + code.data;
      scanResult.style.color = "#0f0";
      stopScanner();
      return;
    }
  }

  requestAnimationFrame(scanFrame);
}