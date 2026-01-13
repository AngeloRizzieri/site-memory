/**
 * Helper utilities
 */

const Helpers = {
  // Generate unique ID
  generateId() {
    return 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Get page identifier - FULL URL PATH for proper separation
  getPageId() {
    const url = new URL(window.location.href);
    return url.hostname + url.pathname;
  },

  // Get nice page title for folders
  getPageTitle() {
    // Use document title, clean it up
    let title = document.title || '';
    
    // Remove common suffixes
    title = title.replace(/\s*[-|–—]\s*[^-|–—]*$/, '').trim();
    
    if (!title) {
      // Fallback to URL path
      const path = window.location.pathname;
      title = path.split('/').filter(Boolean).pop() || window.location.hostname;
      title = decodeURIComponent(title).replace(/[-_]/g, ' ');
    }
    
    return title.substring(0, 60);
  },

  // Get hostname for grouping
  getHostname() {
    return window.location.hostname.replace(/^www\./, '');
  },

  // Get favicon
  getFavicon() {
    return `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`;
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Check if PDF
  isPdf() {
    return document.contentType === 'application/pdf' || 
           window.location.pathname.toLowerCase().endsWith('.pdf') ||
           !!document.querySelector('embed[type="application/pdf"]');
  }
};

window.Helpers = Helpers;
