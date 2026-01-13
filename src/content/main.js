/**
 * Main entry point
 */

(function() {
  if (window._siteMemoryLoaded) return;
  window._siteMemoryLoaded = true;

  // Don't run on special pages
  const protocol = window.location.protocol;
  if (protocol === 'chrome:' || protocol === 'chrome-extension:' || protocol === 'about:') {
    return;
  }

  // Initialize when DOM is ready
  function init() {
    console.log('Site Memory: Starting...');
    
    try {
      Highlighter.init();
      Sidebar.init();
      console.log('Site Memory: Ready');
    } catch (err) {
      console.error('Site Memory: Failed to init', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
