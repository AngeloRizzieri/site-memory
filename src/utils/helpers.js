/**
 * Helper utilities
 */

const Helpers = {
  // Generate unique ID
  generateId() {
    return 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  },

  // Relative timestamp: "just now", "3m ago", "2h ago", "yesterday", "Mar 15"
  timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const min  = Math.floor(diff / 60000);
    const hour = Math.floor(diff / 3600000);
    const day  = Math.floor(diff / 86400000);
    if (diff < 60000)  return 'just now';
    if (min  < 60)     return min  + 'm';
    if (hour < 24)     return hour + 'h';
    if (day  === 1)    return 'yesterday';
    if (day  < 7)      return day  + 'd';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
