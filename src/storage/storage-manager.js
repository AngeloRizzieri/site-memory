/**
 * Storage Manager for Site Memory
 * Handles all data persistence with Chrome's storage API
 * Organized by site for the folder view
 */

const StorageManager = {
  STORAGE_KEY: 'siteMemoryData',
  SETTINGS_KEY: 'siteMemorySettings',

  /**
   * Get all stored data
   */
  async getAllData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        const data = result[this.STORAGE_KEY] || {
          highlights: [],
          sites: {},
          version: 2
        };
        resolve(data);
      });
    });
  },

  /**
   * Save all data
   */
  async saveAllData(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Get highlights for a specific page (using pageId for exact match)
   * This is the key fix - uses full path not just hostname
   */
  async getHighlightsForPage(pageId) {
    const data = await this.getAllData();
    return data.highlights.filter(h => h.pageId === pageId);
  },

  /**
   * Get all highlights for a hostname (for sidebar folder view)
   */
  async getHighlightsForSite(hostname) {
    const data = await this.getAllData();
    return data.highlights.filter(h => h.hostname === hostname);
  },

  /**
   * Get all highlights
   */
  async getAllHighlights() {
    const data = await this.getAllData();
    return data.highlights || [];
  },

  /**
   * Add a new highlight
   */
  async addHighlight(highlight) {
    if (!DataModels.validateHighlight(highlight)) {
      throw new Error('Invalid highlight data');
    }

    const data = await this.getAllData();
    data.highlights.push(highlight);
    
    // Update site metadata
    this.updateSiteMetadata(data, highlight);
    
    await this.saveAllData(data);
    return highlight;
  },

  /**
   * Update an existing highlight
   */
  async updateHighlight(highlightId, updates) {
    const data = await this.getAllData();
    const index = data.highlights.findIndex(h => h.id === highlightId);
    
    if (index === -1) {
      throw new Error('Highlight not found');
    }

    data.highlights[index] = {
      ...data.highlights[index],
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveAllData(data);
    return data.highlights[index];
  },

  /**
   * Delete a highlight
   */
  async deleteHighlight(highlightId) {
    const data = await this.getAllData();
    const highlight = data.highlights.find(h => h.id === highlightId);
    
    if (!highlight) {
      throw new Error('Highlight not found');
    }

    data.highlights = data.highlights.filter(h => h.id !== highlightId);
    
    // Update site metadata
    this.recalculateSiteMetadata(data);
    
    await this.saveAllData(data);
    return true;
  },

  /**
   * Delete all highlights for a page
   */
  async deletePageHighlights(pageId) {
    const data = await this.getAllData();
    data.highlights = data.highlights.filter(h => h.pageId !== pageId);
    this.recalculateSiteMetadata(data);
    await this.saveAllData(data);
    return true;
  },

  /**
   * Delete all highlights for a site
   */
  async deleteSiteHighlights(hostname) {
    const data = await this.getAllData();
    data.highlights = data.highlights.filter(h => h.hostname !== hostname);
    delete data.sites[hostname];
    await this.saveAllData(data);
    return true;
  },

  /**
   * Update site metadata after adding a highlight
   */
  updateSiteMetadata(data, highlight) {
    const { hostname } = highlight;
    
    if (!data.sites[hostname]) {
      data.sites[hostname] = DataModels.createSite({
        hostname,
        displayName: UrlUtils.getDisplayDomain(highlight.url),
        favicon: UrlUtils.getFaviconUrl(highlight.url)
      });
    }

    const site = data.sites[hostname];
    const siteHighlights = data.highlights.filter(h => h.hostname === hostname);
    const uniquePages = new Set(siteHighlights.map(h => h.pageId));
    
    site.highlightCount = siteHighlights.length;
    site.pageCount = uniquePages.size;
    site.lastVisited = Date.now();
  },

  /**
   * Recalculate all site metadata (after deletions)
   */
  recalculateSiteMetadata(data) {
    data.sites = {};
    
    for (const highlight of data.highlights) {
      this.updateSiteMetadata(data, highlight);
    }
  },

  /**
   * Get organized data for sidebar (grouped by site, then by page)
   */
  async getOrganizedData() {
    const data = await this.getAllData();
    const organized = {};

    for (const highlight of data.highlights) {
      const { hostname, pageId } = highlight;

      if (!organized[hostname]) {
        organized[hostname] = {
          site: data.sites[hostname] || DataModels.createSite({
            hostname,
            displayName: UrlUtils.getDisplayDomain(highlight.url),
            favicon: UrlUtils.getFaviconUrl(highlight.url)
          }),
          pages: {}
        };
      }

      if (!organized[hostname].pages[pageId]) {
        organized[hostname].pages[pageId] = {
          page: DataModels.createPage({
            pageId,
            url: highlight.url,
            title: highlight.pageTitle || UrlUtils.getPageTitle(highlight.url)
          }),
          highlights: []
        };
      }

      organized[hostname].pages[pageId].highlights.push(highlight);
      organized[hostname].pages[pageId].page.highlightCount++;
    }

    return organized;
  },

  /**
   * Search highlights
   */
  async searchHighlights(query) {
    const data = await this.getAllData();
    const lowerQuery = query.toLowerCase();
    
    return data.highlights.filter(h => {
      return h.text.toLowerCase().includes(lowerQuery) ||
             (h.note && h.note.toLowerCase().includes(lowerQuery)) ||
             (h.pageTitle && h.pageTitle.toLowerCase().includes(lowerQuery));
    });
  },

  /**
   * Export all data
   */
  async exportData() {
    const data = await this.getAllData();
    return JSON.stringify(data, null, 2);
  },

  /**
   * Import data
   */
  async importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      
      // Validate structure
      if (!imported.highlights || !Array.isArray(imported.highlights)) {
        throw new Error('Invalid data format');
      }

      // Merge with existing data or replace
      const currentData = await this.getAllData();
      
      // Add imported highlights, avoiding duplicates
      const existingIds = new Set(currentData.highlights.map(h => h.id));
      const newHighlights = imported.highlights.filter(h => !existingIds.has(h.id));
      
      currentData.highlights = [...currentData.highlights, ...newHighlights];
      this.recalculateSiteMetadata(currentData);
      
      await this.saveAllData(currentData);
      return newHighlights.length;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  },

  /**
   * Get settings
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.SETTINGS_KEY], (result) => {
        resolve(result[this.SETTINGS_KEY] || {
          defaultColor: '#fbbf24',
          autoSave: false,
          showNotePrompt: true
        });
      });
    });
  },

  /**
   * Save settings
   */
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.SETTINGS_KEY]: settings }, resolve);
    });
  },

  /**
   * Clear all data
   */
  async clearAllData() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.STORAGE_KEY], resolve);
    });
  },

  /**
   * Toggle site expansion state
   */
  async toggleSiteExpansion(hostname) {
    const data = await this.getAllData();
    if (data.sites[hostname]) {
      data.sites[hostname].isExpanded = !data.sites[hostname].isExpanded;
      await this.saveAllData(data);
      return data.sites[hostname].isExpanded;
    }
    return true;
  }
};

// Make available globally
window.StorageManager = StorageManager;
