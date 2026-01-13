/**
 * Background Service Worker
 * Handles browser-level events, context menus, and keyboard shortcuts
 */

// Initialize context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item
  chrome.contextMenus.create({
    id: 'saveHighlight',
    title: 'Save as Highlight',
    contexts: ['selection']
  });

  console.log('Site Memory: Extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveHighlight' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'saveHighlight' });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;

  switch (command) {
    case 'toggle-sidebar':
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
      break;
      
    case 'save-highlight':
      chrome.tabs.sendMessage(tab.id, { action: 'saveHighlight' });
      break;
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle any background-specific messages here
  switch (message.action) {
    case 'openTab':
      chrome.tabs.create({ url: message.url });
      sendResponse({ success: true });
      break;
      
    default:
      break;
  }
  
  return false;
});
