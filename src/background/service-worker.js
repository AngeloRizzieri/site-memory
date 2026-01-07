// Import message types for service worker
const MESSAGE_TYPES = {
  SAVE_HIGHLIGHT: 'SAVE_HIGHLIGHT',
  GET_HIGHLIGHTS: 'GET_HIGHLIGHTS',
  DELETE_HIGHLIGHT: 'DELETE_HIGHLIGHT',
  HIGHLIGHT_SAVED: 'HIGHLIGHT_SAVED',
  HIGHLIGHTS_RETRIEVED: 'HIGHLIGHTS_RETRIEVED',
  CONTEXT_MENU_SAVE: 'CONTEXT_MENU_SAVE',
  UPDATE_NOTE: 'UPDATE_NOTE',
  TOGGLE_PIN: 'TOGGLE_PIN'
};

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-highlight',
    title: 'Save Highlight',
    contexts: ['selection']
  });
  
  console.log('[Site Memory] Extension installed, context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-highlight') {
    console.log('[Site Memory] Context menu clicked, saving highlight');
    
    try {
      // Send message to content script to save selection
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.CONTEXT_MENU_SAVE
      });
      
      console.log('[Site Memory] Save response:', response);
    } catch (error) {
      console.error('[Site Memory] Error saving highlight:', error);
    }
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Site Memory] Background received:', message.type);
  
  // Handle any background-specific messages here
  // Currently, storage operations happen in content script
  
  return false;
});

console.log('[Site Memory] Service worker initialized');
