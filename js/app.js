/**
 * FileSlim – app.js
 * Mode 1: Resize (Image / PDF)
 * Mode 2: Images → PDF (multi-image merge with drag-reorder)
 */

// ── PDF.js worker ────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ════════════════════════════════════════════════════════════
//  MODE SWITCHING
// ════════════════════════════════════════════════════════════
const modeTabs    = document.querySelectorAll('.mode-tab');
const panelResize = document.getElementById('panel-resize');
const panelMerge  = document.getElementById('panel-merge');

modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.dataset.mode;
    if (mode === 'resize') {
      panelResize.classList.remove('hidden');
      panelMerge.classList.add('hidden');
    } else {
      panelResize.classList.add('hidden');
      panelMerge.classList.remove('hidden');
    }
  });
});

// ════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ════════════════════════════════════════════════════════════
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ════════════════════════════════════════════════════════════
//  MODE 1 — RESIZE
// ════════════════════════════════════════════════════════════
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const filePreview     = document.getElementById('filePreview');
const previewIcon     = document.getElementById('previewIcon');
const previewName     = document.getElementById('previewName');
const previewMeta     = document.getElementById('previewMeta');
const removeBtn       = document.getElementById('removeBtn');
const targetSizeInput = document.getElementById('targetSize');
const unitBtns        = document.querySelectorAll('.unit-btn');
const hints           = document.querySelectorAll('.hint');
const resizeBtn       = document.getElementById('resizeBtn');
const progressWrap    = document.getElementById('progressWrap');
const progressFill    = document.getElementById('progressFill');
const progressText    = document.getElementById('progressText');
const resultCard      = document.getElementById('resultCard');
const origSizeEl      = document.getElementById('origSize');
const newSizeEl       = document.getElementById('newSize');
const downloadBtn     = document.getElementById('downloadBtn');
const errorCard       = document.getElementById('errorCard');
const errorMsg        = document.getElementById('errorMsg');

let selectedFile = null;
let selectedUnit = 'KB';
let outputBlob   = null;
let outputName   = '';

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

function setProgress(pct, text) {
  progressFill.style.width = pct + '%';
  progressText.textContent = text;
}

function resetOutput() {
  resultCard.classList.remove('show');
  errorCard.classList.remove('show');
  progressWrap.classList.remove('show');
  outputBlob = null; outputName = '';
}

function showError(msg) {
  progressWrap.classList.remove('show');
  errorCard.classList.add('show');
  errorMsg.textContent = msg;
}

function showResult(origBytes, newBlob, filename) {
  outputBlob = newBlob; outputName = filename;
  progressWrap.classList.remove('show');
  origSizeEl.textContent = formatBytes(origBytes);
  newSizeEl.textContent  = formatBytes(newBlob.size);
  resultCard.classList.add('show');
}

function checkCanResize() {
  resizeBtn.disabled = !(selectedFile && targetSizeInput.value > 0);
}

function handleFile(file) {
  const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
  if (!allowed.includes(file.type)) {
    alert('❌ Unsupported file type.\nAllowed: JPG, PNG, WEBP, PDF');
    return;
  }
  selectedFile = file;
  resetOutput();
  previewIcon.innerHTML = fileIcon(file);
  previewName.textContent = file.name;
  previewMeta.textContent = `${formatBytes(file.size)} · ${fileTypeLabel(file)}`;
  filePreview.classList.add('show');
  checkCanResize();
}

removeBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.remove('show');
  resetOutput();
  checkCanResize();
});

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('active'); });
['dragleave','dragend'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.remove('active')));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('active');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', e => { if (!e.target.closest('.btn-outline')) fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

unitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    unitBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedUnit = btn.dataset.unit;
  });
});

hints.forEach(h => {
  h.addEventListener('click', () => {
    const kb = parseInt(h.dataset.kb);
    if (kb >= 1024) {
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

targetSizeInput.addEventListener('input', checkCanResize);

function getTargetBytes() {
  const val = parseFloat(targetSizeInput.value);
  if (!val || val <= 0) return null;
  return selectedUnit === 'KB' ? val * 1024 : val * 1024 * 1024;
}

// ── Image Resize (canvas + binary search) ───────────────────
function resizeImage(file, targetBytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        if (file.size <= targetBytes * 1.05) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
          return;
        }
        let scale = 1;
        const ratio = targetBytes / file.size;
        if (ratio < 0.5) { scale = Math.max(0.1, Math.min(Math.sqrt(ratio) * 1.2, 1)); }
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        let lo = 0.01, hi = 0.99, best = null;
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2;
          const blob = await canvasToBlob(canvas, 'image/jpeg', mid);
          setProgress(20 + Math.round((i / 14) * 70), `Optimizing… pass ${i+1}`);
          if (blob.size <= targetBytes) { best = blob; lo = mid; } else { hi = mid; }
          if (hi - lo < 0.01) break;
        }
        if (!best) best = await canvasToBlob(canvas, 'image/jpeg', lo);
        resolve(best);
      };
      img.onerror = () => reject(new Error('Could not load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

// ── PDF Resize (PDF.js + jsPDF) ─────────────────────────────
async function resizePDF(file, targetBytes) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdfDoc.numPages;
  let lo = 0.2, hi = 2.0, best = null;
  for (let iter = 0; iter < 8; iter++) {
    const scale = (lo + hi) / 2;
    setProgress(10 + Math.round((iter / 8) * 75), `Rendering PDF pass ${iter+1}…`);
    const blob = await renderPDFAtScale(pdfDoc, totalPages, scale);
    if (blob.size <= targetBytes) { best = blob; lo = scale; } else { hi = scale; }
    if (hi - lo < 0.05) break;
  }
  if (!best) best = await renderPDFAtScale(pdfDoc, totalPages, lo);
  return best;
}

async function renderPDFAtScale(pdfDoc, totalPages, scale) {
  const { jsPDF } = window.jspdf;
  let pdf = null;
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const wMM = viewport.width / scale * 0.352778;
    const hMM = viewport.height / scale * 0.352778;
    if (!pdf) {
      pdf = new jsPDF({ orientation: wMM > hMM ? 'landscape' : 'portrait', unit: 'mm', format: [wMM, hMM] });
    } else {
      pdf.addPage([wMM, hMM], wMM > hMM ? 'landscape' : 'portrait');
    }
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, wMM, hMM, '', 'FAST');
  }
  return new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
}

// ── Resize Button ────────────────────────────────────────────
resizeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  const targetBytes = getTargetBytes();
  if (!targetBytes) { alert('Please enter a valid target size.'); return; }
  resetOutput();
  progressWrap.classList.add('show');
  setProgress(5, 'Starting…');
  resizeBtn.disabled = true;
  try {
    let blob;
    const isImage = selectedFile.type.startsWith('image/');
    const isPDF   = selectedFile.type === 'application/pdf';
    if (isImage) { setProgress(10, 'Reading image…'); blob = await resizeImage(selectedFile, targetBytes); }
    else if (isPDF) { setProgress(10, 'Reading PDF…'); blob = await resizePDF(selectedFile, targetBytes); }
    else throw new Error('Unsupported file type.');
    setProgress(100, 'Done!');
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
    outputName = `${baseName}_resized.${isImage ? 'jpg' : 'pdf'}`;
    if (blob.size > targetBytes) {
      const pct = ((blob.size / targetBytes - 1) * 100).toFixed(0);
      errorCard.classList.add('show');
      errorMsg.textContent = `⚠️ Could not reach exact target. Result is ~${pct}% larger. Try a bigger limit.`;
    }
    showResult(selectedFile.size, blob, outputName);
  } catch(err) {
    showError('❌ ' + (err.message || 'Resize failed.'));
  } finally {
    resizeBtn.disabled = false;
  }
});

downloadBtn.addEventListener('click', () => {
  if (outputBlob) triggerDownload(outputBlob, outputName);
});

// ════════════════════════════════════════════════════════════
//  MODE 2 — IMAGES → PDF
// ════════════════════════════════════════════════════════════
const mergeDropZone      = document.getElementById('mergeDropZone');
const mergeFileInput     = document.getElementById('mergeFileInput');
const imgQueue           = document.getElementById('imgQueue');
const queueActions       = document.getElementById('queueActions');
const queueCount         = document.getElementById('queueCount');
const clearAllBtn        = document.getElementById('clearAllBtn');
const pdfFilenameInput   = document.getElementById('pdfFilename');
const pageSizeSelect     = document.getElementById('pageSize');
const imgQualitySlider   = document.getElementById('imgQuality');
const qualityVal         = document.getElementById('qualityVal');
const orientBtns         = document.querySelectorAll('.orient-btn');
const mergeBtn           = document.getElementById('mergeBtn');
const mergeProgressWrap  = document.getElementById('mergeProgressWrap');
const mergeProgressFill  = document.getElementById('mergeProgressFill');
const mergeProgressText  = document.getElementById('mergeProgressText');
const mergeResultCard    = document.getElementById('mergeResultCard');
const mergePagesCount    = document.getElementById('mergePagesCount');
const mergePdfSize       = document.getElementById('mergePdfSize');
const mergeDownloadBtn   = document.getElementById('mergeDownloadBtn');
const mergeErrorCard     = document.getElementById('mergeErrorCard');
const mergeErrorMsg      = document.getElementById('mergeErrorMsg');

// Image queue: array of { file, dataUrl, id }
let imageQueue     = [];
let mergeBlob      = null;
let selectedOrient = 'auto';
let dragSrcId      = null; // for drag-reorder

// ── Quality slider live update ───────────────────────────────
imgQualitySlider.addEventListener('input', () => {
  qualityVal.textContent = imgQualitySlider.value + '%';
});

// ── Orientation buttons ──────────────────────────────────────
orientBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    orientBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedOrient = btn.dataset.orient;
  });
});

// ── Add images to queue ──────────────────────────────────────
async function addImagesToQueue(files) {
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  for (const file of files) {
    if (!allowed.includes(file.type)) continue;
    const dataUrl = await readFileAsDataURL(file);
    const id = Date.now() + '_' + Math.random().toString(36).slice(2);
    imageQueue.push({ file, dataUrl, id });
  }
  renderQueue();
}

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

// ── Render queue grid ────────────────────────────────────────
function renderQueue() {
  imgQueue.innerHTML = '';
  imageQueue.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.dataset.id = item.id;
    div.draggable = true;
    div.innerHTML = `
      <img src="${item.dataUrl}" alt="${item.file.name}" />
      <div class="item-order">${idx + 1}</div>
      <div class="item-overlay">
        <button class="item-remove" data-id="${item.id}">
          <i class="ph ph-x"></i> Remove
        </button>
        <span class="item-name">${item.file.name}</span>
        <span class="drag-hint"><i class="ph ph-dots-six"></i> drag to reorder</span>
      </div>
    `;

    // Remove button
    div.querySelector('.item-remove').addEventListener('click', e => {
      e.stopPropagation();
      imageQueue = imageQueue.filter(q => q.id !== item.id);
      renderQueue();
    });

    // Drag-to-reorder events
    div.addEventListener('dragstart', e => {
      dragSrcId = item.id;
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
      document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('drag-over'));
    });
    div.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('drag-over'));
      div.classList.add('drag-over');
    });
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('drag-over');
      if (dragSrcId && dragSrcId !== item.id) {
        // Reorder imageQueue
        const fromIdx = imageQueue.findIndex(q => q.id === dragSrcId);
        const toIdx   = imageQueue.findIndex(q => q.id === item.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = imageQueue.splice(fromIdx, 1);
          imageQueue.splice(toIdx, 0, moved);
          renderQueue();
        }
      }
    });

    imgQueue.appendChild(div);
  });

  // Show/hide queue actions
  if (imageQueue.length > 0) {
    queueActions.style.display = 'flex';
    queueCount.textContent = `${imageQueue.length} image${imageQueue.length > 1 ? 's' : ''} queued`;
  } else {
    queueActions.style.display = 'none';
  }

  // Enable/disable merge button
  mergeBtn.disabled = imageQueue.length === 0;

  // Reset output on queue change
  mergeResultCard.classList.remove('show');
  mergeErrorCard.classList.remove('show');
  mergeProgressWrap.classList.remove('show');
  mergeBlob = null;
}

// ── Clear All ─────────────────────────────────────────────────
clearAllBtn.addEventListener('click', () => {
  imageQueue = [];
  mergeFileInput.value = '';
  renderQueue();
});

// ── Merge Drop Zone ──────────────────────────────────────────
mergeDropZone.addEventListener('dragover', e => { e.preventDefault(); mergeDropZone.classList.add('active'); });
['dragleave','dragend'].forEach(evt => mergeDropZone.addEventListener(evt, () => mergeDropZone.classList.remove('active')));
mergeDropZone.addEventListener('drop', e => {
  e.preventDefault(); mergeDropZone.classList.remove('active');
  if (e.dataTransfer.files.length) addImagesToQueue(Array.from(e.dataTransfer.files));
});
mergeDropZone.addEventListener('click', e => { if (!e.target.closest('.btn-outline')) mergeFileInput.click(); });
mergeFileInput.addEventListener('change', () => {
  if (mergeFileInput.files.length) addImagesToQueue(Array.from(mergeFileInput.files));
});

// ── Set merge progress ────────────────────────────────────────
function setMergeProgress(pct, text) {
  mergeProgressFill.style.width = pct + '%';
  mergeProgressText.textContent = text;
}

// ════════════════════════════════════════════════════════════
//  CORE: Images → PDF conversion
// ════════════════════════════════════════════════════════════
mergeBtn.addEventListener('click', async () => {
  if (imageQueue.length === 0) return;

  // Reset output
  mergeResultCard.classList.remove('show');
  mergeErrorCard.classList.remove('show');
  mergeProgressWrap.classList.add('show');
  setMergeProgress(5, 'Starting conversion…');
  mergeBtn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const quality   = parseInt(imgQualitySlider.value) / 100;
    const pageSize  = pageSizeSelect.value;
    const orient    = selectedOrient;

    let pdf = null;

    for (let i = 0; i < imageQueue.length; i++) {
      const item = imageQueue[i];
      const pct  = 10 + Math.round((i / imageQueue.length) * 85);
      setMergeProgress(pct, `Processing image ${i + 1} of ${imageQueue.length}…`);

      // Load image to get natural dimensions
      const img = await loadImage(item.dataUrl);
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      // Determine page dimensions in mm
      let wMM, hMM, pageOrient;
      if (pageSize === 'a4') {
        wMM = 210; hMM = 297;
        pageOrient = (orient === 'auto')
          ? (naturalW > naturalH ? 'landscape' : 'portrait')
          : orient;
        if (pageOrient === 'landscape') { [wMM, hMM] = [hMM, wMM]; }
      } else if (pageSize === 'letter') {
        wMM = 215.9; hMM = 279.4;
        pageOrient = (orient === 'auto')
          ? (naturalW > naturalH ? 'landscape' : 'portrait')
          : orient;
        if (pageOrient === 'landscape') { [wMM, hMM] = [hMM, wMM]; }
      } else {
        // "fit" — page = image size (96dpi → mm)
        wMM = naturalW * 0.264583;
        hMM = naturalH * 0.264583;
        pageOrient = naturalW > naturalH ? 'landscape' : 'portrait';
        if (orient !== 'auto') {
          pageOrient = orient;
          if (orient === 'landscape' && wMM < hMM) { [wMM, hMM] = [hMM, wMM]; }
          if (orient === 'portrait'  && wMM > hMM) { [wMM, hMM] = [hMM, wMM]; }
        }
      }

      // Draw image onto canvas at high quality
      const canvas = document.createElement('canvas');
      // For fixed page sizes, scale image to fill the page proportionally
      let renderW = naturalW, renderH = naturalH;
      if (pageSize !== 'fit') {
        const pageWpx = wMM / 0.264583;
        const pageHpx = hMM / 0.264583;
        const scaleToFit = Math.min(pageWpx / naturalW, pageHpx / naturalH);
        renderW = Math.round(naturalW * scaleToFit);
        renderH = Math.round(naturalH * scaleToFit);
      }
      canvas.width = renderW; canvas.height = renderH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, renderW, renderH);
      ctx.drawImage(img, 0, 0, renderW, renderH);

      const imgData = canvas.toDataURL('image/jpeg', quality);

      // Create or add page
      if (!pdf) {
        pdf = new jsPDF({ orientation: pageOrient, unit: 'mm', format: [wMM, hMM] });
      } else {
        pdf.addPage([wMM, hMM], pageOrient);
      }

      // Center image on page (important for fixed page sizes)
      if (pageSize !== 'fit') {
        const drawWmm = renderW * 0.264583;
        const drawHmm = renderH * 0.264583;
        const xOff = (wMM - drawWmm) / 2;
        const yOff = (hMM - drawHmm) / 2;
        pdf.addImage(imgData, 'JPEG', xOff, yOff, drawWmm, drawHmm, '', 'FAST');
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, wMM, hMM, '', 'FAST');
      }
    }

    setMergeProgress(100, 'Done!');

    const pdfArrayBuffer = pdf.output('arraybuffer');
    mergeBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

    // Show result
    mergeProgressWrap.classList.remove('show');
    mergePagesCount.textContent = imageQueue.length;
    mergePdfSize.textContent    = formatBytes(mergeBlob.size);
    mergeResultCard.classList.add('show');

  } catch(err) {
    mergeProgressWrap.classList.remove('show');
    mergeErrorCard.classList.add('show');
    mergeErrorMsg.textContent = '❌ ' + (err.message || 'Conversion failed. Please try again.');
  } finally {
    mergeBtn.disabled = imageQueue.length === 0;
  }
});

// ── Download merged PDF ───────────────────────────────────────
mergeDownloadBtn.addEventListener('click', () => {
  if (!mergeBlob) return;
  const name = (pdfFilenameInput.value.trim() || 'merged_images') + '.pdf';
  triggerDownload(mergeBlob, name);
});

// ── Load image helper ─────────────────────────────────────────
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error('Image load failed'));
    img.src = src;
  });
}
