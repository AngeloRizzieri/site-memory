const Sidebar = {
  sidebar: null,
  isOpen: false,
  isDarkMode: false,
  highlightCount: 0,

  init() {
    this.loadThemePreference();
    this.createToggleButton();
    this.createSidebar();
    this.checkForHighlights();
    this.setupKeyboardShortcuts();
  },

  loadThemePreference() {
    const saved = localStorage.getItem('site-memory-dark-mode');
    this.isDarkMode = saved === 'true';
  },

  saveThemePreference() {
    localStorage.setItem('site-memory-dark-mode', this.isDarkMode);
  },

  createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'site-memory-toggle-btn';
    btn.innerHTML = `
      <span class="site-memory-toggle-icon">📝</span>
      <span class="site-memory-toggle-badge">0</span>
    `;
    btn.title = 'Site Memory (Ctrl+Shift+S)';
    btn.addEventListener('click', () => this.toggle());
    document.body.appendChild(btn);
    this.toggleBtn = btn;
  },

  createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'site-memory-sidebar';
    if (this.isDarkMode) sidebar.classList.add('dark-mode');
    
    sidebar.innerHTML = `
      <div class="site-memory-sidebar-header">
        <h2>📝 Site Memory</h2>
        <div class="site-memory-header-actions">
          <button class="site-memory-theme-btn" title="Toggle dark/light mode">🌙</button>
          <button class="site-memory-export-btn" title="Export highlights">📤</button>
          <button class="site-memory-close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="site-memory-search">
        <input type="text" placeholder="Search highlights..." class="site-memory-search-input" />
      </div>
      <div class="site-memory-stats"></div>
      <div class="site-memory-list"></div>
    `;

    sidebar.querySelector('.site-memory-close-btn').addEventListener('click', () => this.close());
    sidebar.querySelector('.site-memory-theme-btn').addEventListener('click', () => this.toggleTheme());
    sidebar.querySelector('.site-memory-export-btn').addEventListener('click', () => this.exportHighlights());
    sidebar.querySelector('.site-memory-search-input').addEventListener('input', (e) => this.filterHighlights(e.target.value));
    
    document.body.appendChild(sidebar);
    this.sidebar = sidebar;
    this.updateThemeButton();
  },

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.sidebar.classList.toggle('dark-mode', this.isDarkMode);
    this.saveThemePreference();
    this.updateThemeButton();
  },

  updateThemeButton() {
    const btn = this.sidebar.querySelector('.site-memory-theme-btn');
    btn.textContent = this.isDarkMode ? '☀️' : '🌙';
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // Ctrl+Shift+S - Toggle sidebar
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.toggle();
      }
      // Ctrl+Shift+H - Quick save highlight
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        SelectionHandler.showSaveModal();
      }
    });
  },

  async exportHighlights() {
    const hostname = getCurrentHostname();
    const highlights = await StorageManager.getHighlightsByHostname(hostname);
    
    if (highlights.length === 0) {
      alert('No highlights to export!');
      return;
    }

    const exportData = {
      exported: new Date().toISOString(),
      hostname: hostname,
      count: highlights.length,
      highlights: highlights.map(h => ({
        text: h.text,
        note: h.note,
        url: h.url,
        type: h.type,
        imageUrl: h.imageUrl,
        timestamp: h.timestamp,
        date: new Date(h.timestamp).toLocaleString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-memory-${hostname}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async checkForHighlights() {
    const highlights = await StorageManager.getHighlightsByHostname(getCurrentHostname());
    this.highlightCount = highlights.length;
    
    const badge = this.toggleBtn.querySelector('.site-memory-toggle-badge');
    badge.textContent = this.highlightCount;
    
    if (this.highlightCount > 0) {
      this.toggleBtn.classList.add('has-highlights');
      badge.style.display = 'flex';
    } else {
      this.toggleBtn.classList.remove('has-highlights');
      badge.style.display = 'none';
    }
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  async open() {
    this.isOpen = true;
    this.sidebar.classList.add('open');
    await this.loadHighlights();
  },

  close() {
    this.isOpen = false;
    this.sidebar.classList.remove('open');
  },

  async filterHighlights(searchTerm) {
    const hostname = getCurrentHostname();
    const highlights = await StorageManager.getHighlightsByHostname(hostname);
    
    const filtered = searchTerm 
      ? highlights.filter(h => 
          (h.text && h.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (h.note && h.note.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : highlights;
    
    this.renderHighlightsList(filtered, highlights.length);
  },

  async loadHighlights() {
    const hostname = getCurrentHostname();
    const highlights = await StorageManager.getHighlightsByHostname(hostname);
    this.renderHighlightsList(highlights, highlights.length);
  },

  renderHighlightsList(highlights, totalCount) {
    const hostname = getCurrentHostname();
    const statsEl = this.sidebar.querySelector('.site-memory-stats');
    statsEl.textContent = `${highlights.length}${highlights.length !== totalCount ? '/' + totalCount : ''} highlight${totalCount !== 1 ? 's' : ''} on ${hostname}`;

    const listEl = this.sidebar.querySelector('.site-memory-list');
    
    if (highlights.length === 0) {
      listEl.innerHTML = `
        <div class="site-memory-empty">
          <div class="site-memory-empty-icon">📭</div>
          <p>No highlights found.</p>
          <p class="site-memory-hint">Select text + right-click to save<br/>or press Ctrl+Shift+H</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = highlights.map(h => this.renderCard(h)).join('');

    listEl.querySelectorAll('.site-memory-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('site-memory-card-delete') && 
            !e.target.classList.contains('site-memory-card-edit')) {
          const id = card.dataset.id;
          const type = card.dataset.type;
          if (type !== 'image') {
            HighlightRenderer.scrollToHighlight(id);
          }
        }
      });
    });

    listEl.querySelectorAll('.site-memory-card-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await this.deleteHighlight(id);
      });
    });

    listEl.querySelectorAll('.site-memory-card-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const note = btn.dataset.note || '';
        HighlightRenderer.showEditNoteModal(id, note);
      });
    });
  },

  renderCard(highlight) {
    const date = new Date(highlight.timestamp);
    const timeAgo = this.getTimeAgo(date);
    const noteHtml = highlight.note 
      ? `<div class="site-memory-card-note">"${this.escapeHtml(highlight.note)}"</div>` 
      : '';

    let contentHtml;
    if (highlight.type === 'image') {
      contentHtml = `<div class="site-memory-card-image"><img src="${this.escapeHtml(highlight.imageUrl)}" alt="Saved image" /></div>`;
    } else {
      contentHtml = `<div class="site-memory-card-text">${this.escapeHtml(highlight.text)}</div>`;
    }

    return `
      <div class="site-memory-card" data-id="${highlight.id}" data-type="${highlight.type || 'text'}">
        ${contentHtml}
        ${noteHtml}
        <div class="site-memory-card-meta">
          <span>${highlight.type === 'image' ? '🖼️' : '📝'} ${timeAgo}</span>
          <div class="site-memory-card-actions">
            <button class="site-memory-card-edit" data-id="${highlight.id}" data-note="${this.escapeHtml(highlight.note || '')}" title="Edit note">✏️</button>
            <button class="site-memory-card-delete" data-id="${highlight.id}" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `;
  },

  async deleteHighlight(id) {
    const hostname = getCurrentHostname();
    await StorageManager.deleteHighlight(hostname, id);
    HighlightRenderer.removeHighlight(id);
    await this.loadHighlights();
    await this.checkForHighlights();
  },

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  async refresh() {
    if (this.isOpen) {
      await this.loadHighlights();
    }
    await this.checkForHighlights();
  }
};

window.Sidebar = Sidebar;
