// Get extension ID and set the URL
(function() {
  const extId = chrome.runtime.id;
  const extUrl = 'chrome://extensions/?id=' + extId;
  
  document.getElementById('extUrl').textContent = extUrl;
  
  // Copy URL button
  document.getElementById('copyUrl').addEventListener('click', function() {
    const btn = this;

    navigator.clipboard.writeText(extUrl).then(function() {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(function() {
      btn.textContent = 'Failed';
      setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
    });
  });
  
  // Close tab button
  document.getElementById('closeTab').addEventListener('click', function() {
    window.close();
  });
})();
