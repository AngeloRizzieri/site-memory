/**
 * DOM utilities for working with text selection and highlight restoration
 */

const DomUtils = {
  /**
   * Get XPath for an element
   */
  getXPath(element) {
    if (!element) return null;
    
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && 
            sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.tagName.toLowerCase();
      parts.unshift(`${tagName}[${index}]`);
      current = current.parentNode;
    }

    return '/' + parts.join('/');
  },

  /**
   * Get element by XPath
   */
  getElementByXPath(xpath) {
    if (!xpath) return null;
    
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (e) {
      console.warn('XPath evaluation failed:', e);
      return null;
    }
  },

  /**
   * Get selection details for creating a highlight
   */
  getSelectionDetails() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (!text) return null;

    // Get the start container's parent element
    let container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // Get context (surrounding text)
    const contextRange = range.cloneRange();
    try {
      // Expand to include some surrounding text
      const parentText = container.textContent || '';
      const textStart = parentText.indexOf(text);
      const contextStart = Math.max(0, textStart - 50);
      const contextEnd = Math.min(parentText.length, textStart + text.length + 50);
      const context = parentText.substring(contextStart, contextEnd);

      return {
        text,
        xpath: this.getXPath(container),
        textOffset: range.startOffset,
        textLength: text.length,
        context,
        rect: range.getBoundingClientRect()
      };
    } catch (e) {
      return {
        text,
        xpath: this.getXPath(container),
        textOffset: range.startOffset,
        textLength: text.length,
        context: text
      };
    }
  },

  /**
   * Find text in document and return range
   */
  findTextInDocument(searchText, container = document.body) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const index = node.textContent.indexOf(searchText);
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchText.length);
        return range;
      }
    }

    return null;
  },

  /**
   * Find text using context for better matching
   */
  findTextWithContext(text, context, xpath) {
    // First try XPath
    if (xpath) {
      const element = this.getElementByXPath(xpath);
      if (element) {
        const range = this.findTextInDocument(text, element);
        if (range) return range;
      }
    }

    // Try to find using context
    if (context && context.length > text.length) {
      const contextElement = this.findTextInDocument(context);
      if (contextElement) {
        const parent = contextElement.startContainer.parentElement;
        const range = this.findTextInDocument(text, parent);
        if (range) return range;
      }
    }

    // Fallback to searching entire document
    return this.findTextInDocument(text);
  },

  /**
   * Wrap a range with a highlight element
   */
  wrapRangeWithHighlight(range, highlightId, color) {
    const wrapper = document.createElement('mark');
    wrapper.className = 'site-memory-highlight';
    wrapper.dataset.highlightId = highlightId;
    wrapper.style.setProperty('--highlight-color', color);

    try {
      range.surroundContents(wrapper);
      return wrapper;
    } catch (e) {
      // Handle partial selections across elements
      console.warn('Could not wrap range directly, trying alternative method');
      
      const contents = range.extractContents();
      wrapper.appendChild(contents);
      range.insertNode(wrapper);
      return wrapper;
    }
  },

  /**
   * Remove highlight wrapper
   */
  removeHighlightWrapper(highlightId) {
    const wrapper = document.querySelector(
      `.site-memory-highlight[data-highlight-id="${highlightId}"]`
    );

    if (wrapper) {
      const parent = wrapper.parentNode;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }
      parent.removeChild(wrapper);
      parent.normalize();
      return true;
    }

    return false;
  },

  /**
   * Check if an element is visible in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Scroll element into view smoothly
   */
  scrollToElement(element) {
    if (!element) return;
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  },

  /**
   * Get page title
   */
  getPageTitle() {
    return document.title || UrlUtils.getPageTitle(window.location.href);
  }
};

// Make available globally
window.DomUtils = DomUtils;
