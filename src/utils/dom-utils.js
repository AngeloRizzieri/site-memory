const DOMUtils = {
  // Get context around a range - more context for better matching
  getContext(range, charCount = 80) {
    let contextBefore = '';
    let contextAfter = '';
    
    try {
      // Walk backwards to get context before
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textBefore = startContainer.textContent.substring(0, startOffset);
        contextBefore = textBefore.slice(-charCount);
        
        // If we need more context, look at previous nodes
        if (contextBefore.length < charCount) {
          let prevText = this.getPreviousText(startContainer, charCount - contextBefore.length);
          contextBefore = prevText + contextBefore;
        }
      }
      
      // Walk forwards to get context after
      const endContainer = range.endContainer;
      const endOffset = range.endOffset;
      
      if (endContainer.nodeType === Node.TEXT_NODE) {
        const textAfter = endContainer.textContent.substring(endOffset);
        contextAfter = textAfter.slice(0, charCount);
        
        // If we need more context, look at next nodes
        if (contextAfter.length < charCount) {
          let nextText = this.getNextText(endContainer, charCount - contextAfter.length);
          contextAfter = contextAfter + nextText;
        }
      }
    } catch (e) {
      console.log('[Site Memory] Context extraction fallback');
    }
    
    return {
      contextBefore: contextBefore.slice(-charCount),
      contextAfter: contextAfter.slice(0, charCount)
    };
  },

  // Get text from previous sibling/parent nodes
  getPreviousText(node, maxLength) {
    let text = '';
    let current = node;
    
    while (text.length < maxLength && current) {
      if (current.previousSibling) {
        current = current.previousSibling;
        const nodeText = current.textContent || '';
        text = nodeText.slice(-maxLength) + text;
      } else if (current.parentNode && current.parentNode !== document.body) {
        current = current.parentNode;
      } else {
        break;
      }
    }
    
    return text.slice(-maxLength);
  },

  // Get text from next sibling/parent nodes
  getNextText(node, maxLength) {
    let text = '';
    let current = node;
    
    while (text.length < maxLength && current) {
      if (current.nextSibling) {
        current = current.nextSibling;
        const nodeText = current.textContent || '';
        text = text + nodeText.slice(0, maxLength);
      } else if (current.parentNode && current.parentNode !== document.body) {
        current = current.parentNode;
      } else {
        break;
      }
    }
    
    return text.slice(0, maxLength);
  },

  // Serialize a range for storage - now primarily text-based
  serializeRange(range) {
    const context = this.getContext(range);
    const text = range.toString();
    
    return {
      text: text,
      ...context,
      // Keep xpath as fallback but don't rely on it
      startXPath: '',
      startOffset: 0,
      endXPath: '',
      endOffset: 0
    };
  },

  // Find text in the document and create a range
  deserializeRange(position) {
    try {
      const searchText = position.text;
      if (!searchText) return null;
      
      // Build the full search string with context
      const contextBefore = position.contextBefore || '';
      const contextAfter = position.contextAfter || '';
      
      // Use TreeWalker to find text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      // Collect all text nodes with their positions
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
          textNodes.push(node);
        }
      }
      
      // Build a map of cumulative text
      let fullText = '';
      const nodeMap = []; // {node, start, end}
      
      for (const textNode of textNodes) {
        const start = fullText.length;
        fullText += textNode.textContent;
        nodeMap.push({
          node: textNode,
          start: start,
          end: fullText.length
        });
      }
      
      // Search for the text with context
      let searchIndex = -1;
      
      // Try with full context first
      if (contextBefore && contextAfter) {
        const fullSearch = contextBefore + searchText + contextAfter;
        const idx = fullText.indexOf(fullSearch);
        if (idx !== -1) {
          searchIndex = idx + contextBefore.length;
        }
      }
      
      // Try with just before context
      if (searchIndex === -1 && contextBefore) {
        const searchWithBefore = contextBefore.slice(-30) + searchText;
        const idx = fullText.indexOf(searchWithBefore);
        if (idx !== -1) {
          searchIndex = idx + Math.min(contextBefore.length, 30);
        }
      }
      
      // Try with just after context
      if (searchIndex === -1 && contextAfter) {
        const searchWithAfter = searchText + contextAfter.slice(0, 30);
        const idx = fullText.indexOf(searchWithAfter);
        if (idx !== -1) {
          searchIndex = idx;
        }
      }
      
      // Fall back to just the text (first occurrence)
      if (searchIndex === -1) {
        searchIndex = fullText.indexOf(searchText);
      }
      
      if (searchIndex === -1) {
        console.log('[Site Memory] Could not find text:', searchText.substring(0, 50));
        return null;
      }
      
      // Find the start and end nodes
      const startPos = searchIndex;
      const endPos = searchIndex + searchText.length;
      
      let startNode = null, startOffset = 0;
      let endNode = null, endOffset = 0;
      
      for (const mapping of nodeMap) {
        // Find start node
        if (!startNode && mapping.start <= startPos && mapping.end > startPos) {
          startNode = mapping.node;
          startOffset = startPos - mapping.start;
        }
        
        // Find end node
        if (mapping.start < endPos && mapping.end >= endPos) {
          endNode = mapping.node;
          endOffset = endPos - mapping.start;
        }
        
        if (startNode && endNode) break;
      }
      
      if (!startNode || !endNode) {
        console.log('[Site Memory] Could not map to DOM nodes');
        return null;
      }
      
      // Create and return the range
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      
      // Verify the range text matches
      const rangeText = range.toString();
      if (rangeText !== searchText) {
        console.log('[Site Memory] Range text mismatch, but proceeding');
      }
      
      return range;
    } catch (e) {
      console.error('[Site Memory] Deserialize error:', e);
      return null;
    }
  },

  // Scroll element into view smoothly
  scrollToElement(element) {
    if (!element) return;
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
};

// Make available globally
window.DOMUtils = DOMUtils;
