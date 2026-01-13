/**
 * Content Script - Main Entry Point
 * Initializes all Site Memory components on the page
 */

(function() {
  'use strict';

  // Prevent double initialization
  if (window.siteMemoryInitialized) return;
  window.siteMemoryInitialized = true;

  console.log('Site Memory: Initializing...');

  /**
   * Initialize the extension
   */
  async function init() {
    try {
      // Initialize PDF handler first to detect PDF pages
      if (typeof PdfHandler !== 'undefined') {
        PdfHandler.init();
      }

      // Check if we're in a context where we can run
      if (!canRun()) {
        console.log('Site Memory: Skipping initialization for this page type');
        return;
      }

      // Initialize components
      HighlightRenderer.init();
      SelectionHandler.init();
      Sidebar.init();

      // Restore highlights for current page
      await HighlightRenderer.renderPageHighlights();

      // Listen for messages from background script
      setupMessageListener();

      console.log('Site Memory: Initialized successfully');
    } catch (error) {
      console.error('Site Memory: Initialization failed', error);
    }
  }

  /**
   * Check if we can/should run on this page
   */
  function canRun() {
    // Skip chrome:// and other special URLs
    const protocol = window.location.protocol;
    if (protocol === 'chrome:' || protocol === 'chrome-extension:' || 
        protocol === 'moz-extension:' || protocol === 'about:') {
      return false;
    }

    // Skip if we're in an iframe that's not a PDF viewer
    if (window !== window.top) {
      // Allow for PDF viewers embedded in iframes
      const isPdfFrame = document.contentType === 'application/pdf' ||
                         document.querySelector('.pdfViewer');
      if (!isPdfFrame) {
        return false;
      }
    }

    return true;
  }

  /**
   * Setup message listener for background script commands
   */
  function setupMessageListener() {
    Messaging.onMessage((message, sender) => {
      switch (message.action) {
        case 'toggleSidebar':
          Sidebar.toggle();
          return { success: true };
          
        case 'saveHighlight':
          SelectionHandler.saveCurrentSelection();
          return { success: true };
          
        case 'getPageHighlights':
          return StorageManager.getHighlightsForPage(
            UrlUtils.getPageId(window.location.href)
          );
          
        case 'refreshHighlights':
          HighlightRenderer.clearAll();
          HighlightRenderer.renderPageHighlights();
          return { success: true };
          
        default:
          return null;
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure all scripts are loaded
    setTimeout(init, 50);
  }

})();
