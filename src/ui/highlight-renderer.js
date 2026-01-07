const HighlightRenderer = {
  highlightClass: 'site-memory-highlight',
  contextMenu: null,

  renderHighlight(highlight) {
    try {
      const range = DOMUtils.deserializeRange(highlight.position);
      
      if (!range) {
        console.log('[Site Memory] Could not locate highlight:', highlight.id);
        return false;
      }
      
      const wrapper = document.createElement('mark');
      wrapper.className = this.highlightClass;
      wrapper.dataset.highlightId = highlight.id;
      wrapper.dataset.note = highlight.note || '';
      wrapper.title = highlight.note || 'Click for options';
      
      try {
        range.surroundContents(wrapper);
      } catch (e) {
        this.highlightRangeComplex(range, highlight);
      }
      
      return true;
    } catch (error) {
      console.error('[Site Memory] Render error:', error);
      return false;
    }
  },

  highlightRangeComplex(range, highlight) {
    const fragment = range.extractContents();
    const wrapper = document.createElement('mark');
    wrapper.className = this.highlightClass;
    wrapper.dataset.highlightId = highlight.id;
    wrapper.dataset.note = highlight.note || '';
    wrapper.title = highlight.note || 'Click for options';
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  },

  async renderAllHighlights() {
    const hostname = getCurrentHostname();
    if (!hostname) return;
    
    const highlights = await StorageManager.getHighlightsByHostname(hostname);
    
    let rendered = 0;
    for (const highlight of highlights) {
      if (this.renderHighlight(highlight)) {
        rendered++;
      }
    }
    
    console.log(`[Site Memory] Rendered ${rendered}/${highlights.length} highlights`);
  },

  removeHighlight(highlightId) {
    const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (element) {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
    }
  },

  scrollToHighlight(highlightId) {
    const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (element) {
      DOMUtils.scrollToElement(element);
      element.classList.add('site-memory-flash');
      setTimeout(() => element.classList.remove('site-memory-flash'), 1500);
    }
  },

  showContextMenu(highlightId, x, y, note) {
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'site-memory-context-menu';
    menu.innerHTML = `
      ${note ? `<button class="view-note">📝 View Note</button>` : ''}
      <button class="scroll-to">🎯 Scroll to Highlight</button>
      <button class="delete">🗑️ Delete Highlight</button>
    `;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    if (note) {
      menu.querySelector('.view-note').addEventListener('click', () => {
        this.showNoteModal(note);
        this.hideContextMenu();
      });
    }

    menu.querySelector('.scroll-to').addEventListener('click', () => {
      this.scrollToHighlight(highlightId);
      this.hideContextMenu();
    });

    menu.querySelector('.delete').addEventListener('click', async () => {
      const hostname = getCurrentHostname();
      await StorageManager.deleteHighlight(hostname, highlightId);
      this.removeHighlight(highlightId);
      this.hideContextMenu();
      if (window.Sidebar) {
        Sidebar.refresh();
      }
    });

    document.body.appendChild(menu);
    this.contextMenu = menu;

    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    }, 10);
  },

  showNoteModal(note) {
    const overlay = document.createElement('div');
    overlay.className = 'site-memory-modal-overlay';
    overlay.innerHTML = `
      <div class="site-memory-modal site-memory-note-modal">
        <h3>📝 Note</h3>
        <div class="site-memory-note-content">${this.escapeHtml(note)}</div>
        <div class="site-memory-modal-buttons">
          <button class="site-memory-btn-save">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();

    overlay.querySelector('.site-memory-btn-save').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handler);
      }
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }
};

window.HighlightRenderer = HighlightRenderer;
