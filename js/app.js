/**
 * FileSlim – app.js
 * Handles: drag-drop, file reading, image resize (canvas),
 *          PDF resize (PDF.js + jsPDF), download.
 */

// ── PDF.js worker setup ──────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── DOM refs ─────────────────────────────────────────────────
const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const previewIcon = document.getElementById('previewIcon');
const previewName = document.getElementById('previewName');
const previewMeta = document.getElementById('previewMeta');
const removeBtn   = document.getElementById('removeBtn');

const targetSizeInput = document.getElementById('targetSize');
const unitBtns        = document.querySelectorAll('.unit-btn');
const hints           = document.querySelectorAll('.hint');

const resizeBtn     = document.getElementById('resizeBtn');
const progressWrap  = document.getElementById('progressWrap');
const progressFill  = document.getElementById('progressFill');
const progressText  = document.getElementById('progressText');
const resultCard    = document.getElementById('resultCard');
const origSizeEl    = document.getElementById('origSize');
const newSizeEl     = document.getElementById('newSize');
const downloadBtn   = document.getElementById('downloadBtn');
const errorCard     = document.getElementById('errorCard');
const errorMsg      = document.getElementById('errorMsg');

// ── State ─────────────────────────────────────────────────────
let selectedFile  = null;   // File object
let selectedUnit  = 'KB';   // 'KB' or 'MB'
let outputBlob    = null;   // final resized Blob
let outputName    = '';     // download filename

// ── Helpers ───────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getTargetBytes() {
  const val  = parseFloat(targetSizeInput.value);
  if (!val || val <= 0) return null;
  return selectedUnit === 'KB' ? val * 1024 : val * 1024 * 1024;
}

function fileTypeLabel(file) {
  if (file.type === 'application/pdf') return 'PDF';
  if (file.type.startsWith('image/')) return 'Image';
  return 'File';
}

function fileIcon(file) {
  if (file.type === 'application/pdf')
    return '<i class="ph-fill ph-file-pdf" style="color:#ff6b6b"></i>';
  if (file.type.startsWith('image/'))
    return '<i class="ph-fill ph-image" style="color:#00e5c3"></i>';
  return '<i class="ph-fill ph-file" style="color:#7b85a0"></i>';
}

// ── Set Progress ──────────────────────────────────────────────
function setProgress(pct, text) {
  progressFill.style.width = pct + '%';
  progressText.textContent = text;
}

// ── Show / Hide UI states ─────────────────────────────────────
function resetOutput() {
  resultCard.classList.remove('show');
  errorCard.classList.remove('show');
  progressWrap.classList.remove('show');
  outputBlob = null;
  outputName = '';
}

function showError(msg) {
  progressWrap.classList.remove('show');
  errorCard.classList.add('show');
  errorMsg.textContent = msg;
}

function showResult(origBytes, newBlob, filename) {
  outputBlob = newBlob;
  outputName = filename;

  progressWrap.classList.remove('show');
  origSizeEl.textContent = formatBytes(origBytes);
  newSizeEl.textContent  = formatBytes(newBlob.size);
  resultCard.classList.add('show');
}

// ── Validate Resize Button ────────────────────────────────────
function checkCanResize() {
  resizeBtn.disabled = !(selectedFile && targetSizeInput.value > 0);
}

// ── File Selection ────────────────────────────────────────────
function handleFile(file) {
  // Validate type
  const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
  if (!allowed.includes(file.type)) {
    alert('❌ Unsupported file type.\nAllowed: JPG, PNG, WEBP, PDF');
    return;
  }

  selectedFile = file;
  resetOutput();

  // Show preview
  previewIcon.innerHTML = fileIcon(file);
  previewName.textContent = file.name;
  previewMeta.textContent = `${formatBytes(file.size)} · ${fileTypeLabel(file)}`;
  filePreview.classList.add('show');
  checkCanResize();
}

// ── Remove File ───────────────────────────────────────────────
removeBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.remove('show');
  resetOutput();
  checkCanResize();
});

// ── Drag & Drop ───────────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('active');
});
['dragleave','dragend'].forEach(evt =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove('active'))
);
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ── Click-to-browse ───────────────────────────────────────────
dropZone.addEventListener('click', (e) => {
  if (!e.target.closest('.btn-outline')) fileInput.click();
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// ── Unit Toggle ───────────────────────────────────────────────
unitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    unitBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedUnit = btn.dataset.unit;
  });
});

// ── Quick Hints ───────────────────────────────────────────────
hints.forEach(h => {
  h.addEventListener('click', () => {
    const kb = parseInt(h.dataset.kb);
    if (kb >= 1024) {
      // switch to MB
      unitBtns.forEach(b => b.classList.remove('active'));
      document.querySelector('.unit-btn[data-unit="MB"]').classList.add('active');
      selectedUnit = 'MB';
      targetSizeInput.value = (kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1);
    } else {
      unitBtns.forEach(b => b.classList.remove('active'));
      document.querySelector('.unit-btn[data-unit="KB"]').classList.add('active');
      selectedUnit = 'KB';
      targetSizeInput.value = kb;
    }
    checkCanResize();
  });
});

// ── Target Input ──────────────────────────────────────────────
targetSizeInput.addEventListener('input', checkCanResize);

// ══════════════════════════════════════════════════════════════
//  IMAGE RESIZE
//  Uses Canvas API + binary-search on quality to hit target size
// ══════════════════════════════════════════════════════════════
function resizeImage(file, targetBytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');

        // ── Step 1: if image is already within 5% of target, just encode ──
        if (file.size <= targetBytes * 1.05) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
          return;
        }

        // ── Step 2: Scale down dimensions first if file >> target ──
        let scale = 1;
        const ratio = targetBytes / file.size;
        if (ratio < 0.5) {
          // sqrt because area ∝ scale²
          scale = Math.sqrt(ratio) * 1.2; // slight over-estimate, quality will handle rest
          scale = Math.max(0.1, Math.min(scale, 1));
        }

        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        // ── Step 3: Binary-search quality ──────────────────────────────────
        let lo = 0.01, hi = 0.99, best = null;
        const ITERS = 14;

        for (let i = 0; i < ITERS; i++) {
          const mid = (lo + hi) / 2;
          const blob = await canvasToBlob(canvas, 'image/jpeg', mid);
          setProgress(20 + Math.round((i / ITERS) * 70), `Optimizing quality… (pass ${i+1})`);

          if (blob.size <= targetBytes) {
            best = blob;
            lo = mid;  // try higher quality (bigger size ok if still under target)
          } else {
            hi = mid;  // too big, reduce quality
          }
          if (hi - lo < 0.01) break; // converged
        }

        if (!best) {
          // Couldn't reach target — return smallest possible
          best = await canvasToBlob(canvas, 'image/jpeg', lo);
        }

        resolve(best);
      };
      img.onerror = () => reject(new Error('Could not load image.'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

// ══════════════════════════════════════════════════════════════
//  PDF RESIZE
//  PDF.js renders pages to canvas → jsPDF packs them back
//  Binary-search on render scale to hit target size
// ══════════════════════════════════════════════════════════════
async function resizePDF(file, targetBytes) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdfDoc.numPages;

  // ── Estimate starting scale ──────────────────────────────────
  const sizeRatio = targetBytes / file.size;
  // Linear approximation: reducing scale² reduces rendered image size
  let startScale = Math.sqrt(sizeRatio) * 1.1;
  startScale = Math.max(0.3, Math.min(startScale, 2.0));

  let lo = 0.2, hi = 2.0, best = null;
  const ITERS = 8;

  for (let iter = 0; iter < ITERS; iter++) {
    const scale = (lo + hi) / 2;
    setProgress(10 + Math.round((iter / ITERS) * 75), `Rendering PDF (pass ${iter+1})…`);

    const blob = await renderPDFAtScale(pdfDoc, totalPages, scale);

    if (blob.size <= targetBytes) {
      best = blob;
      lo = scale; // try higher scale (better quality but still under limit)
    } else {
      hi = scale; // too big, reduce scale
    }
    if (hi - lo < 0.05) break;
  }

  if (!best) {
    best = await renderPDFAtScale(pdfDoc, totalPages, lo);
  }

  return best;
}

async function renderPDFAtScale(pdfDoc, totalPages, scale) {
  const { jsPDF } = window.jspdf;
  let pdf = null;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page     = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas  = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx     = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Points to mm (1pt = 0.352778mm)
    const widthMM  = viewport.width  / scale * 0.352778;
    const heightMM = viewport.height / scale * 0.352778;

    if (!pdf) {
      pdf = new jsPDF({
        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMM, heightMM]
      });
    } else {
      pdf.addPage([widthMM, heightMM], widthMM > heightMM ? 'landscape' : 'portrait');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.82);
    pdf.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM, '', 'FAST');
  }

  // Convert to Blob
  const pdfOutput = pdf.output('arraybuffer');
  return new Blob([pdfOutput], { type: 'application/pdf' });
}

// ══════════════════════════════════════════════════════════════
//  MAIN: Resize Button Click
// ══════════════════════════════════════════════════════════════
resizeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const targetBytes = getTargetBytes();
  if (!targetBytes) {
    alert('Please enter a valid target size.');
    return;
  }

  // Reset UI
  resetOutput();
  progressWrap.classList.add('show');
  setProgress(5, 'Starting…');
  resizeBtn.disabled = true;

  try {
    let blob;
    const isImage = selectedFile.type.startsWith('image/');
    const isPDF   = selectedFile.type === 'application/pdf';

    if (isImage) {
      setProgress(10, 'Reading image…');
      blob = await resizeImage(selectedFile, targetBytes);
    } else if (isPDF) {
      setProgress(10, 'Reading PDF…');
      blob = await resizePDF(selectedFile, targetBytes);
    } else {
      throw new Error('Unsupported file type.');
    }

    setProgress(100, 'Done!');

    // Build output filename
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
    const ext      = isImage ? 'jpg' : 'pdf';
    outputName     = `${baseName}_resized.${ext}`;

    // Warn if we couldn't reach target
    if (blob.size > targetBytes) {
      const pct = ((blob.size / targetBytes - 1) * 100).toFixed(0);
      errorCard.classList.add('show');
      errorMsg.textContent = `⚠️ Could not reach target size exactly. Result is ~${pct}% larger. Try a bigger target or a lower quality.`;
    }

    showResult(selectedFile.size, blob, outputName);
  } catch (err) {
    showError('❌ ' + (err.message || 'Resize failed. Please try again.'));
  } finally {
    resizeBtn.disabled = false;
  }
});

// ══════════════════════════════════════════════════════════════
//  DOWNLOAD
// ══════════════════════════════════════════════════════════════
downloadBtn.addEventListener('click', () => {
  if (!outputBlob) return;

  const url = URL.createObjectURL(outputBlob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = outputName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL after 30s
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});
