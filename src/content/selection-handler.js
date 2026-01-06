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
    
    if (text.length < 3) return null; // Minimum 3 characters
    
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

  // Save the current selection
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
      // Render the highlight immediately
      HighlightRenderer.renderHighlight(highlight);
      this.clearSelection();
    }
    
    return result;
  }
};

// Make available globally
window.SelectionHandler = SelectionHandler;