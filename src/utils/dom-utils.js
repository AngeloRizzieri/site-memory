const DOMUtils = {
  // Get XPath for a node
  getXPath(node) {
    if (!node) return '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    const parts = [];
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = node.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && 
            sibling.nodeName === node.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = node.nodeName.toLowerCase();
      parts.unshift(`${tagName}[${index}]`);
      node = node.parentNode;
    }
    
    return '/' + parts.join('/');
  },

  // Get node from XPath
  getNodeFromXPath(xpath) {
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
      console.error('[Site Memory] XPath error:', e);
      return null;
    }
  },

  // Get context around a range
  getContext(range, charCount = 50) {
    const text = range.toString();
    const container = range.commonAncestorContainer;
    const fullText = container.textContent || '';
    const index = fullText.indexOf(text);
    
    return {
      contextBefore: fullText.substring(Math.max(0, index - charCount), index),
      contextAfter: fullText.substring(index + text.length, index + text.length + charCount)
    };
  },

  // Serialize a range for storage
  serializeRange(range) {
    const context = this.getContext(range);
    
    return {
      startXPath: this.getXPath(range.startContainer),
      startOffset: range.startOffset,
      endXPath: this.getXPath(range.endContainer),
      endOffset: range.endOffset,
      ...context
    };
  },

  // Reconstruct a range from serialized data
  deserializeRange(position) {
    try {
      const startNode = this.getNodeFromXPath(position.startXPath);
      const endNode = this.getNodeFromXPath(position.endXPath);
      
      if (!startNode || !endNode) return null;
      
      // Find text nodes
      const startTextNode = this.findTextNode(startNode, position.startOffset);
      const endTextNode = this.findTextNode(endNode, position.endOffset);
      
      if (!startTextNode || !endTextNode) return null;
      
      const range = document.createRange();
      range.setStart(startTextNode.node, startTextNode.offset);
      range.setEnd(endTextNode.node, endTextNode.offset);
      
      return range;
    } catch (e) {
      console.error('[Site Memory] Deserialize error:', e);
      return null;
    }
  },

  // Find text node within an element
  findTextNode(element, targetOffset) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let currentOffset = 0;
    let node;
    
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent.length;
      if (currentOffset + nodeLength >= targetOffset) {
        return {
          node: node,
          offset: Math.min(targetOffset - currentOffset, nodeLength)
        };
      }
      currentOffset += nodeLength;
    }
    
    // Fallback: return first text node
    const firstText = element.querySelector('*')?.firstChild || element.firstChild;
    if (firstText && firstText.nodeType === Node.TEXT_NODE) {
      return { node: firstText, offset: 0 };
    }
    
    return null;
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