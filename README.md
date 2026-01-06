# Site Memory

A Chrome extension for site-scoped knowledge retention. Highlight text on any webpage, save it with optional notes, and automatically recall your highlights when you revisit the same domain.

## Features (MVP)

- [ ] Save text highlights via right-click context menu
- [ ] Automatic recall of highlights on site revisit
- [ ] Sidebar view showing all highlights for current domain
- [ ] Click-to-scroll to saved highlights

## Installation (Development)

1. Clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this folder

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES Modules)
- chrome.storage.local for persistence