(async function initSiteMemory() {
  console.log('[Site Memory] Initializing on:', getCurrentHostname());

  await HighlightRenderer.renderAllHighlights();

  Sidebar.init();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Site Memory] Received message:', message.type);

    switch (message.type) {
      case MESSAGE_TYPES.CONTEXT_MENU_SAVE:
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

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      Sidebar.toggle();
    }
  });

  console.log('[Site Memory] Ready - Press Ctrl+Shift+S to open sidebar');
})();