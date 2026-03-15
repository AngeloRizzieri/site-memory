// PDF Viewer Script
// Set worker path to local file
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('src/pdf/pdf.worker.min.js');

// State
let pdfDoc = null;
let currentPage = 1;
let scale = 1.3;
let selectedText = '';
let selectedColor = '#facc15';

// DOM elements
const viewer = document.getElementById('viewer');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMsg = document.getElementById('errorMsg');
const titleEl = document.getElementById('title');
const pageNumInput = document.getElementById('pageNum');
const totalPagesEl = document.getElementById('totalPages');
const hlPopup = document.getElementById('hlPopup');
const zoomLabel = document.getElementById('zoomLabel');

// Get PDF URL from query params
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('file');

if (!pdfUrl) {
  showError('No PDF URL provided.');
} else {
  loadPDF(decodeURIComponent(pdfUrl));
}

// Load PDF
async function loadPDF(url) {
  try {
    // Set title
    const fileName = url.split('/').pop().split('?')[0];
    titleEl.textContent = decodeURIComponent(fileName);
    document.title = decodeURIComponent(fileName) + ' - Site Memory';
    
    // Load document
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    
    totalPagesEl.textContent = pdfDoc.numPages;
    pageNumInput.max = pdfDoc.numPages;
    
    // Hide loading, render first page
    loading.classList.add('hidden');
    await renderPage(1);
    updateZoomLabel();
    updateNavButtons();
    
  } catch (err) {
    console.error('PDF load error:', err);
    showError(err.message || 'Failed to load PDF. Make sure "Allow access to file URLs" is enabled for local files.');
  }
}

// Show error
function showError(msg) {
  loading.classList.add('hidden');
  error.classList.remove('hidden');
  viewer.classList.add('hidden');
  errorMsg.textContent = msg;
}

// Render a page
async function renderPage(pageNum) {
  currentPage = pageNum;
  pageNumInput.value = pageNum;

  // Scroll back to top when changing pages
  window.scrollTo({ top: 0, behavior: 'instant' });

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  // Remove existing page container
  const existing = document.querySelector('.page-container');
  if (existing) existing.remove();
  
  // Create container
  const container = document.createElement('div');
  container.className = 'page-container';
  container.style.width = viewport.width + 'px';
  container.style.height = viewport.height + 'px';
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  container.appendChild(canvas);
  
  // Create text layer
  const textLayer = document.createElement('div');
  textLayer.className = 'text-layer';
  textLayer.style.width = viewport.width + 'px';
  textLayer.style.height = viewport.height + 'px';
  container.appendChild(textLayer);
  
  viewer.appendChild(container);
  
  // Render page to canvas
  const ctx = canvas.getContext('2d');
  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;
  
  // Get text content and render text layer
  const textContent = await page.getTextContent();
  
  // Render text spans
  for (const item of textContent.items) {
    const span = document.createElement('span');
    span.textContent = item.str;
    
    // Calculate position
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
    
    span.style.left = tx[4] + 'px';
    span.style.top = (viewport.height - tx[5] - fontSize) + 'px';
    span.style.fontSize = fontSize + 'px';
    span.style.fontFamily = 'sans-serif';
    
    textLayer.appendChild(span);
  }
  
  // Setup text selection handling
  textLayer.addEventListener('mouseup', handleTextSelection);
}

// Handle text selection
function handleTextSelection(e) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hidePopup();
    return;
  }
  
  const text = selection.toString().trim();
  if (text.length < 2) {
    hidePopup();
    return;
  }
  
  selectedText = text;

  // Show popup near selection, clamped within viewport
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const popupWidth = 200;
  let left = rect.left + rect.width / 2 - popupWidth / 2;
  let top = rect.top - 52;
  left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));
  if (top < 60) top = rect.bottom + 8;

  hlPopup.style.left = left + 'px';
  hlPopup.style.top = top + 'px';
  hlPopup.classList.add('visible');
}

// Hide popup
function hidePopup() {
  hlPopup.classList.remove('visible');
  selectedText = '';
}

// Color buttons
hlPopup.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    hlPopup.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedColor = btn.dataset.color;
  });
});

// Save highlight
document.getElementById('saveHighlight').addEventListener('click', async () => {
  if (!selectedText) return;
  
  const highlight = {
    id: 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    text: selectedText,
    color: selectedColor,
    note: '',
    pageId: pdfUrl,
    pageTitle: titleEl.textContent,
    url: window.location.href,
    favicon: '',
    createdAt: Date.now(),
    isPdf: true,
    pdfPage: currentPage
  };
  
  // Save to storage
  chrome.storage.local.get(['site_memory_data'], (result) => {
    const data = result.site_memory_data || { highlights: [] };
    data.highlights.push(highlight);
    chrome.storage.local.set({ site_memory_data: data }, () => {
      showToast('✓ Highlight saved!');
      hidePopup();
      window.getSelection().removeAllRanges();
    });
  });
});

// Navigation
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');

function updateNavButtons() {
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = !pdfDoc || currentPage >= pdfDoc.numPages;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) renderPage(currentPage - 1).then(updateNavButtons);
});

nextBtn.addEventListener('click', () => {
  if (pdfDoc && currentPage < pdfDoc.numPages) renderPage(currentPage + 1).then(updateNavButtons);
});

pageNumInput.addEventListener('change', () => {
  const num = parseInt(pageNumInput.value);
  if (num >= 1 && num <= pdfDoc.numPages) {
    renderPage(num).then(updateNavButtons);
  }
});

// Zoom
function updateZoomLabel() {
  zoomLabel.textContent = Math.round(scale * 100) + '%';
}

document.getElementById('zoomIn').addEventListener('click', () => {
  scale = Math.min(3, scale + 0.2);
  updateZoomLabel();
  renderPage(currentPage);
});

document.getElementById('zoomOut').addEventListener('click', () => {
  scale = Math.max(0.5, scale - 0.2);
  updateZoomLabel();
  renderPage(currentPage);
});

// Hide popup on click outside
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.hl-popup') && !e.target.closest('.text-layer')) {
    hidePopup();
  }
});

// Toast
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 2500);
}
