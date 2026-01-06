const HighlightRenderer = {
  highlightClass: 'site-memory-highlight',
  
  // Render a single highlight on the page
  renderHighlight(highlight) {
    try {
      const range = DOMUtils.deserializeRange(highlight.position);
      
      if (!range) {
        console.log('[Site Memory] Could not locate highlight:', highlight.id);
        return false;
      }
      
      // Create highlight wrapper
      const wrapper = document.createElement('mark');
      wrapper.className = this.highlightClass;
      wrapper.dataset.highlightId = highlight.id;
      wrapper.title = highlight.note || 'Saved highlight';
      
      // Wrap the range
      try {
        range.surroundContents(wrapper);
      } catch (e) {
        // Range spans multiple elements, use alternative method
        this.highlightRangeComplex(range, highlight);
      }
      
      return true;
    } catch (error) {
      console.error('[Site Memory] Render error:', error);
      return false;
    }
  },

  // Handle complex ranges that span multiple elements
  highlightRangeComplex(range, highlight) {
    const fragment = range.extractContents();
    const wrapper = document.createElement('mark');
    wrapper.className = this.highlightClass;
    wrapper.dataset.highlightId = highlight.id;
    wrapper.title = highlight.note || 'Saved highlight';
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  },

  // Render all highlights for current page
  async renderAllHighlights() {
    const hostname = getCurrentHostname();
    if (!hostname) return;
    
    const highlights = await StorageManager.getHighlightsByHostname(hostname);
    
    let rendered = 0;
    for (const highlight of highlights) {
      // Only render highlights for this specific URL or all URL highlights
      if (this.renderHighlight(highlight)) {
        rendered++;
      }
    }
    
    console.log(`[Site Memory] Rendered ${rendered}/${highlights.length} highlights`);
  },

  // Remove a highlight from the DOM
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

  // Scroll to a specific highlight
  scrollToHighlight(highlightId) {
    const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (element) {
      DOMUtils.scrollToElement(element);
      // Flash effect
      element.classList.add('site-memory-flash');
      setTimeout(() => element.classList.remove('site-memory-flash'), 1500);
    }
  }
};

// Make available globally
window.HighlightRenderer = HighlightRenderer;