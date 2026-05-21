// ── Config ──────────────────────────────────────────────────────────────────
const W = 720, H = 540;

const BACKGROUNDS = [
  { label: 'Volcano Boardroom',     imagePath: '/public/backgrounds/volcano.jpg' },
  { label: 'Underwater TED',        imagePath: '/public/backgrounds/underwater.jpg' },
  { label: 'Inflatable Assets',     imagePath: '/public/backgrounds/inflatables.jpg' },
  { label: 'Island Retreat',        imagePath: '/public/backgrounds/epstein.jpeg' },
];

// ── State ────────────────────────────────────────────────────────────────────
let bgIndex = 0;
let bgImages = [];            // p5 images drawn from gradient canvases
let segCanvas, segCtx;
let segOutput = null;         // ImageData from MediaPipe
let mpReady = false;
let captureFrame = null;

let pulseT = 0;
let countdown = 0;
let pendingCapture = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function drawImageCover(p, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  p.image(img, x, y, w, h, sx, sy, sw, sh);
}

// ── p5 sketch ────────────────────────────────────────────────────────────────
new p5(function (p) {

  p.setup = function () {
    const cnv = p.createCanvas(W, H);
    cnv.parent('canvas-container');

    // Load background images
    for (const bg of BACKGROUNDS) {
      bgImages.push(p.loadImage(bg.imagePath));
    }

    setupSegCanvas();
    buildBgThumbs(p);
    initMediaPipe();
  };

  p.draw = function () {
    pulseT += 0.03;

    // ── Background ────────────────────────────────────────────────────────
    if (bgImages[bgIndex] && bgImages[bgIndex].width > 0) {
      drawImageCover(p, bgImages[bgIndex], 0, 0, W, H);
    } else {
      p.background(20, 10, 30);
    }

    // ── Segmented person ─────────────────────────────────────────────────
    if (segOutput) {
      p.image(segOutput, 0, 0, W, H);
    }

    // ── HUD overlays ─────────────────────────────────────────────────────
    drawBottomBar(p);

    // ── Capture on clean frame ────────────────────────────────────────────
    if (pendingCapture) {
      pendingCapture = false;
      captureFrame = p.get();
      uploadAndShow(captureFrame);
      return;
    }

    // ── Countdown overlay ─────────────────────────────────────────────────
    if (countdown > 0) {
      p.fill(0, 0, 0, 100);
      p.noStroke();
      p.rect(0, 0, W, H);

      p.textFont('Bebas Neue');
      p.textSize(200);
      p.textAlign(p.CENTER, p.CENTER);
      p.fill(255, 255, 255, 230);
      p.text(countdown, W / 2, H / 2 - 20);
    }
  };

  // ── Capture ───────────────────────────────────────────────────────────────
  document.getElementById('capture-btn').addEventListener('click', () => {
    if (countdown > 0) return;
    countdown = 3;
    captureBtn.disabled = true;
    captureBtn.textContent = '3…';

    const tick = () => {
      countdown--;
      if (countdown <= 0) {
        countdown = 0;
        pendingCapture = true;
      } else {
        captureBtn.textContent = countdown + '…';
        setTimeout(tick, 1000);
      }
    };
    setTimeout(tick, 1000);
  });

});

// ── Bottom branding bar ───────────────────────────────────────────────────────
function drawBottomBar(p) {
  const barH = 82;
  const barY = H - barH;

  // Dark translucent background
  p.noStroke();
  p.fill(0, 0, 0, 170);
  p.rect(0, barY, W, barH);

  // Left block: SATSUMA
  p.textAlign(p.LEFT, p.TOP);
  p.textFont('Bebas Neue');
  p.textSize(30);
  p.fill(255, 255, 255, 220);
  p.text('SATSUMA', 14, barY + 10);

  // Left block: TECHNOLOGY DYNAMICS
  p.textFont('Arial');
  p.textSize(7.5);
  p.textStyle(p.BOLD);
  p.fill(0, 212, 184, 210);
  p.text('TECHNOLOGY\nDYNAMICS', 14, barY + 44);
  p.textStyle(p.NORMAL);

  // Pink vertical divider — flush against SATSUMA text
  p.textFont('Bebas Neue');
  p.textSize(30);
  const divX = 14 + p.textWidth('SATSUMA') + 22;
  p.stroke(232, 60, 130, 220);
  p.strokeWeight(1.5);
  p.line(divX, barY + 12, divX, H - 12);
  p.noStroke();

  // Center title — measure both parts for centering
  p.textFont('Bebas Neue');
  p.textSize(34);
  const mainStr = 'ISLAND CORPORATE ';
  const mainW = p.textWidth(mainStr);

  p.textFont('Great Vibes');
  p.textSize(34);
  const retreatW = p.textWidth('Retreat');

  const titleX = (W - mainW - retreatW) / 2;
  const titleY = barY + 10;

  p.textFont('Bebas Neue');
  p.textSize(34);
  p.fill(255, 255, 255, 230);
  p.textAlign(p.LEFT, p.TOP);
  p.text('ISLAND CORPORATE ', titleX, titleY);

  p.textFont('Great Vibes');
  p.textSize(34);
  p.fill(232, 60, 130, 240);
  p.text('Retreat', titleX + mainW, titleY);

  // Date line with flanking rules
  const dateY = barY + 56;
  const dateStr = 'JUNE 6, 2026';
  p.textFont('Arial');
  p.textSize(9);
  p.textStyle(p.BOLD);
  p.textAlign(p.CENTER, p.TOP);
  p.fill(255, 255, 255, 180);
  p.text('🌴  ' + dateStr + '  🌴', W / 2, dateY);

  const labelHalfW = p.textWidth('🌴  ' + dateStr + '  🌴') / 2 + 8;
  p.stroke(255, 255, 255, 80);
  p.strokeWeight(0.75);
  p.line(W / 2 - labelHalfW - 24, dateY + 7, W / 2 - labelHalfW, dateY + 7);
  p.line(W / 2 + labelHalfW, dateY + 7, W / 2 + labelHalfW + 24, dateY + 7);
  p.noStroke();
  p.textStyle(p.NORMAL);
}

// ── MediaPipe Selfie Segmentation ─────────────────────────────────────────────
function setupSegCanvas() {
  segCanvas = document.getElementById('seg-canvas');
  segCanvas.width = W;
  segCanvas.height = H;
  segCtx = segCanvas.getContext('2d');
}

function initMediaPipe() {
  const video = document.getElementById('input-video');

  const selfieSegmentation = new SelfieSegmentation({
    locateFile: (f) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
  });
  selfieSegmentation.setOptions({ modelSelection: 1 });

  selfieSegmentation.onResults((results) => {
    if (!mpReady) {
      mpReady = true;
      document.getElementById('loading-screen').classList.add('hidden');
    }

    // Draw segmented person onto offscreen canvas
    segCtx.clearRect(0, 0, W, H);
    segCtx.drawImage(results.segmentationMask, 0, 0, W, H);

    // Keep only the person pixels
    segCtx.globalCompositeOperation = 'source-in';
    segCtx.drawImage(results.image, 0, 0, W, H);
    segCtx.globalCompositeOperation = 'source-over';

    // Convert to p5 image
    const imgData = segCtx.getImageData(0, 0, W, H);
    if (!segOutput) {
      segOutput = new p5.Image(W, H);
    }
    segOutput.loadPixels();
    for (let i = 0; i < imgData.data.length; i++) {
      segOutput.pixels[i] = imgData.data[i];
    }
    segOutput.updatePixels();
  });

  const camera = new Camera(video, {
    onFrame: async () => {
      await selfieSegmentation.send({ image: video });
    },
    width: W,
    height: H,
  });
  camera.start().catch((err) => {
    console.error('Camera error:', err);
    document.querySelector('#loading-screen p').textContent =
      'Camera access denied. Please allow camera permissions and refresh.';
  });
}

// ── Upload + Result modal ─────────────────────────────────────────────────────
const captureBtn = document.getElementById('capture-btn');

async function uploadAndShow(pg) {
  const dataURL = pg.canvas.toDataURL('image/png');

  // Show modal immediately with local preview while uploading
  showResult(dataURL, null);

  captureBtn.disabled = true;
  captureBtn.textContent = 'Uploading…';

  try {
    const res = await fetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataURL }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const { url } = await res.json();
    renderQR(url);
    document.getElementById('download-btn').href = url;
  } catch (err) {
    console.error('Upload failed:', err);
    // Fall back to QR that links to the local page
    renderQR(window.location.href);
    document.getElementById('qr-status').textContent = 'Upload failed — saved locally only';
  } finally {
    captureBtn.disabled = false;
    captureBtn.innerHTML = '<span class="icon">&#9679;</span> Capture Portrait';
  }
}

function showResult(dataURL, s3Url) {
  document.getElementById('result-img').src = dataURL;
  document.getElementById('download-btn').href = s3Url || dataURL;
  document.getElementById('qr-code').innerHTML = '';
  document.getElementById('qr-status').textContent = 'Uploading…';
  document.getElementById('result-modal').classList.remove('hidden');

  if (s3Url) renderQR(s3Url);
}

function renderQR(url) {
  const qrEl = document.getElementById('qr-code');
  qrEl.innerHTML = '';
  document.getElementById('qr-status').textContent = 'Scan to download';
  new QRCode(qrEl, {
    text: url,
    width: 120,
    height: 120,
    colorDark: '#e94560',
    colorLight: '#16213e',
  });
}

document.getElementById('retake-btn').addEventListener('click', () => {
  document.getElementById('result-modal').classList.add('hidden');
  document.getElementById('qr-code').innerHTML = '';
});

// ── Thumbnail selector ────────────────────────────────────────────────────────
function buildBgThumbs(p) {
  const container = document.getElementById('bg-thumbs');
  BACKGROUNDS.forEach((bg, i) => {
    const img = document.createElement('img');
    img.src = bg.imagePath;
    img.className = 'bg-thumb' + (i === 0 ? ' active' : '');
    img.title = bg.label;
    img.addEventListener('click', () => {
      bgIndex = i;
      document.querySelectorAll('.bg-thumb').forEach((el, j) =>
        el.classList.toggle('active', j === i)
      );
    });
    container.appendChild(img);
  });
}

