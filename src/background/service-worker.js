/**
 * Background service worker
 */

// On install - show welcome/setup page
chrome.runtime.onInstalled.addListener((details) => {
  // Create context menus
  chrome.contextMenus.create({
    id: 'saveImage',
    title: 'Save image to Site Memory',
    contexts: ['image']
  });
  
  chrome.contextMenus.create({
    id: 'openPdfViewer',
    title: 'Open PDF in Site Memory viewer',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.pdf', '*://*/*.pdf?*']
  });

  chrome.contextMenus.create({
    id: 'highlightSelection',
    title: 'Highlight',
    contexts: ['selection']
  });

  // Show welcome page on first install
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/welcome/welcome.html')
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveImage' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'saveImage',
      src: info.srcUrl
    }).catch(() => {});
  }

  if (info.menuItemId === 'highlightSelection' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'highlightSelection', text: info.selectionText }).catch(() => {});
  }

  if (info.menuItemId === 'openPdfViewer') {
    const pdfUrl = encodeURIComponent(info.linkUrl);
    const viewerUrl = chrome.runtime.getURL('src/pdf/viewer.html') + '?file=' + pdfUrl;
    chrome.tabs.create({ url: viewerUrl });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }).catch(() => {});
  }
});

// Detect PDF pages and show appropriate UI
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url.toLowerCase();
    const isPdf = url.endsWith('.pdf') || url.includes('.pdf?');
    const isLocalFile = tab.url.startsWith('file://');
    
    if (isPdf) {
      if (isLocalFile) {
        // Check if we have file access
        chrome.extension.isAllowedFileSchemeAccess((allowed) => {
          if (allowed) {
            // We have access, show the "open in viewer" banner
            injectPdfBanner(tabId, tab.url, true);
          } else {
            // No access, show setup instructions
            injectPdfBanner(tabId, tab.url, false);
          }
        });
      } else {
        // Online PDF - always show banner
        injectPdfBanner(tabId, tab.url, true);
      }
    }
  }
});

// Inject PDF banner
function injectPdfBanner(tabId, pdfUrl, hasFileAccess) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: showPdfBanner,
    args: [pdfUrl, hasFileAccess, chrome.runtime.id]
  }).catch(() => {});
}

// Function to inject into PDF pages
function showPdfBanner(pdfUrl, hasFileAccess, _extensionId) {
  if (document.getElementById('sm-pdf-banner')) return;
  
  const banner = document.createElement('div');
  banner.id = 'sm-pdf-banner';
  
  if (hasFileAccess) {
    banner.innerHTML = `
      <style>
        #sm-pdf-banner {
          position: fixed;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #18181b 0%, #1f1f23 100%);
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 13px;
          color: #fafafa;
          z-index: 2147483647;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: smSlideIn 0.3s ease;
        }
        @keyframes smSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #sm-pdf-banner .sm-icon { font-size: 20px; }
        #sm-pdf-banner .sm-text { line-height: 1.4; }
        #sm-pdf-banner .sm-title { font-weight: 600; margin-bottom: 2px; }
        #sm-pdf-banner .sm-sub { color: #a1a1aa; font-size: 12px; }
        #sm-pdf-banner button {
          background: #facc15;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          color: #0a0a0a;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        #sm-pdf-banner button:hover { background: #fbbf24; transform: scale(1.02); }
        #sm-pdf-banner .sm-close {
          background: transparent;
          color: #71717a;
          padding: 6px;
          border-radius: 6px;
          margin-left: -8px;
        }
        #sm-pdf-banner .sm-close:hover { color: #fafafa; background: #27272a; }
      </style>
      <span class="sm-icon">📄</span>
      <div class="sm-text">
        <div class="sm-title">Highlight this PDF</div>
        <div class="sm-sub">Open in Site Memory viewer</div>
      </div>
      <button id="sm-open-viewer">Open Viewer</button>
      <button class="sm-close" id="sm-close-banner">✕</button>
    `;
  } else {
    // Show setup instructions for local files
    banner.innerHTML = `
      <style>
        #sm-pdf-banner {
          position: fixed;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #18181b 0%, #1f1f23 100%);
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 16px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 13px;
          color: #fafafa;
          z-index: 2147483647;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: smSlideIn 0.3s ease;
          max-width: 320px;
        }
        @keyframes smSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #sm-pdf-banner .sm-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        #sm-pdf-banner .sm-icon { font-size: 20px; }
        #sm-pdf-banner .sm-title { font-weight: 600; flex: 1; }
        #sm-pdf-banner .sm-close {
          background: transparent;
          border: none;
          color: #71717a;
          padding: 4px;
          cursor: pointer;
          border-radius: 4px;
        }
        #sm-pdf-banner .sm-close:hover { color: #fafafa; background: #27272a; }
        #sm-pdf-banner .sm-body { color: #a1a1aa; line-height: 1.5; margin-bottom: 14px; }
        #sm-pdf-banner .sm-steps {
          background: #0a0a0a;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 14px;
          font-size: 12px;
          line-height: 1.6;
        }
        #sm-pdf-banner .sm-step { margin-bottom: 6px; }
        #sm-pdf-banner .sm-step:last-child { margin-bottom: 0; }
        #sm-pdf-banner .sm-num {
          display: inline-block;
          width: 18px;
          height: 18px;
          background: #facc15;
          color: #0a0a0a;
          border-radius: 50%;
          text-align: center;
          font-weight: 600;
          font-size: 11px;
          line-height: 18px;
          margin-right: 8px;
        }
        #sm-pdf-banner button.sm-primary {
          width: 100%;
          background: #facc15;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          color: #0a0a0a;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        #sm-pdf-banner button.sm-primary:hover { background: #fbbf24; }
      </style>
      <div class="sm-header">
        <span class="sm-icon">⚙️</span>
        <span class="sm-title">Quick Setup Needed</span>
        <button class="sm-close" id="sm-close-banner">✕</button>
      </div>
      <div class="sm-body">To highlight local PDF files, enable file access:</div>
      <div class="sm-steps">
        <div class="sm-step"><span class="sm-num">1</span>Click the button below</div>
        <div class="sm-step"><span class="sm-num">2</span>Enable "Allow access to file URLs"</div>
        <div class="sm-step"><span class="sm-num">3</span>Refresh this page</div>
      </div>
      <button class="sm-primary" id="sm-open-settings">Open Extension Settings</button>
    `;
  }
  
  document.body.appendChild(banner);
  
  if (hasFileAccess) {
    document.getElementById('sm-open-viewer').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPdfViewer', url: pdfUrl });
      banner.remove();
    });
  } else {
    document.getElementById('sm-open-settings').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openSettings' });
    });
  }
  
  document.getElementById('sm-close-banner').addEventListener('click', () => {
    banner.remove();
  });
  
  // Auto-hide after 15 seconds
  setTimeout(() => {
    if (banner.parentNode) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      banner.style.transition = 'all 0.3s ease';
      setTimeout(() => banner.remove(), 300);
    }
  }, 15000);
}

// Handle messages
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.action === 'openPdfViewer') {
    const pdfUrl = encodeURIComponent(msg.url);
    const viewerUrl = chrome.runtime.getURL('src/pdf/viewer.html') + '?file=' + pdfUrl;
    chrome.tabs.create({ url: viewerUrl });
    respond({ success: true });
  }
  
  if (msg.action === 'openSettings') {
    // Open extension's settings page directly
    chrome.tabs.create({
      url: `chrome://extensions/?id=${chrome.runtime.id}`
    });
    respond({ success: true });
  }
  
  return false;
});
