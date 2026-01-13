/**
 * URL utilities for proper page identification and grouping
 * 
 * Key fix: Use full URL path for page identification to prevent
 * highlights from one wiki page appearing on another
 */

const UrlUtils = {
  /**
   * Get the hostname from a URL
   */
  getHostname(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  },

  /**
   * Get a clean domain name for display (removes www.)
   */
  getDisplayDomain(url) {
    const hostname = this.getHostname(url);
    if (!hostname) return 'Unknown';
    return hostname.replace(/^www\./, '');
  },

  /**
   * Get the page identifier - this is the KEY fix for the Wikipedia issue
   * Uses full path to distinguish between different pages on same domain
   */
  getPageId(url) {
    try {
      const urlObj = new URL(url);
      // Include hostname + pathname for unique page identification
      // Remove trailing slashes and query params for cleaner matching
      const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
      return `${urlObj.hostname}${pathname}`;
    } catch {
      return url;
    }
  },

  /**
   * Get a display-friendly page title from URL
   */
  getPageTitle(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Handle root path
      if (pathname === '/' || pathname === '') {
        return this.getDisplayDomain(url);
      }
      
      // Get last path segment
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 0) {
        return this.getDisplayDomain(url);
      }
      
      // Clean up the last segment
      let title = segments[segments.length - 1];
      
      // Decode URI and replace underscores/hyphens with spaces
      title = decodeURIComponent(title)
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]+$/, ''); // Remove file extension
      
      // Title case
      return title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    } catch {
      return url;
    }
  },

  /**
   * Check if a URL is a PDF
   */
  isPdfUrl(url) {
    try {
      const urlObj = new URL(url);
      // Check for .pdf extension or PDF viewer URLs
      if (urlObj.pathname.toLowerCase().endsWith('.pdf')) {
        return true;
      }
      // Check for Chrome's PDF viewer
      if (url.includes('chrome-extension://') && url.includes('pdf')) {
        return true;
      }
      // Check for Firefox's PDF.js viewer
      if (url.includes('resource://pdf.js/')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Check if we're in Chrome's PDF viewer
   */
  isChromePdfViewer() {
    return document.contentType === 'application/pdf' || 
           document.querySelector('embed[type="application/pdf"]') !== null;
  },

  /**
   * Get the favicon URL for a domain
   */
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return null;
    }
  },

  /**
   * Normalize URL for comparison
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove hash, trailing slash, and normalize
      urlObj.hash = '';
      let normalized = urlObj.href;
      if (normalized.endsWith('/') && urlObj.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch {
      return url;
    }
  }
};

// Make available globally
window.UrlUtils = UrlUtils;
