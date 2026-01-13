/**
 * Selection Handler
 * Manages text selection and highlight creation
 */

const SelectionHandler = {
  currentSelection: null,
  quickMenu: null,
  selectedColor: '#fbbf24',
  colors: [
    '#fbbf24', // Yellow
    '#34d399', // Green  
    '#60a5fa', // Blue
    '#f472b6', // Pink
    '#a78bfa', // Purple
    '#fb923c', // Orange
  ],

  /**
   * Initialize the selection handler
   */
  init() {
    this.createQuickMenu();
    this.setupEventListeners();
  },

  /**
   * Create the quick action menu that appears on selection
   */
  createQuickMenu() {
    this.quickMenu = document.createElement('div');
    this.quickMenu.className = 'site-memory-quick-menu';
    this.quickMenu.innerHTML = `
      <div class="sm-quick-menu-content">
        <div class="sm-color-picker">
          ${this.colors.map((color, i) => `
            <button class="sm-color-btn ${i === 0 ? 'active' : ''}" 
                    data-color="${color}" 
                    style="background-color: ${color}"
                    title="Highlight color">
            </button>
          `).join('')}
        </div>
        <div class="sm-quick-actions">
          <button class="sm-save-btn" title="Save highlight (Ctrl+Shift+H)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.quickMenu);
    this.setupQuickMenuEvents();
  },

  /**
   * Setup events for the quick menu
   */
  setupQuickMenuEvents() {
    // Color selection
    this.quickMenu.querySelectorAll('.sm-color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Update active state
        this.quickMenu.querySelectorAll('.sm-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.selectedColor = btn.dataset.color;
      });
    });

    // Save button
    this.quickMenu.querySelector('.sm-save-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveCurrentSelection();
    });

    // Prevent menu from closing when clicking inside
    this.quickMenu.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  },

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Track selection changes
    document.addEventListener('mouseup', (e) => {
      // Ignore if clicking inside sidebar or menu
      if (e.target.closest('.site-memory-sidebar') || 
          e.target.closest('.site-memory-quick-menu')) {
        return;
      }

      setTimeout(() => this.handleSelectionChange(e), 10);
    });

    // Hide menu on scroll or click elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.site-memory-quick-menu')) {
        this.hideQuickMenu();
      }
    });

    document.addEventListener('scroll', () => {
      this.hideQuickMenu();
    }, true);

    // Keyboard shortcut for saving
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.saveCurrentSelection();
      }
    });
  },

  /**
   * Handle selection changes
   */
  handleSelectionChange(e) {
    const details = DomUtils.getSelectionDetails();
    
    if (!details) {
      this.hideQuickMenu();
      this.currentSelection = null;
      return;
    }

    this.currentSelection = details;
    this.showQuickMenu(details.rect || { 
      left: e.clientX, 
      top: e.clientY - 50,
      width: 0
    });
  },

  /**
   * Show the quick menu near the selection
   */
  showQuickMenu(rect) {
    const menu = this.quickMenu;
    const menuRect = menu.getBoundingClientRect();
    
    // Position above selection
    let left = rect.left + (rect.width / 2) - 80;
    let top = rect.top - 60 + window.scrollY;

    // Keep within viewport
    if (left < 10) left = 10;
    if (left + 160 > window.innerWidth) left = window.innerWidth - 170;
    if (top < 10) top = rect.bottom + 10 + window.scrollY;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.classList.add('visible');
  },

  /**
   * Hide the quick menu
   */
  hideQuickMenu() {
    this.quickMenu.classList.remove('visible');
  },

  /**
   * Save the current selection as a highlight
   */
  async saveCurrentSelection() {
    if (!this.currentSelection) {
      console.log('No selection to save');
      return;
    }

    const { text, xpath, textOffset, textLength, context } = this.currentSelection;
    const url = window.location.href;

    const highlight = DataModels.createHighlight({
      text,
      color: this.selectedColor,
      pageId: UrlUtils.getPageId(url),
      url,
      hostname: UrlUtils.getHostname(url),
      pageTitle: DomUtils.getPageTitle(),
      xpath,
      textOffset,
      textLength,
      context,
      isPdf: UrlUtils.isPdfUrl(url)
    });

    try {
      await StorageManager.addHighlight(highlight);
      
      // Apply the highlight visually
      HighlightRenderer.renderHighlight(highlight);
      
      // Clear selection and hide menu
      window.getSelection().removeAllRanges();
      this.hideQuickMenu();
      this.currentSelection = null;

      // Notify sidebar to refresh
      if (window.Sidebar) {
        Sidebar.refresh();
      }

      // Show brief success feedback
      this.showSaveToast();
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }
  },

  /**
   * Show a brief toast notification
   */
  showSaveToast() {
    const toast = document.createElement('div');
    toast.className = 'site-memory-toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Highlight saved
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Remove after animation
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};

// Make available globally
window.SelectionHandler = SelectionHandler;
