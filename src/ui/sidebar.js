/**
 * Sidebar — file explorer style, grouped by domain → page → highlight
 */

const Sidebar = {
  container: null,
  isOpen: false,
  searchQuery: '',
  filterCurrentPage: false,
  collapsedDomains: new Set(),
  collapsedPages: new Set(),
  customNames: { domains: {}, pages: {} },

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
        <div class="sm-resize-handle"></div>
        <div class="sm-header">
          <span class="sm-title">Memory</span>
          <button class="sm-filter-btn" title="Show this page only">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
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

    // Filter to current page toggle
    this.container.querySelector('.sm-filter-btn').addEventListener('click', () => {
      this.filterCurrentPage = !this.filterCurrentPage;
      this.container.querySelector('.sm-filter-btn').classList.toggle('active', this.filterCurrentPage);
      this.refresh();
    });

    const input = this.container.querySelector('.sm-search-input');
    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.refresh();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Resize handle — drag left edge to resize panel width
    const handle = this.container.querySelector('.sm-resize-handle');
    const panel  = this.container.querySelector('.sm-panel');
    let startX, startW;
    const onMove = (e) => {
      const w = Math.max(220, Math.min(480, startW + (startX - e.clientX)));
      panel.style.width = w + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startW = panel.offsetWidth;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  },

  toggle() { this.isOpen ? this.close() : this.open(); },

  getPageBackground() {
    const tryBg = (el) => {
      const c = window.getComputedStyle(el).backgroundColor;
      return (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') ? c : null;
    };
    return tryBg(document.body) || tryBg(document.documentElement) || '#ffffff';
  },

  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.container.querySelector('.sm-panel').style.setProperty('--sm-bg', this.getPageBackground());
    this.refresh();
  },

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
  },

  async getGroups() {
    this.customNames = await Storage.getCustomNames();
    const currentPageId = Helpers.getPageId();
    let pages;

    if (this.searchQuery) {
      let results = await Storage.search(this.searchQuery);
      if (this.filterCurrentPage) results = results.filter(h => h.pageId === currentPageId);
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
      if (this.filterCurrentPage) pages = pages.filter(p => p.pageId === currentPageId);
    }

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          <p>${this.searchQuery ? 'No results' : 'No highlights yet'}</p>
          <span>${this.searchQuery ? 'Try a different search' : this.filterCurrentPage ? 'No highlights on this page yet' : 'Select text, right-click → Highlight'}</span>
        </div>
      `;
      return;
    }

    content.innerHTML = groups.map(g => this.renderDomain(g, currentPageId)).join('');
    this.bindContentEvents();
  },

  getDomainLabel(domain) {
    return this.customNames.domains[domain] || domain;
  },

  getPageLabel(page) {
    return this.customNames.pages[page.pageId] || page.pageTitle;
  },

  renderDomain(group, currentPageId) {
    const total = group.pages.reduce((s, p) => s + p.highlights.length, 0);
    const collapsed = this.collapsedDomains.has(group.domain);
    const label = Helpers.escapeHtml(this.getDomainLabel(group.domain));
    return `
      <div class="sm-domain" data-domain="${Helpers.escapeHtml(group.domain)}">
        <div class="sm-domain-row">
          <span class="sm-chevron ${collapsed ? 'collapsed' : ''}">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>
          </span>
          ${group.favicon ? `<img src="${group.favicon}" class="sm-favicon" onerror="this.style.display='none'" alt="">` : ''}
          <span class="sm-domain-name">${label}</span>
          <span class="sm-badge">${total}</span>
        </div>
        ${collapsed ? '' : `<div class="sm-domain-body">${group.pages.map(p => this.renderPage(p, currentPageId)).join('')}</div>`}
      </div>
    `;
  },

  renderPage(page, currentPageId) {
    const isCurrent = page.pageId === currentPageId;
    const collapsed = this.collapsedPages.has(page.pageId);
    const label = Helpers.escapeHtml(this.getPageLabel(page));
    return `
      <div class="sm-page-item ${isCurrent ? 'current' : ''}" data-page-id="${page.pageId}" data-url="${Helpers.escapeHtml(page.url)}">
        <div class="sm-page-row">
          <span class="sm-chevron ${collapsed ? 'collapsed' : ''}">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>
          </span>
          <span class="sm-page-name">${label}</span>
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
    const text = h.text.length > 60 ? h.text.substring(0, 60) + '…' : h.text;
    const hasNote = h.note && !h.isImage;
    const leadEl = h.isImage
      ? `<img src="${Helpers.escapeHtml(h.imageSrc || h.note || '')}" class="sm-hl-thumb" alt="" onerror="this.style.display='none'">`
      : `<span class="sm-dot" style="background:${h.color}"></span>`;
    const chevron = `<svg class="sm-note-chev" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>`;
    return `
      <div class="sm-hl-row" data-id="${h.id}">
        ${leadEl}
        <div class="sm-hl-body">
          <span class="sm-hl-snippet">${Helpers.escapeHtml(text)}</span>
          ${hasNote ? `<span class="sm-hl-note">${chevron}${Helpers.escapeHtml(h.note)}</span>` : ''}
        </div>
        <span class="sm-hl-time">${Helpers.timeAgo(h.createdAt)}</span>
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

  // Inline rename: swap label span with an input
  startRename(el, currentValue, onSave) {
    const input = document.createElement('input');
    input.className = 'sm-rename-input';
    input.value = currentValue;
    el.replaceWith(input);
    input.focus();
    input.select();

    let saved = false;
    const finish = () => {
      if (saved) return;
      saved = true;
      onSave(input.value.trim());
      this.refresh();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { saved = true; this.refresh(); }
    });
    input.addEventListener('blur', finish);
  },

  bindContentEvents() {
    const content = this.container.querySelector('.sm-content');

    // Domain row toggle (whole row except the label span)
    content.querySelectorAll('.sm-domain-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.sm-domain-name')) return;
        const domain = row.closest('.sm-domain').dataset.domain;
        this.collapsedDomains.has(domain)
          ? this.collapsedDomains.delete(domain)
          : this.collapsedDomains.add(domain);
        this.refresh();
      });
    });

    // Domain name: single click = toggle, double click = rename
    content.querySelectorAll('.sm-domain-name').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const domain = el.closest('.sm-domain').dataset.domain;
        this.collapsedDomains.has(domain)
          ? this.collapsedDomains.delete(domain)
          : this.collapsedDomains.add(domain);
        this.refresh();
      });
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const domain = el.closest('.sm-domain').dataset.domain;
        this.startRename(el, this.getDomainLabel(domain), async (name) => {
          await Storage.setCustomName('domains', domain, name);
        });
      });
    });

    // Page row toggle
    content.querySelectorAll('.sm-page-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.sm-pg-del') || e.target.closest('.sm-page-name')) return;
        const pageId = row.closest('.sm-page-item').dataset.pageId;
        this.collapsedPages.has(pageId)
          ? this.collapsedPages.delete(pageId)
          : this.collapsedPages.add(pageId);
        this.refresh();
      });
    });

    // Page name: single click = open tab, double click = rename
    content.querySelectorAll('.sm-page-name').forEach(el => {
      let clickTimer = null;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          const url = el.closest('.sm-page-item').dataset.url;
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        }, 230);
      });
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        clearTimeout(clickTimer);
        const item = el.closest('.sm-page-item');
        const pageId = item.dataset.pageId;
        const current = this.getPageLabel({ pageId, pageTitle: el.textContent });
        this.startRename(el, current, async (name) => {
          await Storage.setCustomName('pages', pageId, name);
        });
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

    // Note expand/collapse — stop propagation so row click doesn't fire
    content.querySelectorAll('.sm-hl-note').forEach(note => {
      note.addEventListener('click', (e) => {
        e.stopPropagation();
        note.classList.toggle('expanded');
      });
    });

    // Click highlight row → scroll to it and show popup bubble
    content.querySelectorAll('.sm-hl-row').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.sm-hl-action') || e.target.closest('.sm-hl-note')) return;
        Highlighter.scrollToAndShowPopup(el.dataset.id);
      });
    });
  }
};

window.Sidebar = Sidebar;
