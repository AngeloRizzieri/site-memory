/**
 * PDF Handler
 * Special handling for PDF documents viewed in browser
 */

const PdfHandler = {
  isPdf: false,
  pdfContainer: null,

  /**
   * Initialize PDF handling
   */
  init() {
    this.isPdf = this.detectPdf();
    
    if (this.isPdf) {
      console.log('Site Memory: PDF detected');
      this.setupPdfSupport();
    }
  },

  /**
   * Detect if current page is a PDF
   */
  detectPdf() {
    // Check document type
    if (document.contentType === 'application/pdf') {
      return true;
    }

    // Check for PDF.js viewer (Firefox)
    if (document.querySelector('#viewer.pdfViewer')) {
      return true;
    }

    // Check URL
    if (UrlUtils.isPdfUrl(window.location.href)) {
      return true;
    }

    // Check for embedded PDF
    const embed = document.querySelector('embed[type="application/pdf"]');
    if (embed) {
      return true;
    }

    return false;
  },

  /**
   * Setup PDF-specific support
   */
  setupPdfSupport() {
    // Find PDF container
    this.pdfContainer = document.querySelector('#viewer.pdfViewer') ||
                        document.querySelector('.pdfViewer') ||
                        document.body;

    // PDF.js renders pages dynamically, so we need to observe
    this.observePdfPages();

    // Override selection handler for PDFs
    this.setupPdfSelection();
  },

  /**
   * Observe PDF page loads to restore highlights
   */
  observePdfPages() {
    if (!this.pdfContainer) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if a page was loaded
            if (node.classList?.contains('page') || 
                node.querySelector?.('.page')) {
              setTimeout(() => this.restorePdfHighlights(), 100);
            }
          }
        }
      }
    });

    observer.observe(this.pdfContainer, {
      childList: true,
      subtree: true
    });
  },

  /**
   * Setup selection handling for PDFs
   */
  setupPdfSelection() {
    // PDF.js text layer handles selection differently
    document.addEventListener('mouseup', (e) => {
      if (!this.isPdf) return;
      
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      // Get the page number from the selection
      const pageNum = this.getPageNumber(selection.anchorNode);
      if (pageNum) {
        // Store page number for the selection handler
        SelectionHandler.currentPdfPage = pageNum;
      }
    });
  },

  /**
   * Get page number from a node in PDF viewer
   */
  getPageNumber(node) {
    let element = node;
    if (node.nodeType === Node.TEXT_NODE) {
      element = node.parentElement;
    }

    // Look for page container
    const pageEl = element?.closest('.page, [data-page-number]');
    if (pageEl) {
      return parseInt(pageEl.dataset.pageNumber || pageEl.id?.match(/\d+/)?.[0], 10);
    }

    return null;
  },

  /**
   * Restore highlights in PDF viewer
   */
  async restorePdfHighlights() {
    if (!this.isPdf) return;

    const pageId = UrlUtils.getPageId(window.location.href);
    const highlights = await StorageManager.getHighlightsForPage(pageId);
    
    for (const highlight of highlights) {
      if (highlight.isPdf) {
        this.renderPdfHighlight(highlight);
      }
    }
  },

  /**
   * Render a highlight in PDF viewer
   */
  renderPdfHighlight(highlight) {
    // Try to find the text in the current visible pages
    const textLayers = document.querySelectorAll('.textLayer');
    
    for (const layer of textLayers) {
      const range = DomUtils.findTextInDocument(highlight.text, layer);
      if (range) {
        DomUtils.wrapRangeWithHighlight(range, highlight.id, highlight.color);
        break;
      }
    }
  },

  /**
   * Check if highlighting is supported in this PDF viewer
   */
  isHighlightingSupported() {
    // Check if there's a text layer we can work with
    const hasTextLayer = document.querySelector('.textLayer') !== null;
    
    // Chrome's built-in PDF viewer doesn't expose text layer
    const isChromePdf = document.contentType === 'application/pdf' && 
                        !document.querySelector('.pdfViewer');

    if (isChromePdf) {
      return {
        supported: false,
        reason: 'Chrome\'s built-in PDF viewer doesn\'t support text highlighting. Try opening the PDF in a different viewer or using Firefox.'
      };
    }

    return {
      supported: hasTextLayer,
      reason: hasTextLayer ? null : 'No text layer available for highlighting'
    };
  }
};

// Make available globally
window.PdfHandler = PdfHandler;
