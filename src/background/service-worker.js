/**
 * Background service worker
 */

// Context menu for saving images
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveImage',
    title: 'Save image to Site Memory',
    contexts: ['image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveImage' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'saveImage',
      src: info.srcUrl
    });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  }
});
