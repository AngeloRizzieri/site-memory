const StorageManager = {
  // Get storage key for a hostname
  getKey(hostname) {
    return `highlights_${hostname}`;
  },

  // Save a new highlight
  async saveHighlight(highlight) {
    const key = this.getKey(highlight.hostname);
    
    try {
      const result = await chrome.storage.local.get(key);
      const highlights = result[key] || [];
      
      highlights.push(highlight);
      
      await chrome.storage.local.set({ [key]: highlights });
      
      console.log('[Site Memory] Highlight saved:', highlight.id);
      return { success: true, highlight };
    } catch (error) {
      console.error('[Site Memory] Save error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all highlights for a hostname
  async getHighlightsByHostname(hostname) {
    const key = this.getKey(hostname);
    
    try {
      const result = await chrome.storage.local.get(key);
      const highlights = result[key] || [];
      
      // Sort by timestamp, newest first
      highlights.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`[Site Memory] Retrieved ${highlights.length} highlights for ${hostname}`);
      return highlights;
    } catch (error) {
      console.error('[Site Memory] Retrieval error:', error);
      return [];
    }
  },

  // Delete a highlight by ID
  async deleteHighlight(hostname, highlightId) {
    const key = this.getKey(hostname);
    
    try {
      const result = await chrome.storage.local.get(key);
      let highlights = result[key] || [];
      
      highlights = highlights.filter(h => h.id !== highlightId);
      
      await chrome.storage.local.set({ [key]: highlights });
      
      console.log('[Site Memory] Highlight deleted:', highlightId);
      return { success: true };
    } catch (error) {
      console.error('[Site Memory] Delete error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all hostnames that have saved highlights
  async getAllHostnames() {
    try {
      const all = await chrome.storage.local.get(null);
      const hostnames = Object.keys(all)
        .filter(key => key.startsWith('highlights_'))
        .map(key => key.replace('highlights_', ''));
      return hostnames;
    } catch (error) {
      console.error('[Site Memory] Get hostnames error:', error);
      return [];
    }
  }
};

// Make available globally
window.StorageManager = StorageManager;
