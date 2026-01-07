// Import message types for service worker
const MESSAGE_TYPES = {
  SAVE_HIGHLIGHT: 'SAVE_HIGHLIGHT',
  GET_HIGHLIGHTS: 'GET_HIGHLIGHTS',
  DELETE_HIGHLIGHT: 'DELETE_HIGHLIGHT',
  HIGHLIGHT_SAVED: 'HIGHLIGHT_SAVED',
  HIGHLIGHTS_RETRIEVED: 'HIGHLIGHTS_RETRIEVED',
  CONTEXT_MENU_SAVE: 'CONTEXT_MENU_SAVE',
  CONTEXT_MENU_SAVE_IMAGE: 'CONTEXT_MENU_SAVE_IMAGE',
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
  
  chrome.contextMenus.create({
    id: 'save-image',
    title: 'Save Image to Site Memory',
    contexts: ['image']
  });
  
  console.log('[Site Memory] Extension installed, context menus created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-highlight') {
    console.log('[Site Memory] Context menu clicked, saving highlight');
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.CONTEXT_MENU_SAVE
      });
      
      console.log('[Site Memory] Save response:', response);
    } catch (error) {
      console.error('[Site Memory] Error saving highlight:', error);
    }
  }
  
  if (info.menuItemId === 'save-image') {
    console.log('[Site Memory] Context menu clicked, saving image:', info.srcUrl);
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.CONTEXT_MENU_SAVE_IMAGE,
        imageUrl: info.srcUrl
      });
      
      console.log('[Site Memory] Save image response:', response);
    } catch (error) {
      console.error('[Site Memory] Error saving image:', error);
    }
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Site Memory] Background received:', message.type);
  
  return false;
});

console.log('[Site Memory] Service worker initialized');
