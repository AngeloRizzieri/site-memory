// Site Memory — PDF Viewer Script
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('src/pdf/pdf.worker.min.js');

// ── State ─────────────────────────────────────────────────────────────────────
let pdfDoc      = null;
let currentPage = 1;
let scale       = 1.3;
let selectedText = '';
let selectedPageNum = 1;
let pendingHighlight = null; // { id, pageNum } waiting for note modal

const renderedPages = new Set();
const pageWrappers  = []; // index 0 = page 1

// ── DOM ───────────────────────────────────────────────────────────────────────
const viewer      = document.getElementById('viewer');
const loadingEl   = document.getElementById('loadingState');
const errorEl     = document.getElementById('errorState');
const errorMsgEl  = document.getElementById('errorMsg');
const titleEl     = document.getElementById('title');
const pageNumIn   = document.getElementById('pageNum');
const totalPagesEl = document.getElementById('totalPages');
const hlPopup     = document.getElementById('hlPopup');
const zoomLabelEl = document.getElementById('zoomLabel');
const noteModal   = document.getElementById('noteModal');
const noteTextarea = document.getElementById('noteTextarea');

// ── Get PDF URL from query params ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const rawUrl = params.get('file');
const pdfUrl = rawUrl ? decodeURIComponent(rawUrl) : null;

if (!pdfUrl) {
  showError('No PDF file specified.');
} else {
  loadPDF(pdfUrl);
}

// ── Load PDF ──────────────────────────────────────────────────────────────────
async function loadPDF(url) {
  try {
    const fileName = decodeURIComponent(url.split('/').pop().split('?')[0]);
    titleEl.textContent = fileName;
    document.title = fileName + ' — Site Memory';

    pdfDoc = await pdfjsLib.getDocument(url).promise;
    totalPagesEl.textContent = pdfDoc.numPages;
    pageNumIn.max = pdfDoc.numPages;

    loadingEl.remove();
    await initPages();
    updateNavButtons();
    updateZoomLabel();
  } catch (err) {
    console.error('PDF load error:', err);
    showError(err.message || 'Failed to load. For local files, enable "Allow access to file URLs" on the extension settings page.');
  }
}

// ── Create wrappers for all pages, lazy-render via IntersectionObserver ───────
async function initPages() {
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.dataset.page = i;
    wrapper.innerHTML = `<div class="page-placeholder"><span class="placeholder-label">Page ${i}</span></div>`;
    viewer.appendChild(wrapper);
    pageWrappers.push(wrapper);
  }

  // Render first 2 pages immediately for fast startup
  await renderPage(1);
  if (pdfDoc.numPages > 1) await renderPage(2);

  // Lazy-render the rest as they approach the viewport
  if (pdfDoc.numPages > 2) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const n = parseInt(entry.target.dataset.page);
          if (!renderedPages.has(n)) renderPage(n);
        }
      });
    }, { rootMargin: '600px' });

    for (let i = 3; i <= pdfDoc.numPages; i++) {
      observer.observe(pageWrappers[i - 1]);
    }
  }

  // Track current page by scroll position
  window.addEventListener('scroll', throttle(syncCurrentPage, 120), { passive: true });
}

// ── Render a single page into its wrapper ─────────────────────────────────────
async function renderPage(pageNum) {
  if (renderedPages.has(pageNum)) return;
  renderedPages.add(pageNum);

  const wrapper = pageWrappers[pageNum - 1];
  if (!wrapper) return;

  const page     = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  // Canvas
  const canvas  = document.createElement('canvas');
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  // Highlight overlay layer (restored highlights drawn here)
  const hlLayer = document.createElement('div');
  hlLayer.className = 'hl-layer';
  hlLayer.style.width  = viewport.width  + 'px';
  hlLayer.style.height = viewport.height + 'px';

  // Text layer (transparent spans for selection)
  const textLayer = document.createElement('div');
  textLayer.className = 'text-layer';
  textLayer.style.width  = viewport.width  + 'px';
  textLayer.style.height = viewport.height + 'px';

  const textContent = await page.getTextContent();
  buildTextLayer(textContent, textLayer, viewport);
  textLayer.addEventListener('mouseup', (e) => onTextSelect(e, pageNum));

  // Assemble page container
  const container = document.createElement('div');
  container.className = 'page-container';
  container.style.width  = viewport.width  + 'px';
  container.style.height = viewport.height + 'px';
  container.appendChild(canvas);
  container.appendChild(hlLayer);
  container.appendChild(textLayer);

  wrapper.innerHTML = '';
  wrapper.appendChild(container);

  // Draw any saved highlights for this page
  await restoreHighlights(pageNum, textContent, hlLayer, viewport);
}

// ── Build transparent text spans (for mouse selection) ────────────────────────
// Coordinate math:
//   Util.transform(viewport.transform, item.transform) gives tx where:
//   tx[4] = x in screen pixels (left)
//   tx[5] = y in screen pixels from TOP of container (baseline)
//   fontSize = |tx[3]| = scale * font-size-in-points
//   character top = tx[5] - fontSize
function buildTextLayer(textContent, layer, viewport) {
  for (const item of textContent.items) {
    if (!item.str) continue;
    const span = document.createElement('span');
    span.textContent = item.str;

    const tx       = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontSize = Math.abs(tx[3]);                 // scale × font size (px)

    span.style.left     = tx[4] + 'px';
    span.style.top      = (tx[5] - fontSize) + 'px'; // baseline minus cap height
    span.style.fontSize = fontSize + 'px';
    span.style.fontFamily = 'sans-serif';

    layer.appendChild(span);
  }
}

// ── Draw saved highlights as overlays ─────────────────────────────────────────
async function restoreHighlights(pageNum, textContent, hlLayer, viewport) {
  const result = await chrome.storage.local.get(['site_memory_data']);
  const data   = (result.site_memory_data) || { highlights: [] };

  const saved = data.highlights.filter(
    h => h.isPdf && h.pdfPage === pageNum && h.pageId === pdfUrl
  );
  if (!saved.length) return;

  for (const hl of saved) {
    for (const item of textContent.items) {
      const str = item.str.trim();
      if (str.length < 2) continue;
      if (!hl.text.includes(str)) continue;

      const tx       = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontSize = Math.abs(tx[3]);
      const width    = item.width ? item.width * scale : fontSize * str.length * 0.55;

      const overlay = document.createElement('div');
      overlay.className = 'hl-overlay';
      overlay.style.cssText = `
        left: ${tx[4]}px;
        top: ${tx[5] - fontSize}px;
        width: ${Math.max(width, 4)}px;
        height: ${fontSize * 1.1}px;
        background: ${hl.color};
        opacity: 0.32;
      `;
      hlLayer.appendChild(overlay);
    }
  }
}

// ── Text selection handler ────────────────────────────────────────────────────
function onTextSelect(e, pageNum) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) { hidePopup(); return; }

  const text = sel.toString().trim();
  if (text.length < 2) { hidePopup(); return; }

  selectedText    = text;
  selectedPageNum = pageNum;

  const range = sel.getRangeAt(0);
  const rect  = range.getBoundingClientRect();
  const pw    = 176; // approx popup width

  let left = rect.left + rect.width / 2 - pw / 2;
  let top  = rect.top - 44;
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  if (top < 54) top = rect.bottom + 8;

  hlPopup.style.left = left + 'px';
  hlPopup.style.top  = top  + 'px';
  hlPopup.classList.add('visible');
}

// ── Color picker → save highlight ────────────────────────────────────────────
hlPopup.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!selectedText) return;
    const color = btn.dataset.color;
    hidePopup();
    window.getSelection()?.removeAllRanges();
    await saveHighlight(selectedText, color, selectedPageNum);
  });
});

async function saveHighlight(text, color, pageNum) {
  const id = 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

  const highlight = {
    id, text, color, note: '',
    pageId:    pdfUrl,
    pageTitle: titleEl.textContent,
    url:       window.location.href,
    favicon:   '',
    createdAt: Date.now(),
    isPdf:     true,
    pdfPage:   pageNum
  };

  // Persist
  const result = await chrome.storage.local.get(['site_memory_data']);
  const data   = result.site_memory_data || { highlights: [] };
  data.highlights.push(highlight);
  await chrome.storage.local.set({ site_memory_data: data });

  // Draw overlay immediately on the already-rendered page
  const wrapper  = pageWrappers[pageNum - 1];
  const hlLayer  = wrapper?.querySelector('.hl-layer');
  if (hlLayer) {
    const page     = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      const str = item.str.trim();
      if (str.length < 2 || !text.includes(str)) continue;

      const tx       = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontSize = Math.abs(tx[3]);
      const width    = item.width ? item.width * scale : fontSize * str.length * 0.55;

      const overlay = document.createElement('div');
      overlay.className = 'hl-overlay';
      overlay.dataset.hlId = id;
      overlay.style.cssText = `
        left: ${tx[4]}px;
        top: ${tx[5] - fontSize}px;
        width: ${Math.max(width, 4)}px;
        height: ${fontSize * 1.1}px;
        background: ${color};
        opacity: 0.32;
      `;
      hlLayer.appendChild(overlay);
    }
  }

  // Open note modal
  pendingHighlight = { id, pageNum };
  showNoteModal();
}

// ── Note modal ────────────────────────────────────────────────────────────────
function showNoteModal() {
  noteTextarea.value = '';
  noteModal.classList.add('visible');
  setTimeout(() => noteTextarea.focus(), 60);
}

function hideNoteModal() {
  noteModal.classList.remove('visible');
  pendingHighlight = null;
}

document.getElementById('noteBackdrop').addEventListener('click', hideNoteModal);
document.getElementById('noteCancelBtn').addEventListener('click', hideNoteModal);

document.getElementById('noteSaveBtn').addEventListener('click', async () => {
  if (!pendingHighlight) { hideNoteModal(); return; }
  const note = noteTextarea.value.trim();
  if (note) {
    const result = await chrome.storage.local.get(['site_memory_data']);
    const data   = result.site_memory_data || { highlights: [] };
    const hl     = data.highlights.find(h => h.id === pendingHighlight.id);
    if (hl) {
      hl.note = note;
      await chrome.storage.local.set({ site_memory_data: data });
    }
  }
  hideNoteModal();
  showToast('Saved');
});

noteTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('noteSaveBtn').click(); }
  if (e.key === 'Escape') hideNoteModal();
});

// ── Popup hide ────────────────────────────────────────────────────────────────
function hidePopup() {
  hlPopup.classList.remove('visible');
  selectedText = '';
}

document.addEventListener('mousedown', (ev) => {
  if (!ev.target.closest('.hl-popup') && !ev.target.closest('.text-layer')) {
    hidePopup();
  }
});

// ── Scroll-based current page tracking ───────────────────────────────────────
function syncCurrentPage() {
  if (!pdfDoc) return;
  const mid = window.scrollY + window.innerHeight / 2;
  let closest = 1, closestDist = Infinity;

  pageWrappers.forEach((w, i) => {
    const top = w.getBoundingClientRect().top + window.scrollY;
    const dist = Math.abs(top + w.offsetHeight / 2 - mid);
    if (dist < closestDist) { closestDist = dist; closest = i + 1; }
  });

  if (closest !== currentPage) {
    currentPage = closest;
    pageNumIn.value = currentPage;
    updateNavButtons();
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
document.getElementById('nextPage').addEventListener('click', () => goToPage(currentPage + 1));

pageNumIn.addEventListener('change', () => {
  const n = parseInt(pageNumIn.value);
  if (n >= 1 && n <= (pdfDoc?.numPages || 1)) goToPage(n);
});

function goToPage(n) {
  if (!pdfDoc || n < 1 || n > pdfDoc.numPages) return;
  const wrapper = pageWrappers[n - 1];
  if (!wrapper) return;
  const top = wrapper.getBoundingClientRect().top + window.scrollY - 54;
  window.scrollTo({ top, behavior: 'smooth' });
}

function updateNavButtons() {
  document.getElementById('prevPage').disabled = currentPage <= 1;
  document.getElementById('nextPage').disabled = !pdfDoc || currentPage >= pdfDoc.numPages;
}

// ── Zoom ──────────────────────────────────────────────────────────────────────
document.getElementById('zoomIn').addEventListener('click',  () => applyScale(Math.min(3.0, scale + 0.2)));
document.getElementById('zoomOut').addEventListener('click', () => applyScale(Math.max(0.4, scale - 0.2)));

document.getElementById('fitWidth').addEventListener('click', async () => {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(currentPage);
  const vp1  = page.getViewport({ scale: 1 });
  applyScale((window.innerWidth - 40) / vp1.width);
});

function applyScale(newScale) {
  scale = parseFloat(newScale.toFixed(2));
  updateZoomLabel();

  // Re-render all previously rendered pages at new scale
  const was = new Set(renderedPages);
  renderedPages.clear();

  pageWrappers.forEach((w, i) => {
    w.innerHTML = `<div class="page-placeholder"><span class="placeholder-label">Page ${i + 1}</span></div>`;
  });

  // Re-render visible pages + a couple around current
  const start = Math.max(1, currentPage - 1);
  const end   = Math.min(pdfDoc?.numPages || 1, currentPage + 2);
  for (let i = start; i <= end; i++) renderPage(i);

  // Others that were rendered (IntersectionObserver will catch them as they scroll in)
  was.forEach(n => {
    if (n < start || n > end) {
      const wrapper = pageWrappers[n - 1];
      if (wrapper) {
        // observe so IntersectionObserver can re-render
      }
    }
  });
}

function updateZoomLabel() {
  zoomLabelEl.textContent = Math.round(scale * 100) + '%';
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(currentPage + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goToPage(currentPage - 1);
  if (e.key === 'Escape') { hidePopup(); hideNoteModal(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    applyScale(Math.min(3.0, scale + 0.2));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    applyScale(Math.max(0.4, scale - 0.2));
  }
});

// ── Error ─────────────────────────────────────────────────────────────────────
function showError(msg) {
  loadingEl?.remove();
  viewer.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorMsgEl.textContent = msg;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ── Throttle helper ───────────────────────────────────────────────────────────
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}
