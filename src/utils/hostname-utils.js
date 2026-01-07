function getHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

function normalizeHostname(hostname) {
  if (!hostname) return null;
  // Remove www. prefix and lowercase
  return hostname.replace(/^www\./, '').toLowerCase();
}

function getCurrentHostname() {
  return normalizeHostname(getHostname(window.location.href));
}

// Make available globally
window.getHostname = getHostname;
window.normalizeHostname = normalizeHostname;
window.getCurrentHostname = getCurrentHostname;
