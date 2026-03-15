/**
 * Sidebar — file explorer style, grouped by domain → page → highlight
 */

const Sidebar = {
  container: null,
  isOpen: false,
  searchQuery: '',
  collapsedDomains: new Set(),
  collapsedPages: new Set(),

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
          <span class="sm-title">Memory</span>
          <button class="sm-close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div class="sm-search">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" placeholder="Search" class="sm-search-input">
        </div>
        <div class="sm-content"></div>
      </div>
    `;
    document.body.appendChild(this.container);
  },

  bindEvents() {
    this.container.querySelector('.sm-close').addEventListener('click', () => this.close());
    this.container.querySelector('.sm-backdrop').addEventListener('click', () => this.close());

    const input = this.container.querySelector('.sm-search-input');
    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.refresh();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  },

  toggle() { this.isOpen ? this.close() : this.open(); },

  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.refresh();
  },

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
  },

  // Build domain → pages → highlights tree from storage
  async getGroups() {
    let pages;
    if (this.searchQuery) {
      const results = await Storage.search(this.searchQuery);
      const grouped = {};
      for (const h of results) {
        if (!grouped[h.pageId]) {
          grouped[h.pageId] = {
            pageId: h.pageId, pageTitle: h.pageTitle,
            url: h.url, favicon: h.favicon, highlights: []
          };
        }
        grouped[h.pageId].highlights.push(h);
      }
      pages = Object.values(grouped);
    } else {
      pages = await Storage.getOrganizedHighlights();
    }

    // Group pages by domain
    const domains = {};
    for (const page of pages) {
      let domain;
      try { domain = new URL(page.url).hostname.replace(/^www\./, ''); }
      catch { domain = 'local'; }
      if (!domains[domain]) {
        domains[domain] = { domain, favicon: page.favicon, pages: [] };
      }
      domains[domain].pages.push(page);
    }
    return Object.values(domains);
  },

  async refresh() {
    if (!this.isOpen) return;
    const content = this.container.querySelector('.sm-content');
    const groups = await this.getGroups();
    const currentPageId = Helpers.getPageId();

    if (groups.length === 0) {
      content.innerHTML = `
        <div class="sm-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          <p>${this.searchQuery ? 'No results' : 'No highlights yet'}</p>
          <span>${this.searchQuery ? 'Try a different search' : 'Select any text to start'}</span>
        </div>
      `;
      return;
    }

    content.innerHTML = groups.map(g => this.renderDomain(g, currentPageId)).join('');
    this.bindContentEvents();
  },

  renderDomain(group, currentPageId) {
    const total = group.pages.reduce((s, p) => s + p.highlights.length, 0);
    const collapsed = this.collapsedDomains.has(group.domain);
    return `
      <div class="sm-domain" data-domain="${Helpers.escapeHtml(group.domain)}">
        <div class="sm-domain-row">
          <span class="sm-chevron ${collapsed ? 'collapsed' : ''}">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </span>
          <img src="${group.favicon}" class="sm-favicon" onerror="this.style.display='none'" alt="">
          <span class="sm-domain-name">${Helpers.escapeHtml(group.domain)}</span>
          <span class="sm-badge">${total}</span>
        </div>
        ${collapsed ? '' : `<div class="sm-domain-body">${group.pages.map(p => this.renderPage(p, currentPageId)).join('')}</div>`}
      </div>
    `;
  },

  renderPage(page, currentPageId) {
    const isCurrent = page.pageId === currentPageId;
    const collapsed = this.collapsedPages.has(page.pageId);
    return `
      <div class="sm-page-item ${isCurrent ? 'current' : ''}" data-page-id="${page.pageId}" data-url="${Helpers.escapeHtml(page.url)}">
        <div class="sm-page-row">
          <span class="sm-chevron ${collapsed ? 'collapsed' : ''}">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </span>
          <span class="sm-page-name" title="${Helpers.escapeHtml(page.url)}">${Helpers.escapeHtml(page.pageTitle)}</span>
          <span class="sm-badge">${page.highlights.length}</span>
          <button class="sm-pg-del" title="Delete page">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        ${collapsed ? '' : `<div class="sm-page-body">${page.highlights.map(h => this.renderHighlight(h, isCurrent)).join('')}</div>`}
      </div>
    `;
  },

  renderHighlight(h, isCurrentPage) {
    const text = h.text.length > 55 ? h.text.substring(0, 55) + '…' : h.text;
    return `
      <div class="sm-hl-row" data-id="${h.id}">
        <span class="sm-dot" style="background:${h.color}"></span>
        <span class="sm-hl-snippet">${Helpers.escapeHtml(text)}</span>
        ${isCurrentPage ? `
          <button class="sm-hl-action sm-hl-goto" title="Scroll to">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
          </button>` : ''}
        <button class="sm-hl-action sm-hl-del" title="Delete">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    `;
  },

  bindContentEvents() {
    const content = this.container.querySelector('.sm-content');

    // Domain toggle
    content.querySelectorAll('.sm-domain-row').forEach(row => {
      row.addEventListener('click', () => {
        const domain = row.closest('.sm-domain').dataset.domain;
        this.collapsedDomains.has(domain)
          ? this.collapsedDomains.delete(domain)
          : this.collapsedDomains.add(domain);
        this.refresh();
      });
    });

    // Page toggle (click row but not delete button)
    content.querySelectorAll('.sm-page-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.sm-pg-del')) return;
        const pageId = row.closest('.sm-page-item').dataset.pageId;
        this.collapsedPages.has(pageId)
          ? this.collapsedPages.delete(pageId)
          : this.collapsedPages.add(pageId);
        this.refresh();
      });
    });

    // Page name: open in new tab on click
    content.querySelectorAll('.sm-page-name').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = el.closest('.sm-page-item').dataset.url;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      });
    });

    // Delete page (two-step confirm)
    content.querySelectorAll('.sm-pg-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pageId = btn.closest('.sm-page-item').dataset.pageId;
        if (btn.dataset.confirming === 'true') {
          await Storage.deletePageHighlights(pageId);
          if (pageId === Helpers.getPageId()) {
            Highlighter.activeHighlights.forEach((_hl, id) => Highlighter.removeHighlight(id));
          }
          this.refresh();
        } else {
          btn.dataset.confirming = 'true';
          btn.style.color = '#ef4444';
          btn.style.opacity = '1';
          setTimeout(() => {
            if (btn.dataset.confirming === 'true') {
              btn.dataset.confirming = '';
              btn.style.color = '';
              btn.style.opacity = '';
            }
          }, 2000);
        }
      });
    });

    // Goto highlight
    content.querySelectorAll('.sm-hl-goto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Highlighter.scrollTo(btn.closest('.sm-hl-row').dataset.id);
      });
    });

    // Delete highlight
    content.querySelectorAll('.sm-hl-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Highlighter.removeHighlight(btn.closest('.sm-hl-row').dataset.id);
        this.refresh();
      });
    });

    // Click highlight row → add/edit note
    content.querySelectorAll('.sm-hl-row').forEach(el => {
      el.addEventListener('click', () => {
        Highlighter.showNoteModal(el.dataset.id);
      });
    });
  }
};

window.Sidebar = Sidebar;
