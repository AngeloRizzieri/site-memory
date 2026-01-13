/**
 * Data models for Site Memory
 * Defines the structure of highlights and site data
 */

const DataModels = {
  /**
   * Create a new highlight object
   */
  createHighlight(options) {
    return {
      id: options.id || this.generateId(),
      text: options.text || '',
      note: options.note || '',
      color: options.color || '#fbbf24',
      
      // Location data - critical for restoring highlights
      pageId: options.pageId,           // Full path identifier (fixes wiki issue)
      url: options.url,                 // Full URL for navigation
      hostname: options.hostname,       // For grouping by site
      pageTitle: options.pageTitle || '',
      
      // DOM location for restoration
      xpath: options.xpath || null,
      textOffset: options.textOffset || 0,
      textLength: options.textLength || 0,
      
      // For context and search
      context: options.context || '',   // Surrounding text for better matching
      
      // PDF specific
      isPdf: options.isPdf || false,
      pdfPage: options.pdfPage || null,
      
      // Metadata
      createdAt: options.createdAt || Date.now(),
      updatedAt: options.updatedAt || Date.now()
    };
  },

  /**
   * Create a site/folder object for grouping
   */
  createSite(options) {
    return {
      hostname: options.hostname,
      displayName: options.displayName || options.hostname,
      favicon: options.favicon || null,
      pageCount: options.pageCount || 0,
      highlightCount: options.highlightCount || 0,
      lastVisited: options.lastVisited || Date.now(),
      isExpanded: options.isExpanded !== undefined ? options.isExpanded : true
    };
  },

  /**
   * Create a page object within a site
   */
  createPage(options) {
    return {
      pageId: options.pageId,
      url: options.url,
      title: options.title || '',
      highlightCount: options.highlightCount || 0,
      lastVisited: options.lastVisited || Date.now()
    };
  },

  /**
   * Generate a unique ID
   */
  generateId() {
    return `hl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  /**
   * Validate a highlight object
   */
  validateHighlight(highlight) {
    const required = ['id', 'text', 'pageId', 'url', 'hostname'];
    const missing = required.filter(field => !highlight[field]);
    
    if (missing.length > 0) {
      console.warn('Invalid highlight, missing fields:', missing);
      return false;
    }
    return true;
  },

  /**
   * Update highlight timestamp
   */
  touchHighlight(highlight) {
    return {
      ...highlight,
      updatedAt: Date.now()
    };
  }
};

// Make available globally
window.DataModels = DataModels;
