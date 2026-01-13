/**
 * Highlighter - handles text selection and highlight rendering
 * Auto-highlights on selection, shows color picker popup
 */

const Highlighter = {
  colors: ['#facc15', '#4ade80', '#60a5fa', '#f472b6', '#c084fc', '#fb923c'],
  activeHighlights: new Map(),
  popup: null,
  currentSelection: null,
  pendingHighlight: null,

  init() {
    this.createPopup();
    this.bindEvents();
    this.restoreHighlights();
  },

  // Create the color picker popup
  createPopup() {
    this.popup = document.createElement('div');
    this.popup.className = 'sm-popup';
    this.popup.innerHTML = `
      <div class="sm-popup-colors">
        ${this.colors.map((c, i) => `
          <button class="sm-color ${i === 0 ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>
        `).join('')}
      </div>
      <div class="sm-popup-actions">
        <button class="sm-popup-btn sm-add-note" title="Add note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </button>
        <button class="sm-popup-btn sm-delete" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(this.popup);

    // Color selection
    this.popup.querySelectorAll('.sm-color').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.popup.querySelectorAll('.sm-color').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.changeColor(btn.dataset.color);
      });
    });

    // Add note
    this.popup.querySelector('.sm-add-note').addEventListener('click', (e) => {
      e.stopPropagation();
      this.addNote();
    });

    // Delete
    this.popup.querySelector('.sm-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteCurrentHighlight();
    });
  },

  // Bind event listeners
  bindEvents() {
    // Auto-highlight on mouseup
    document.addEventListener('mouseup', (e) => {
      // Ignore clicks in popup or sidebar
      if (e.target.closest('.sm-popup') || e.target.closest('.sm-sidebar')) return;
      
      setTimeout(() => this.handleSelection(e), 10);
    });

    // Hide popup on click outside
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.sm-popup') && !e.target.closest('.site-memory-hl')) {
        this.hidePopup();
      }
    });

    // Hide popup on scroll
    document.addEventListener('scroll', () => this.hidePopup(), true);

    // Click on existing highlight
    document.addEventListener('click', (e) => {
      const hl = e.target.closest('.site-memory-hl');
      if (hl) {
        e.preventDefault();
        this.showPopupForHighlight(hl);
      }
    });

    // Listen for messages
    chrome.runtime.onMessage.addListener((msg, sender, respond) => {
      if (msg.action === 'toggleSidebar') {
        window.Sidebar?.toggle();
      }
    });
  },

  // Handle text selection - AUTO HIGHLIGHT
  handleSelection(e) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) return;

    const range = selection.getRangeAt(0);
    
    // Create highlight immediately with default yellow
    const highlight = this.createHighlight(text, range, this.colors[0]);
    
    if (highlight) {
      this.pendingHighlight = highlight;
      this.showPopup(highlight.element, highlight.id);
      
      // Save to storage
      Storage.addHighlight(highlight.data);
      
      // Clear selection
      selection.removeAllRanges();
      
      // Refresh sidebar if open
      window.Sidebar?.refresh();
    }
  },

  // Create a highlight element
  createHighlight(text, range, color) {
    try {
      const id = Helpers.generateId();
      
      // Create wrapper
      const wrapper = document.createElement('mark');
      wrapper.className = 'site-memory-hl';
      wrapper.dataset.id = id;
      wrapper.style.setProperty('--hl-color', color);

      // Get context for later restoration
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
      }
      const context = container.textContent.substring(
        Math.max(0, container.textContent.indexOf(text) - 20),
        Math.min(container.textContent.length, container.textContent.indexOf(text) + text.length + 20)
      );

      // Wrap the range
      range.surroundContents(wrapper);

      const data = {
        id,
        text,
        color,
        note: '',
        context,
        pageId: Helpers.getPageId(),
        pageTitle: Helpers.getPageTitle(),
        url: window.location.href,
        favicon: Helpers.getFavicon(),
        createdAt: Date.now()
      };

      this.activeHighlights.set(id, { element: wrapper, data });

      return { element: wrapper, data, id };
    } catch (err) {
      console.log('Could not highlight:', err);
      return null;
    }
  },

  // Restore highlights for current page
  async restoreHighlights() {
    const highlights = await Storage.getPageHighlights();
    
    for (const h of highlights) {
      this.renderHighlight(h);
    }
  },

  // Render a saved highlight
  renderHighlight(data) {
    // Skip if already rendered
    if (this.activeHighlights.has(data.id)) return;

    const range = this.findTextRange(data.text, data.context);
    if (!range) {
      console.log('Could not find text:', data.text.substring(0, 30));
      return;
    }

    try {
      const wrapper = document.createElement('mark');
      wrapper.className = 'site-memory-hl';
      wrapper.dataset.id = data.id;
      wrapper.style.setProperty('--hl-color', data.color);
      if (data.note) wrapper.dataset.hasNote = 'true';

      range.surroundContents(wrapper);
      this.activeHighlights.set(data.id, { element: wrapper, data });
    } catch (err) {
      console.log('Could not render highlight:', err);
    }
  },

  // Find text in document and return range
  findTextRange(searchText, context) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      const idx = text.indexOf(searchText);
      
      if (idx !== -1) {
        // Verify with context if available
        if (context) {
          const parent = node.parentElement;
          if (parent && !parent.textContent.includes(context.substring(5, context.length - 5))) {
            continue; // Context doesn't match, keep looking
          }
        }
        
        try {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + searchText.length);
          return range;
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  },

  // Show popup near element
  showPopup(element, highlightId) {
    this.currentHighlightId = highlightId;
    
    const rect = element.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    
    let x = rect.left + rect.width / 2 - 90;
    let y = rect.top - 50 + window.scrollY;

    // Keep in viewport
    x = Math.max(10, Math.min(x, window.innerWidth - 190));
    if (rect.top < 60) {
      y = rect.bottom + 10 + window.scrollY;
    }

    this.popup.style.left = x + 'px';
    this.popup.style.top = y + 'px';
    this.popup.classList.add('visible');

    // Set active color
    const hl = this.activeHighlights.get(highlightId);
    if (hl) {
      this.popup.querySelectorAll('.sm-color').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === hl.data.color);
      });
    }
  },

  // Show popup for existing highlight
  showPopupForHighlight(element) {
    const id = element.dataset.id;
    this.currentHighlightId = id;
    this.showPopup(element, id);
  },

  // Hide popup
  hidePopup() {
    this.popup.classList.remove('visible');
    this.currentHighlightId = null;
    this.pendingHighlight = null;
  },

  // Change highlight color
  async changeColor(color) {
    if (!this.currentHighlightId) return;
    
    const hl = this.activeHighlights.get(this.currentHighlightId);
    if (hl) {
      hl.element.style.setProperty('--hl-color', color);
      hl.data.color = color;
      await Storage.updateHighlight(this.currentHighlightId, { color });
      window.Sidebar?.refresh();
    }
  },

  // Add note to highlight
  async addNote() {
    if (!this.currentHighlightId) return;
    
    const hl = this.activeHighlights.get(this.currentHighlightId);
    if (!hl) return;

    const note = prompt('Add a note:', hl.data.note || '');
    if (note !== null) {
      hl.data.note = note;
      hl.element.dataset.hasNote = note ? 'true' : '';
      await Storage.updateHighlight(this.currentHighlightId, { note });
      window.Sidebar?.refresh();
    }
    this.hidePopup();
  },

  // Delete current highlight
  async deleteCurrentHighlight() {
    if (!this.currentHighlightId) return;
    
    await this.removeHighlight(this.currentHighlightId);
    this.hidePopup();
    window.Sidebar?.refresh();
  },

  // Remove a highlight
  async removeHighlight(id) {
    const hl = this.activeHighlights.get(id);
    if (hl && hl.element) {
      // Unwrap the element
      const parent = hl.element.parentNode;
      const text = document.createTextNode(hl.element.textContent);
      parent.replaceChild(text, hl.element);
      parent.normalize();
    }
    this.activeHighlights.delete(id);
    await Storage.deleteHighlight(id);
  },

  // Scroll to a highlight
  scrollTo(id) {
    const hl = this.activeHighlights.get(id);
    if (hl && hl.element) {
      hl.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Flash animation
      hl.element.classList.add('flash');
      setTimeout(() => hl.element.classList.remove('flash'), 1500);
    }
  }
};

window.Highlighter = Highlighter;
