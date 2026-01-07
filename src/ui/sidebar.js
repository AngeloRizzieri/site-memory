const Sidebar = {
  sidebar: null,
  isOpen: false,

  init() {
    this.createToggleButton();
    this.createSidebar();
    this.checkForHighlights();
  },

  createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'site-memory-toggle-btn';
    btn.textContent = '📝 Notes';
    btn.addEventListener('click', () => this.toggle());
    document.body.appendChild(btn);
    this.toggleBtn = btn;
  },

  createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'site-memory-sidebar';
    sidebar.innerHTML = `
      <div class="site-memory-sidebar-header">
        <h2>📝 Site Memory</h2>
        <button class="site-memory-close-btn">×</button>
      </div>
      <div class="site-memory-stats"></div>
      <div class="site-memory-list"></div>
    `;

    sidebar.querySelector('.site-memory-close-btn').addEventListener('click', () => this.close());
    
    document.body.appendChild(sidebar);
    this.sidebar = sidebar;
  },

  async checkForHighlights() {
    const highlights = await StorageManager.getHighlightsByHostname(getCurrentHostname());
    if (highlights.length > 0) {
      this.toggleBtn.classList.add('has-highlights');
    } else {
      this.toggleBtn.classList.remove('has-highlights');
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

  async loadHighlights() {
    const hostname = getCurrentHostname();
    const highlights = await StorageManager.getHighlightsByHostname(hostname);
    
    const statsEl = this.sidebar.querySelector('.site-memory-stats');
    statsEl.textContent = `${highlights.length} highlight${highlights.length !== 1 ? 's' : ''} on ${hostname}`;

    const listEl = this.sidebar.querySelector('.site-memory-list');
    
    if (highlights.length === 0) {
      listEl.innerHTML = `
        <div class="site-memory-empty">
          <div class="site-memory-empty-icon">📭</div>
          <p>No highlights saved on this site yet.</p>
          <p style="font-size: 13px;">Select text and right-click to save!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = highlights.map(h => this.renderCard(h)).join('');

    listEl.querySelectorAll('.site-memory-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('site-memory-card-delete')) {
          const id = card.dataset.id;
          HighlightRenderer.scrollToHighlight(id);
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
  },

  renderCard(highlight) {
    const date = new Date(highlight.timestamp);
    const timeAgo = this.getTimeAgo(date);
    const noteHtml = highlight.note 
      ? `<div class="site-memory-card-note">"${this.escapeHtml(highlight.note)}"</div>` 
      : '';

    return `
      <div class="site-memory-card" data-id="${highlight.id}">
        <div class="site-memory-card-text">${this.escapeHtml(highlight.text)}</div>
        ${noteHtml}
        <div class="site-memory-card-meta">
          <span>${timeAgo}</span>
          <button class="site-memory-card-delete" data-id="${highlight.id}">🗑️ Delete</button>
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
