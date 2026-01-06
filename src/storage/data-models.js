function generateId() {
  return crypto.randomUUID();
}

function createHighlight(data) {
  return {
    id: generateId(),
    hostname: data.hostname || getCurrentHostname(),
    url: data.url || window.location.href,
    text: data.text || '',
    note: data.note || '',
    timestamp: Date.now(),
    position: {
      startXPath: data.startXPath || '',
      startOffset: data.startOffset || 0,
      endXPath: data.endXPath || '',
      endOffset: data.endOffset || 0,
      contextBefore: data.contextBefore || '',
      contextAfter: data.contextAfter || ''
    },
    metadata: {
      pageTitle: document.title || '',
      favicon: ''
    },
    isPinned: false
  };
}

// Make available globally
window.generateId = generateId;
window.createHighlight = createHighlight;