// Main content script entry point
(async function initSiteMemory() {
  console.log('[Site Memory] Initializing on:', getCurrentHostname());

  // Render existing highlights when page loads
  await HighlightRenderer.renderAllHighlights();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Site Memory] Received message:', message.type);

    switch (message.type) {
      case MESSAGE_TYPES.CONTEXT_MENU_SAVE:
        // Save the current selection
        SelectionHandler.saveCurrentSelection()
          .then(result => {
            sendResponse(result);
          });
        return true; // Keep channel open for async response

      case MESSAGE_TYPES.GET_HIGHLIGHTS:
        // Return highlights for current hostname
        StorageManager.getHighlightsByHostname(getCurrentHostname())
          .then(highlights => {
            sendResponse({ highlights });
          });
        return true;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  });

  // Add click handler for highlights (for future sidebar integration)
  document.addEventListener('click', (e) => {
    const highlight = e.target.closest('.site-memory-highlight');
    if (highlight) {
      const id = highlight.dataset.highlightId;
      console.log('[Site Memory] Highlight clicked:', id);
      // Future: Open sidebar or show note
    }
  });

  console.log('[Site Memory] Ready');
})();