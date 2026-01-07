function generateId() {
  return crypto.randomUUID();
}

function createHighlight(data) {
  return {
    id: generateId(),
    type: data.type || 'text', // 'text' or 'image'
    hostname: data.hostname || getCurrentHostname(),
    url: data.url || window.location.href,
    text: data.text || '',
    imageUrl: data.imageUrl || '',
    imageAlt: data.imageAlt || '',
    note: data.note || '',
    timestamp: Date.now(),
    position: {
      text: data.text || '', // Store text in position for matching
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
