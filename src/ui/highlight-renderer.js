/**
 * Highlight Renderer
 * Renders saved highlights on the page and manages their visual state
 */

const HighlightRenderer = {
  renderedHighlights: new Map(),
  tooltip: null,

  /**
   * Initialize the renderer
   */
  init() {
    this.createTooltip();
    this.setupEventListeners();
  },

  /**
   * Create the tooltip element for highlight hover
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'site-memory-tooltip';
    this.tooltip.innerHTML = `
      <div class="sm-tooltip-content">
        <div class="sm-tooltip-note"></div>
        <div class="sm-tooltip-actions">
          <button class="sm-tooltip-btn sm-edit-note" title="Edit note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="sm-tooltip-btn sm-delete" title="Delete highlight">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(this.tooltip);
  },

  /**
   * Setup event listeners for highlight interactions
   */
  setupEventListeners() {
    // Delegate hover events for highlights
    document.addEventListener('mouseover', (e) => {
      const highlight = e.target.closest('.site-memory-highlight');
      if (highlight) {
        this.showTooltip(highlight);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const highlight = e.target.closest('.site-memory-highlight');
      if (highlight && !e.relatedTarget?.closest('.site-memory-tooltip')) {
        this.hideTooltip();
      }
    });

    // Keep tooltip visible when hovering over it
    this.tooltip.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });

    // Tooltip button actions
    this.tooltip.querySelector('.sm-edit-note').addEventListener('click', () => {
      this.editCurrentHighlightNote();
    });

    this.tooltip.querySelector('.sm-delete').addEventListener('click', () => {
      this.deleteCurrentHighlight();
    });
  },

  /**
   * Render all highlights for the current page
   */
  async renderPageHighlights() {
    const pageId = UrlUtils.getPageId(window.location.href);
    const highlights = await StorageManager.getHighlightsForPage(pageId);
    
    console.log(`Site Memory: Restoring ${highlights.length} highlights for page`);

    for (const highlight of highlights) {
      this.renderHighlight(highlight);
    }
  },

  /**
   * Render a single highlight
   */
  renderHighlight(highlight) {
    // Don't render if already rendered
    if (this.renderedHighlights.has(highlight.id)) {
      return this.renderedHighlights.get(highlight.id);
    }

    // Find the text in the document
    const range = DomUtils.findTextWithContext(
      highlight.text,
      highlight.context,
      highlight.xpath
    );

    if (!range) {
      console.warn(`Could not find text for highlight: "${highlight.text.substring(0, 30)}..."`);
      return null;
    }

    // Wrap with highlight element
    const wrapper = DomUtils.wrapRangeWithHighlight(range, highlight.id, highlight.color);
    
    if (wrapper) {
      wrapper.dataset.hasNote = highlight.note ? 'true' : 'false';
      this.renderedHighlights.set(highlight.id, wrapper);
      return wrapper;
    }

    return null;
  },

  /**
   * Remove a highlight from the page
   */
  removeHighlight(highlightId) {
    DomUtils.removeHighlightWrapper(highlightId);
    this.renderedHighlights.delete(highlightId);
  },

  /**
   * Show tooltip for a highlight
   */
  async showTooltip(highlightElement) {
    const highlightId = highlightElement.dataset.highlightId;
    const highlights = await StorageManager.getHighlightsForPage(
      UrlUtils.getPageId(window.location.href)
    );
    const highlight = highlights.find(h => h.id === highlightId);

    if (!highlight) return;

    this.currentHighlightId = highlightId;

    // Update tooltip content
    const noteEl = this.tooltip.querySelector('.sm-tooltip-note');
    if (highlight.note) {
      noteEl.textContent = highlight.note;
      noteEl.style.display = 'block';
    } else {
      noteEl.textContent = 'Click edit to add a note';
      noteEl.style.display = 'block';
      noteEl.style.opacity = '0.5';
      noteEl.style.fontStyle = 'italic';
    }

    // Position tooltip
    const rect = highlightElement.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - 100;
    let top = rect.bottom + 8 + window.scrollY;

    // Keep within viewport
    if (left < 10) left = 10;
    if (left + 200 > window.innerWidth) left = window.innerWidth - 210;
    
    // If would go below viewport, show above
    if (rect.bottom + tooltipRect.height + 20 > window.innerHeight) {
      top = rect.top - tooltipRect.height - 8 + window.scrollY;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.classList.add('visible');
  },

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.classList.remove('visible');
    this.currentHighlightId = null;
  },

  /**
   * Edit the current highlight's note
   */
  async editCurrentHighlightNote() {
    if (!this.currentHighlightId) return;

    const highlights = await StorageManager.getHighlightsForPage(
      UrlUtils.getPageId(window.location.href)
    );
    const highlight = highlights.find(h => h.id === this.currentHighlightId);

    if (!highlight) return;

    const newNote = prompt('Add a note to this highlight:', highlight.note || '');
    
    if (newNote !== null) {
      await StorageManager.updateHighlight(this.currentHighlightId, { note: newNote });
      
      // Update visual indicator
      const wrapper = this.renderedHighlights.get(this.currentHighlightId);
      if (wrapper) {
        wrapper.dataset.hasNote = newNote ? 'true' : 'false';
      }

      // Refresh sidebar
      if (window.Sidebar) {
        Sidebar.refresh();
      }
    }

    this.hideTooltip();
  },

  /**
   * Delete the current highlight
   */
  async deleteCurrentHighlight() {
    if (!this.currentHighlightId) return;

    const confirmed = confirm('Delete this highlight?');
    if (!confirmed) return;

    await StorageManager.deleteHighlight(this.currentHighlightId);
    this.removeHighlight(this.currentHighlightId);
    this.hideTooltip();

    // Refresh sidebar
    if (window.Sidebar) {
      Sidebar.refresh();
    }
  },

  /**
   * Update highlight color
   */
  async updateHighlightColor(highlightId, color) {
    await StorageManager.updateHighlight(highlightId, { color });
    
    const wrapper = this.renderedHighlights.get(highlightId);
    if (wrapper) {
      wrapper.style.setProperty('--highlight-color', color);
    }
  },

  /**
   * Scroll to a highlight
   */
  scrollToHighlight(highlightId) {
    const wrapper = this.renderedHighlights.get(highlightId);
    if (wrapper) {
      DomUtils.scrollToElement(wrapper);
      
      // Flash effect
      wrapper.classList.add('flash');
      setTimeout(() => wrapper.classList.remove('flash'), 1000);
    }
  },

  /**
   * Clear all rendered highlights
   */
  clearAll() {
    for (const [id, wrapper] of this.renderedHighlights) {
      DomUtils.removeHighlightWrapper(id);
    }
    this.renderedHighlights.clear();
  }
};

// Make available globally
window.HighlightRenderer = HighlightRenderer;
