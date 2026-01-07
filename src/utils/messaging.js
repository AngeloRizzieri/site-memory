const MESSAGE_TYPES = {
  // Content → Background
  SAVE_HIGHLIGHT: 'SAVE_HIGHLIGHT',
  GET_HIGHLIGHTS: 'GET_HIGHLIGHTS',
  DELETE_HIGHLIGHT: 'DELETE_HIGHLIGHT',
  
  // Background → Content
  HIGHLIGHT_SAVED: 'HIGHLIGHT_SAVED',
  HIGHLIGHTS_RETRIEVED: 'HIGHLIGHTS_RETRIEVED',
  
  // Context menu
  CONTEXT_MENU_SAVE: 'CONTEXT_MENU_SAVE',
  
  // Future
  UPDATE_NOTE: 'UPDATE_NOTE',
  TOGGLE_PIN: 'TOGGLE_PIN'
};

function createMessage(type, payload = {}) {
  return {
    type,
    payload,
    timestamp: Date.now()
  };
}

// Make available globally for content scripts
window.MESSAGE_TYPES = MESSAGE_TYPES;
window.createMessage = createMessage;
