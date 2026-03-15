/**
 * Highlighter — select text → pick color → highlight created
 * No auto-highlight. User must confirm via color picker.
 */

const Highlighter = {
  colors: ['#a1a1aa', '#facc15', '#4ade80', '#60a5fa', '#f472b6', '#c084fc'],
  activeHighlights: new Map(),
  popup: null,
  noteModal: null,
  // Selection state (pre-confirmation)
  pendingRange: null,
  pendingText: null,
  isSelectionMode: false,
  // Edit state (existing highlight)
  currentHighlightId: null,

  init() {
    this.createPopup();
    this.createNoteModal();
    this.bindEvents();
    this.restoreHighlights();
  },

  // Popup: color dots + divider + delete (delete hidden in selection mode)
  createPopup() {
    this.popup = document.createElement('div');
    this.popup.className = 'sm-popup';
    this.popup.innerHTML = `
      <div class="sm-popup-colors">
        ${this.colors.map(c => `<button class="sm-color" data-color="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="sm-popup-divider"></div>
      <button class="sm-popup-del" title="Remove">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    document.body.appendChild(this.popup);

    // Color click: confirm new highlight OR change color of existing
    this.popup.querySelectorAll('.sm-color').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSelectionMode) {
          this.confirmHighlight(btn.dataset.color);
        } else {
          this.popup.querySelectorAll('.sm-color').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.changeColor(btn.dataset.color);
          this._schedulePopupDismiss();
        }
      });
    });

    this.popup.querySelector('.sm-popup-del').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteCurrentHighlight();
    });
  },

  // Create note modal
  createNoteModal() {
    this.noteModal = document.createElement('div');
    this.noteModal.className = 'sm-note-modal';
    this.noteModal.innerHTML = `
      <div class="sm-note-backdrop"></div>
      <div class="sm-note-dialog">
        <div class="sm-note-header">Add a note</div>
        <textarea class="sm-note-input" placeholder="Write your note here..." rows="3"></textarea>
        <div class="sm-note-actions">
          <button class="sm-note-btn cancel">Cancel</button>
          <button class="sm-note-btn save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.noteModal);

    this.noteModal.querySelector('.sm-note-backdrop').addEventListener('click', () => this.hideNoteModal());
    this.noteModal.querySelector('.sm-note-btn.cancel').addEventListener('click', () => this.hideNoteModal());
    this.noteModal.querySelector('.sm-note-btn.save').addEventListener('click', () => this.saveNote());
    this.noteModal.querySelector('.sm-note-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.saveNote(); }
      if (e.key === 'Escape') this.hideNoteModal();
    });
  },

  showNoteModal(highlightId) {
    this.editingNoteId = highlightId;
    const hl = this.activeHighlights.get(highlightId);
    const input = this.noteModal.querySelector('.sm-note-input');
    input.value = hl?.data?.note || '';
    this.noteModal.classList.add('visible');
    setTimeout(() => { input.focus(); input.select(); }, 50);
  },

  hideNoteModal() {
    this.noteModal.classList.remove('visible');
    this.editingNoteId = null;
  },

  async saveNote() {
    if (!this.editingNoteId) return;
    const note = this.noteModal.querySelector('.sm-note-input').value.trim();
    const hl = this.activeHighlights.get(this.editingNoteId);
    if (hl) {
      hl.data.note = note;
      if (hl.element) hl.element.dataset.hasNote = note ? 'true' : '';
      await Storage.updateHighlight(this.editingNoteId, { note });
      window.Sidebar?.refresh();
    }
    this.hideNoteModal();
  },

  bindEvents() {
    // Ctrl+Shift+S:
    //   — if text is selected → show color picker to save as highlight
    //   — if nothing selected → toggle sidebar
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const selection = window.getSelection();
        const hasText = selection && !selection.isCollapsed && selection.toString().trim().length >= 2;
        if (hasText) {
          this.handleSelection();
        } else {
          window.Sidebar?.toggle();
        }
      }
      if (e.key === 'Escape') this.hidePopup();
    });

    // Hide popup when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.sm-popup') && !e.target.closest('.site-memory-hl')) {
        this.hidePopup();
      }
    });

    document.addEventListener('scroll', () => this.hidePopup(), true);

    // Click existing highlight → show edit popup
    document.addEventListener('click', (e) => {
      const hl = e.target.closest('.site-memory-hl');
      if (hl) {
        e.preventDefault();
        this.showPopupForHighlight(hl);
      }
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggleSidebar') window.Sidebar?.toggle();
      if (msg.action === 'highlightSelection') {
        const sel = window.getSelection();
        const hasLive = sel && !sel.isCollapsed && sel.toString().trim().length >= 2;
        if (hasLive) {
          this.handleSelection();
        } else if (msg.text && msg.text.trim().length >= 2) {
          this.handleSelectionByText(msg.text.trim());
        }
      }
    });
  },

  // Text selected — store range and show color picker (no highlight yet)
  handleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const text = selection.toString().trim();
    if (text.length < 2) return;

    const range = selection.getRangeAt(0);
    this.pendingRange = range.cloneRange();
    this.pendingText = text;
    this.isSelectionMode = true;

    // Position popup near selection midpoint
    const rect = range.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - 55;
    let y = rect.top - 36 + window.scrollY;
    x = Math.max(8, Math.min(x, window.innerWidth - 120));
    if (rect.top < 50) y = rect.bottom + 8 + window.scrollY;

    this.popup.style.left = x + 'px';
    this.popup.style.top = y + 'px';
    this.popup.classList.remove('selection-mode'); // force reflow
    this.popup.classList.add('visible', 'selection-mode');
    this._schedulePopupDismiss();
  },

  // Fallback: selection gone by the time message arrived — find text on page
  handleSelectionByText(text) {
    const range = this.findTextRange(text, null);
    if (!range) return;
    this.pendingRange = range;
    this.pendingText = text;
    this.isSelectionMode = true;
    const rect = range.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - 55;
    let y = rect.top - 36 + window.scrollY;
    x = Math.max(8, Math.min(x, window.innerWidth - 120));
    if (rect.top < 50) y = rect.bottom + 8 + window.scrollY;
    this.popup.style.left = x + 'px';
    this.popup.style.top = y + 'px';
    this.popup.classList.remove('selection-mode');
    this.popup.classList.add('visible', 'selection-mode');
    this._schedulePopupDismiss();
  },

  // User picked a color — NOW create and save the highlight
  async confirmHighlight(color) {
    if (!this.pendingRange || !this.pendingText) return;

    const highlight = this.createHighlight(this.pendingText, this.pendingRange, color);
    this.pendingRange = null;
    this.pendingText = null;

    if (highlight) {
      await Storage.addHighlight(highlight.data);
      window.Sidebar?.refresh();
    }

    this.hidePopup();
    window.getSelection().removeAllRanges();
  },

  // Create a highlight element from a range
  createHighlight(text, range, color) {
    try {
      const id = Helpers.generateId();
      const wrapper = document.createElement('mark');
      wrapper.className = 'site-memory-hl';
      wrapper.dataset.id = id;
      wrapper.style.setProperty('--hl-color', color);

      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
      const context = container.textContent.substring(
        Math.max(0, container.textContent.indexOf(text) - 20),
        Math.min(container.textContent.length, container.textContent.indexOf(text) + text.length + 20)
      );

      range.surroundContents(wrapper);

      const data = {
        id, text, color, note: '', context,
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

  async restoreHighlights() {
    const highlights = await Storage.getPageHighlights();
    for (const h of highlights) this.renderHighlight(h);
  },

  renderHighlight(data) {
    if (this.activeHighlights.has(data.id)) return;
    const range = this.findTextRange(data.text, data.context);
    if (!range) return;
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

  findTextRange(searchText, context) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      const idx = text.indexOf(searchText);
      if (idx !== -1) {
        if (context) {
          const parent = node.parentElement;
          if (parent && !parent.textContent.includes(context.substring(5, context.length - 5))) continue;
        }
        try {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + searchText.length);
          return range;
        } catch (e) { continue; }
      }
    }
    return null;
  },

  _schedulePopupDismiss() {
    clearTimeout(this._popupTimer);
    this._popupTimer = setTimeout(() => this.hidePopup(), 4000);
  },

  // Show popup near a range rect (used for selection)
  _positionNear(rect) {
    let x = rect.left + rect.width / 2 - 55;
    let y = rect.top - 36 + window.scrollY;
    x = Math.max(8, Math.min(x, window.innerWidth - 120));
    if (rect.top < 50) y = rect.bottom + 8 + window.scrollY;
    this.popup.style.left = x + 'px';
    this.popup.style.top = y + 'px';
  },

  // Show edit popup for existing highlight
  showPopup(element, highlightId) {
    this.isSelectionMode = false;
    this.currentHighlightId = highlightId;

    this._positionNear(element.getBoundingClientRect());
    this.popup.classList.remove('selection-mode');
    this.popup.classList.add('visible');

    const hl = this.activeHighlights.get(highlightId);
    if (hl) {
      this.popup.querySelectorAll('.sm-color').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === hl.data.color);
      });
    }
    this._schedulePopupDismiss();
  },

  showPopupForHighlight(element) {
    this.showPopup(element, element.dataset.id);
  },

  hidePopup() {
    clearTimeout(this._popupTimer);
    this.popup.classList.remove('visible', 'selection-mode');
    this.currentHighlightId = null;
    this.pendingRange = null;
    this.pendingText = null;
    this.isSelectionMode = false;
  },

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

  async deleteCurrentHighlight() {
    if (!this.currentHighlightId) return;
    await this.removeHighlight(this.currentHighlightId);
    this.hidePopup();
    window.Sidebar?.refresh();
  },

  async removeHighlight(id) {
    const hl = this.activeHighlights.get(id);
    if (hl && hl.element) {
      const parent = hl.element.parentNode;
      const text = document.createTextNode(hl.element.textContent);
      parent.replaceChild(text, hl.element);
      parent.normalize();
    }
    this.activeHighlights.delete(id);
    await Storage.deleteHighlight(id);
  },

  scrollTo(id) {
    const hl = this.activeHighlights.get(id);
    if (hl && hl.element) {
      hl.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      hl.element.classList.add('flash');
      setTimeout(() => hl.element.classList.remove('flash'), 1500);
    }
  }
};

window.Highlighter = Highlighter;
