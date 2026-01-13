// Get extension ID and set the URL
(function() {
  const extId = chrome.runtime.id;
  const extUrl = 'chrome://extensions/?id=' + extId;
  
  document.getElementById('extUrl').textContent = extUrl;
  
  // Copy URL button
  document.getElementById('copyUrl').addEventListener('click', function() {
    const btn = this;
    
    // Create a temporary textarea to copy from
    const textarea = document.createElement('textarea');
    textarea.value = extUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      btn.textContent = 'Failed';
    }
    
    document.body.removeChild(textarea);
  });
  
  // Close tab button
  document.getElementById('closeTab').addEventListener('click', function() {
    window.close();
  });
})();