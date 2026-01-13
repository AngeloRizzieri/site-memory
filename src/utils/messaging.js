/**
 * Messaging utility for communication between content scripts and background
 */

const Messaging = {
  /**
   * Send a message to the background script
   */
  sendToBackground(action, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action, ...data }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Listen for messages from background
   */
  onMessage(callback) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const result = callback(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse).catch(console.error);
        return true; // Keep channel open for async response
      }
      if (result !== undefined) {
        sendResponse(result);
      }
      return false;
    });
  }
};

// Make available globally
window.Messaging = Messaging;
