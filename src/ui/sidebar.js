/**
 * Sidebar UI
 * Modern, sleek sidebar with folder organization by site
 */

const Sidebar = {
  container: null,
  isOpen: false,
  theme: null,
  currentView: 'all', // 'all', 'page', 'search'
  searchQuery: '',

  /**
   * Initialize the sidebar
   */
  init() {
    this.theme = ColorUtils.generateTheme();
    this.createSidebar();
    this.setupEventListeners();
  },

  /**
   * Create the sidebar DOM structure
   */
  createSidebar() {
    this.container = document.createElement('div');
    this.container.className = 'site-memory-sidebar';
    this.container.innerHTML = this.getSidebarHTML();
    
    document.body.appendChild(this.container);
    
    // Apply theme
    ColorUtils.applyTheme(this.theme, this.container);
    
    // Setup internal events
    this.setupSidebarEvents();
  },

  /**
   * Get the sidebar HTML template
   */
  getSidebarHTML() {
    return `
      <div class="sm-sidebar-backdrop"></div>
      <div class="sm-sidebar-panel">
        <header class="sm-sidebar-header">
          <div class="sm-header-title">
            <svg class="sm-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Site Memory</span>
          </div>
          <button class="sm-close-btn" title="Close (Ctrl+Shift+S)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div class="sm-sidebar-search">
          <div class="sm-search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="sm-search-input" placeholder="Search highlights...">
            <button class="sm-search-clear hidden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <nav class="sm-sidebar-tabs">
          <button class="sm-tab active" data-view="all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            All Sites
          </button>
          <button class="sm-tab" data-view="page">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            This Page
          </button>
        </nav>

        <div class="sm-sidebar-content">
          <div class="sm-content-loading">
            <div class="sm-spinner"></div>
          </div>
          <div class="sm-content-empty hidden">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/>
            </svg>
            <p>No highlights yet</p>
            <span>Select text and press Ctrl+Shift+H to save</span>
          </div>
          <div class="sm-sites-list"></div>
        </div>

        <footer class="sm-sidebar-footer">
          <button class="sm-footer-btn sm-export-btn" title="Export data">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <button class="sm-footer-btn sm-import-btn" title="Import data">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <div class="sm-footer-spacer"></div>
          <button class="sm-footer-btn sm-shortcuts-btn" title="Keyboard shortcuts">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8"/>
            </svg>
          </button>
        </footer>
      </div>

      <!-- Import file input (hidden) -->
      <input type="file" class="sm-import-input" accept=".json" style="display: none;">
      
      <!-- Shortcuts modal -->
      <div class="sm-modal sm-shortcuts-modal hidden">
        <div class="sm-modal-content">
          <h3>Keyboard Shortcuts</h3>
          <div class="sm-shortcuts-list">
            <div class="sm-shortcut">
              <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>
              <span>Toggle sidebar</span>
            </div>
            <div class="sm-shortcut">
              <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>
              <span>Save selection as highlight</span>
            </div>
            <div class="sm-shortcut">
              <kbd>Esc</kbd>
              <span>Close sidebar / modal</span>
            </div>
          </div>
          <button class="sm-modal-close">Got it</button>
        </div>
      </div>
    `;
  },

  /**
   * Setup event listeners for sidebar controls
   */
  setupSidebarEvents() {
    // Close button
    this.container.querySelector('.sm-close-btn').addEventListener('click', () => {
      this.close();
    });

    // Backdrop click
    this.container.querySelector('.sm-sidebar-backdrop').addEventListener('click', () => {
      this.close();
    });

    // Tab switching
    this.container.querySelectorAll('.sm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchView(tab.dataset.view);
      });
    });

    // Search input
    const searchInput = this.container.querySelector('.sm-search-input');
    const searchClear = this.container.querySelector('.sm-search-clear');
    
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      searchClear.classList.toggle('hidden', !this.searchQuery);
      this.refresh();
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      this.searchQuery = '';
      searchClear.classList.add('hidden');
      this.refresh();
    });

    // Export button
    this.container.querySelector('.sm-export-btn').addEventListener('click', () => {
      this.exportData();
    });

    // Import button
    this.container.querySelector('.sm-import-btn').addEventListener('click', () => {
      this.container.querySelector('.sm-import-input').click();
    });

    // Import file input
    this.container.querySelector('.sm-import-input').addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.importData(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Shortcuts button
    this.container.querySelector('.sm-shortcuts-btn').addEventListener('click', () => {
      this.container.querySelector('.sm-shortcuts-modal').classList.remove('hidden');
    });

    // Modal close
    this.container.querySelector('.sm-modal-close').addEventListener('click', () => {
      this.container.querySelector('.sm-shortcuts-modal').classList.add('hidden');
    });

    // ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.container.querySelector('.sm-shortcuts-modal').classList.add('hidden');
        if (this.isOpen) this.close();
      }
    });
  },

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Keyboard shortcut for toggle
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  /**
   * Toggle sidebar open/closed
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  /**
   * Open the sidebar
   */
  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.refresh();
  },

  /**
   * Close the sidebar
   */
  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
  },

  /**
   * Switch between views
   */
  switchView(view) {
    this.currentView = view;
    
    // Update tab states
    this.container.querySelectorAll('.sm-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    this.refresh();
  },

  /**
   * Refresh the sidebar content
   */
  async refresh() {
    if (!this.isOpen) return;

    const contentEl = this.container.querySelector('.sm-sites-list');
    const loadingEl = this.container.querySelector('.sm-content-loading');
    const emptyEl = this.container.querySelector('.sm-content-empty');

    // Show loading
    loadingEl.classList.remove('hidden');
    contentEl.innerHTML = '';
    emptyEl.classList.add('hidden');

    try {
      let html = '';

      if (this.searchQuery) {
        html = await this.renderSearchResults();
      } else if (this.currentView === 'page') {
        html = await this.renderCurrentPage();
      } else {
        html = await this.renderAllSites();
      }

      loadingEl.classList.add('hidden');

      if (!html) {
        emptyEl.classList.remove('hidden');
      } else {
        contentEl.innerHTML = html;
        this.setupContentEvents();
      }
    } catch (error) {
      console.error('Failed to refresh sidebar:', error);
      loadingEl.classList.add('hidden');
      contentEl.innerHTML = '<div class="sm-error">Failed to load highlights</div>';
    }
  },

  /**
   * Render all sites (folder view)
   */
  async renderAllSites() {
    const organized = await StorageManager.getOrganizedData();
    const sites = Object.keys(organized);

    if (sites.length === 0) return '';

    // Sort sites by last visited
    sites.sort((a, b) => {
      const siteA = organized[a].site;
      const siteB = organized[b].site;
      return (siteB.lastVisited || 0) - (siteA.lastVisited || 0);
    });

    return sites.map(hostname => {
      const { site, pages } = organized[hostname];
      const pageKeys = Object.keys(pages);
      const isCurrentSite = hostname === UrlUtils.getHostname(window.location.href);

      return `
        <div class="sm-site ${isCurrentSite ? 'current' : ''}" data-hostname="${hostname}">
          <div class="sm-site-header" data-expanded="${site.isExpanded !== false}">
            <button class="sm-site-toggle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <img class="sm-site-favicon" src="${site.favicon || ''}" alt="" onerror="this.style.display='none'">
            <span class="sm-site-name">${site.displayName}</span>
            <span class="sm-site-count">${site.highlightCount}</span>
            <button class="sm-site-delete" title="Delete all highlights for this site">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
          <div class="sm-site-pages ${site.isExpanded !== false ? 'expanded' : ''}">
            ${pageKeys.map(pageId => this.renderPage(pages[pageId])).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render a page within a site
   */
  renderPage({ page, highlights }) {
    const isCurrentPage = page.pageId === UrlUtils.getPageId(window.location.href);
    
    return `
      <div class="sm-page ${isCurrentPage ? 'current' : ''}" data-page-id="${page.pageId}">
        <div class="sm-page-header">
          <a href="${page.url}" class="sm-page-link" title="${page.url}">
            ${page.title || 'Untitled'}
          </a>
          <span class="sm-page-count">${highlights.length}</span>
        </div>
        <div class="sm-page-highlights">
          ${highlights.map(h => this.renderHighlight(h)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Render current page highlights only
   */
  async renderCurrentPage() {
    const pageId = UrlUtils.getPageId(window.location.href);
    const highlights = await StorageManager.getHighlightsForPage(pageId);

    if (highlights.length === 0) return '';

    return `
      <div class="sm-page-only">
        ${highlights.map(h => this.renderHighlight(h, true)).join('')}
      </div>
    `;
  },

  /**
   * Render search results
   */
  async renderSearchResults() {
    const results = await StorageManager.searchHighlights(this.searchQuery);

    if (results.length === 0) {
      return `
        <div class="sm-search-empty">
          <p>No highlights found for "${this.searchQuery}"</p>
        </div>
      `;
    }

    return `
      <div class="sm-search-results">
        <div class="sm-search-info">${results.length} result${results.length !== 1 ? 's' : ''}</div>
        ${results.map(h => this.renderHighlight(h, true)).join('')}
      </div>
    `;
  },

  /**
   * Render a single highlight item
   */
  renderHighlight(highlight, showSource = false) {
    const truncatedText = highlight.text.length > 150 
      ? highlight.text.substring(0, 150) + '...' 
      : highlight.text;

    return `
      <div class="sm-highlight" data-highlight-id="${highlight.id}" data-color="${highlight.color}">
        <div class="sm-highlight-bar" style="background-color: ${highlight.color}"></div>
        <div class="sm-highlight-content">
          <div class="sm-highlight-text">${this.escapeHtml(truncatedText)}</div>
          ${highlight.note ? `<div class="sm-highlight-note">${this.escapeHtml(highlight.note)}</div>` : ''}
          ${showSource ? `<div class="sm-highlight-source">${highlight.pageTitle || UrlUtils.getPageTitle(highlight.url)}</div>` : ''}
        </div>
        <div class="sm-highlight-actions">
          <button class="sm-hl-btn sm-hl-goto" title="Go to highlight">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button class="sm-hl-btn sm-hl-copy" title="Copy text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="sm-hl-btn sm-hl-delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Setup event listeners for content items
   */
  setupContentEvents() {
    // Site folder toggle
    this.container.querySelectorAll('.sm-site-header').forEach(header => {
      header.addEventListener('click', async (e) => {
        if (e.target.closest('.sm-site-delete')) return;
        
        const site = header.closest('.sm-site');
        const hostname = site.dataset.hostname;
        const pages = site.querySelector('.sm-site-pages');
        const isExpanded = header.dataset.expanded === 'true';
        
        header.dataset.expanded = !isExpanded;
        pages.classList.toggle('expanded', !isExpanded);
        
        await StorageManager.toggleSiteExpansion(hostname);
      });
    });

    // Site delete
    this.container.querySelectorAll('.sm-site-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const site = btn.closest('.sm-site');
        const hostname = site.dataset.hostname;
        
        if (confirm(`Delete all highlights from ${hostname}?`)) {
          await StorageManager.deleteSiteHighlights(hostname);
          this.refresh();
          
          // Remove rendered highlights if on same site
          if (hostname === UrlUtils.getHostname(window.location.href)) {
            HighlightRenderer.clearAll();
          }
        }
      });
    });

    // Highlight go-to
    this.container.querySelectorAll('.sm-hl-goto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const highlight = btn.closest('.sm-highlight');
        const highlightId = highlight.dataset.highlightId;
        HighlightRenderer.scrollToHighlight(highlightId);
      });
    });

    // Highlight copy
    this.container.querySelectorAll('.sm-hl-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const highlight = btn.closest('.sm-highlight');
        const textEl = highlight.querySelector('.sm-highlight-text');
        
        try {
          await navigator.clipboard.writeText(textEl.textContent);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });

    // Highlight delete
    this.container.querySelectorAll('.sm-hl-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const highlight = btn.closest('.sm-highlight');
        const highlightId = highlight.dataset.highlightId;
        
        await StorageManager.deleteHighlight(highlightId);
        HighlightRenderer.removeHighlight(highlightId);
        this.refresh();
      });
    });
  },

  /**
   * Export data to JSON file
   */
  async exportData() {
    const data = await StorageManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-memory-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  },

  /**
   * Import data from JSON file
   */
  async importData(file) {
    try {
      const text = await file.text();
      const count = await StorageManager.importData(text);
      alert(`Successfully imported ${count} new highlight${count !== 1 ? 's' : ''}`);
      this.refresh();
      
      // Re-render highlights on current page
      HighlightRenderer.clearAll();
      HighlightRenderer.renderPageHighlights();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Make available globally
window.Sidebar = Sidebar;
