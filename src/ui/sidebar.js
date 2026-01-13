/**
 * Sidebar - sleek UI organized by page title
 */

const Sidebar = {
  container: null,
  isOpen: false,
  searchQuery: '',

  init() {
    this.create();
    this.bindEvents();
  },

  create() {
    this.container = document.createElement('div');
    this.container.className = 'sm-sidebar';
    this.container.innerHTML = `
      <div class="sm-backdrop"></div>
      <div class="sm-panel">
        <div class="sm-header">
          <span class="sm-title">Site Memory</span>
          <button class="sm-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="sm-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" placeholder="Search..." class="sm-search-input">
        </div>
        
        <div class="sm-content"></div>
      </div>
    `;
    document.body.appendChild(this.container);
  },

  bindEvents() {
    // Close button
    this.container.querySelector('.sm-close').addEventListener('click', () => this.close());
    
    // Backdrop
    this.container.querySelector('.sm-backdrop').addEventListener('click', () => this.close());
    
    // Search
    const input = this.container.querySelector('.sm-search-input');
    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.refresh();
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.refresh();
  },

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
  },

  async refresh() {
    if (!this.isOpen) return;

    const content = this.container.querySelector('.sm-content');
    
    let pages;
    if (this.searchQuery) {
      const results = await Storage.search(this.searchQuery);
      // Group search results by page
      const grouped = {};
      for (const h of results) {
        if (!grouped[h.pageId]) {
          grouped[h.pageId] = {
            pageId: h.pageId,
            pageTitle: h.pageTitle,
            url: h.url,
            favicon: h.favicon,
            highlights: []
          };
        }
        grouped[h.pageId].highlights.push(h);
      }
      pages = Object.values(grouped);
    } else {
      pages = await Storage.getOrganizedHighlights();
    }

    if (pages.length === 0) {
      content.innerHTML = `
        <div class="sm-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          <p>No highlights yet</p>
          <span>Select any text to highlight it</span>
        </div>
      `;
      return;
    }

    const currentPageId = Helpers.getPageId();

    content.innerHTML = pages.map(page => {
      const isCurrent = page.pageId === currentPageId;
      
      return `
        <div class="sm-page ${isCurrent ? 'current' : ''}" data-page-id="${page.pageId}">
          <div class="sm-page-header">
            <img src="${page.favicon}" class="sm-favicon" onerror="this.style.display='none'">
            <a href="${page.url}" class="sm-page-title" title="${page.url}">${Helpers.escapeHtml(page.pageTitle)}</a>
            <span class="sm-count">${page.highlights.length}</span>
            <button class="sm-page-delete" title="Delete all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>
          <div class="sm-highlights">
            ${page.highlights.map(h => this.renderHighlight(h, isCurrent)).join('')}
          </div>
        </div>
      `;
    }).join('');

    this.bindContentEvents();
  },

  renderHighlight(h, isCurrentPage) {
    const text = h.text.length > 120 ? h.text.substring(0, 120) + '...' : h.text;
    
    return `
      <div class="sm-hl" data-id="${h.id}">
        <div class="sm-hl-color" style="background:${h.color}"></div>
        <div class="sm-hl-body">
          <div class="sm-hl-text">${Helpers.escapeHtml(text)}</div>
          ${h.note ? `<div class="sm-hl-note">${Helpers.escapeHtml(h.note)}</div>` : ''}
        </div>
        <div class="sm-hl-actions">
          ${isCurrentPage ? `
            <button class="sm-hl-btn goto" title="Go to">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4-4 4 4"/>
              </svg>
            </button>
          ` : ''}
          <button class="sm-hl-btn delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  bindContentEvents() {
    // Delete page
    this.container.querySelectorAll('.sm-page-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const page = btn.closest('.sm-page');
        const pageId = page.dataset.pageId;
        
        if (confirm('Delete all highlights from this page?')) {
          await Storage.deletePageHighlights(pageId);
          
          // Remove from DOM if current page
          if (pageId === Helpers.getPageId()) {
            Highlighter.activeHighlights.forEach((hl, id) => {
              Highlighter.removeHighlight(id);
            });
          }
          
          this.refresh();
        }
      });
    });

    // Go to highlight
    this.container.querySelectorAll('.sm-hl-btn.goto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.sm-hl').dataset.id;
        Highlighter.scrollTo(id);
      });
    });

    // Delete highlight
    this.container.querySelectorAll('.sm-hl-btn.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const hl = btn.closest('.sm-hl');
        const id = hl.dataset.id;
        
        await Highlighter.removeHighlight(id);
        this.refresh();
      });
    });

    // Click highlight to edit note
    this.container.querySelectorAll('.sm-hl').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        Highlighter.showNoteModal(id);
      });
    });
  }
};

window.Sidebar = Sidebar;
