const SelectionHandler = {
  currentSelection: null,

  getSelectionData() {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return null;
    }
    
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    
    if (text.length < 3) return null;
    
    const position = DOMUtils.serializeRange(range);
    
    this.currentSelection = {
      text,
      ...position,
      hostname: getCurrentHostname(),
      url: window.location.href
    };
    
    return this.currentSelection;
  },

  clearSelection() {
    this.currentSelection = null;
    window.getSelection()?.removeAllRanges();
  },

  showSaveModal() {
    const selectionData = this.getSelectionData();
    
    if (!selectionData) {
      console.log('[Site Memory] No valid selection to save');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'site-memory-modal-overlay';
    overlay.innerHTML = `
      <div class="site-memory-modal">
        <h3>💾 Save Highlight</h3>
        <div class="site-memory-modal-text">"${this.escapeHtml(selectionData.text)}"</div>
        <textarea placeholder="Add a note (optional)..." id="site-memory-note-input"></textarea>
        <div class="site-memory-modal-buttons">
          <button class="site-memory-btn-cancel">Cancel</button>
          <button class="site-memory-btn-save">Save Highlight</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('textarea');
    textarea.focus();

    overlay.querySelector('.site-memory-btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    overlay.querySelector('.site-memory-btn-save').addEventListener('click', async () => {
      const note = textarea.value.trim();
      await this.saveCurrentSelection(note);
      overlay.remove();
    });

    textarea.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const note = textarea.value.trim();
        await this.saveCurrentSelection(note);
        overlay.remove();
      }
      if (e.key === 'Escape') {
        overlay.remove();
      }
    });
  },

  async saveCurrentSelection(note = '') {
    const selectionData = this.getSelectionData();
    
    if (!selectionData) {
      console.log('[Site Memory] No valid selection to save');
      return null;
    }
    
    const highlight = createHighlight({
      ...selectionData,
      note
    });
    
    const result = await StorageManager.saveHighlight(highlight);
    
    if (result.success) {
      HighlightRenderer.renderHighlight(highlight);
      this.clearSelection();
      if (window.Sidebar) {
        Sidebar.refresh();
      }
    }
    
    return result;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.SelectionHandler = SelectionHandler;