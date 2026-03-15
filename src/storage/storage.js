/**
 * Storage manager for highlights
 */

const Storage = {
  STORAGE_KEY: 'site_memory_data',

  // Get all data
  async getAll() {
    return new Promise(resolve => {
      chrome.storage.local.get([this.STORAGE_KEY], result => {
        resolve(result[this.STORAGE_KEY] || { highlights: [], pages: {} });
      });
    });
  },

  // Save all data
  async saveAll(data) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: data }, resolve);
    });
  },

  // Get highlights for current page
  async getPageHighlights() {
    const pageId = Helpers.getPageId();
    const data = await this.getAll();
    return data.highlights.filter(h => h.pageId === pageId);
  },

  // Get all highlights organized by page
  async getOrganizedHighlights() {
    const data = await this.getAll();
    const organized = {};

    for (const h of data.highlights) {
      if (!organized[h.pageId]) {
        organized[h.pageId] = {
          pageId: h.pageId,
          pageTitle: h.pageTitle,
          url: h.url,
          favicon: h.favicon,
          highlights: []
        };
      }
      organized[h.pageId].highlights.push(h);
    }

    // Sort by most recent
    return Object.values(organized).sort((a, b) => {
      const aTime = Math.max(...a.highlights.map(h => h.createdAt));
      const bTime = Math.max(...b.highlights.map(h => h.createdAt));
      return bTime - aTime;
    });
  },

  // Add a highlight
  async addHighlight(highlight) {
    const data = await this.getAll();
    data.highlights.push(highlight);
    await this.saveAll(data);
    return highlight;
  },

  // Update a highlight
  async updateHighlight(id, updates) {
    const data = await this.getAll();
    const index = data.highlights.findIndex(h => h.id === id);
    if (index !== -1) {
      data.highlights[index] = { ...data.highlights[index], ...updates };
      await this.saveAll(data);
      return data.highlights[index];
    }
    return null;
  },

  // Delete a highlight
  async deleteHighlight(id) {
    const data = await this.getAll();
    data.highlights = data.highlights.filter(h => h.id !== id);
    await this.saveAll(data);
  },

  // Delete all highlights for a page
  async deletePageHighlights(pageId) {
    const data = await this.getAll();
    data.highlights = data.highlights.filter(h => h.pageId !== pageId);
    await this.saveAll(data);
  },

  // Search highlights
  async search(query) {
    const data = await this.getAll();
    const q = query.toLowerCase();
    return data.highlights.filter(h =>
      h.text.toLowerCase().includes(q) ||
      (h.note && h.note.toLowerCase().includes(q)) ||
      h.pageTitle.toLowerCase().includes(q)
    );
  },

  // Get custom display names (domain overrides, page title overrides)
  async getCustomNames() {
    const data = await this.getAll();
    return data.customNames || { domains: {}, pages: {} };
  },

  // Set a custom display name
  async setCustomName(type, key, name) {
    const data = await this.getAll();
    if (!data.customNames) data.customNames = { domains: {}, pages: {} };
    if (name) {
      data.customNames[type][key] = name;
    } else {
      delete data.customNames[type][key];
    }
    await this.saveAll(data);
  }
};

window.Storage = Storage;
