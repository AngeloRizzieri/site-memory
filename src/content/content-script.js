// Main content script entry point
(async function initSiteMemory() {
  console.log('[Site Memory] Initializing on:', getCurrentHostname());

  // Render existing highlights when page loads
  await HighlightRenderer.renderAllHighlights();

  // Initialize sidebar
  Sidebar.init();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Site Memory] Received message:', message.type);

    switch (message.type) {
      case MESSAGE_TYPES.CONTEXT_MENU_SAVE:
        // Show the save modal with note input
        SelectionHandler.showSaveModal();
        sendResponse({ success: true });
        return false;

      case MESSAGE_TYPES.GET_HIGHLIGHTS:
        StorageManager.getHighlightsByHostname(getCurrentHostname())
          .then(highlights => {
            sendResponse({ highlights });
          });
        return true;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  });

  // Handle clicks on highlights - show context menu
  document.addEventListener('click', (e) => {
    const highlight = e.target.closest('.site-memory-highlight');
    if (highlight) {
      e.preventDefault();
      e.stopPropagation();
      const id = highlight.dataset.highlightId;
      const note = highlight.dataset.note || '';
      HighlightRenderer.showContextMenu(id, e.clientX, e.clientY, note);
    }
  });

  // Keyboard shortcut: Ctrl+Shift+S to open sidebar
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      Sidebar.toggle();
    }
  });

  console.log('[Site Memory] Ready - Press Ctrl+Shift+S to open sidebar');
})();