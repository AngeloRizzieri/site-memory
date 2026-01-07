const SelectionHandler = {
  currentSelection: null,

  // Get current text selection data
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

  // Clear current selection
  clearSelection() {
    this.currentSelection = null;
    window.getSelection()?.removeAllRanges();
  },

  // Show modal to add note before saving
  showSaveModal() {
    const selectionData = this.getSelectionData();
    
    if (!selectionData) {
      console.log('[Site Memory] No valid selection to save');
      return;
    }

    // Create modal overlay
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

    // Focus textarea
    const textarea = overlay.querySelector('textarea');
    textarea.focus();

    // Handle cancel
    overlay.querySelector('.site-memory-btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    // Handle click outside
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Handle save
    overlay.querySelector('.site-memory-btn-save').addEventListener('click', async () => {
      const note = textarea.value.trim();
      await this.saveCurrentSelection(note);
      overlay.remove();
    });

    // Handle Enter to save (Shift+Enter for newline)
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

  // Save the current selection
  async saveCurrentSelection(note = '') {
    // Use the cached selection data, not a fresh call
    if (!this.currentSelection) {
      console.log('[Site Memory] No valid selection to save');
      return null;
    }
    
    const highlight = createHighlight({
      ...this.currentSelection,
      note
    });
    
    const result = await StorageManager.saveHighlight(highlight);
    
    if (result.success) {
      HighlightRenderer.renderHighlight(highlight);
      this.clearSelection();
      // Refresh sidebar if open
      if (window.Sidebar) {
        Sidebar.refresh();
      }
    }
    
    return result;
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Make available globally
window.SelectionHandler = SelectionHandler;