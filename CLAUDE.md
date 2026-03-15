# Site Memory — Chrome Extension

A Manifest V3 Chrome extension for highlighting and annotating text on any webpage or PDF. Highlights persist locally (no accounts, no cloud) and restore automatically when revisiting pages.

## Architecture

**Type:** Chrome Extension (Manifest V3)
**Storage:** `chrome.storage.local` — all data stays on device
**Entry point:** `manifest.json`

### File Map

```
src/
  background/
    service-worker.js     # MV3 service worker: context menus, PDF banner injection, message routing
  content/
    main.js               # Content script entry: initialises Highlighter and Sidebar
    highlighter.js        # Text selection, highlight rendering/restoration, popup, note modal
  storage/
    storage.js            # Thin wrapper around chrome.storage.local
  ui/
    sidebar.js            # Right-side panel: list all highlights grouped by page
    styles/main.css       # All injected UI styles (highlights, popup, sidebar, note modal)
  utils/
    helpers.js            # Shared utilities: ID generation, page ID, favicon, HTML escaping
    welcome-init.js       # Logic for the welcome page (copy URL, close tab)
  pdf/
    viewer.html           # Standalone PDF viewer page (chrome-extension:// URL)
    viewer-script.js      # PDF.js rendering + text-layer + highlight saving
    pdf.min.js            # Bundled PDF.js library
    pdf.worker.min.js     # PDF.js web worker
  welcome/
    welcome.html          # Onboarding page shown on first install
assets/icons/             # 16/48/128px extension icons
```

### Content Script Load Order

Files are injected in the order declared in `manifest.json`:
1. `helpers.js` — exposes `window.Helpers`
2. `storage.js` — exposes `window.Storage`
3. `highlighter.js` — exposes `window.Highlighter`
4. `sidebar.js` — exposes `window.Sidebar`
5. `main.js` — calls `Highlighter.init()` and `Sidebar.init()`

All globals use the `window.*` pattern so scripts can reference each other safely.

### Highlight Storage Schema

```js
{
  id: "hl_<timestamp>_<random>",  // unique ID
  text: string,                    // highlighted text
  color: string,                   // hex color e.g. "#facc15"
  note: string,                    // optional annotation
  context: string,                 // surrounding text for re-anchoring
  pageId: string,                  // hostname + pathname (not full URL)
  pageTitle: string,               // cleaned document.title
  url: string,                     // full URL for the page link
  favicon: string,                 // Google favicon service URL
  createdAt: number,               // Date.now()
  // PDF-only fields:
  isPdf: boolean,
  pdfPage: number
}
```

All highlights are stored in one `chrome.storage.local` key: `site_memory_data` as `{ highlights: [] }`.

## Key Design Decisions

- **Auto-highlight on mouseup**: Text is highlighted immediately on selection (no separate "save" step). The popup that appears lets users change color, add a note, or delete.
- **Context-based restoration**: Highlights are re-anchored on page load by searching for the saved text within nodes that match the surrounding `context` string. This handles minor page edits but fails if the text changes significantly.
- **`surroundContents()` limitation**: The highlighter uses `Range.surroundContents()` which throws if a selection spans multiple HTML elements. Selections that cross tag boundaries are silently dropped.
- **PDF viewer is single-page**: `viewer-script.js` renders one page at a time (not continuous scroll). PDF highlights saved here are stored but **not visually restored on reload** (rendering back onto canvas is out of scope).
- **No background page**: Service worker is stateless; all durable state lives in `chrome.storage.local`.

## Common Tasks

### Load the extension for testing
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder

### Reload after changes
- Background service worker: click the circular reload icon on `chrome://extensions`
- Content scripts: reload the tab you're testing on
- Popup/HTML pages: just refresh them (Ctrl+R)

### Test PDF highlighting
- Online PDF: navigate to any `.pdf` URL; a banner appears top-right
- Local PDF: needs "Allow access to file URLs" enabled on the extension detail page
- Right-click any PDF link → "Open PDF in Site Memory viewer"

## Known Limitations

- Highlights fail silently when `surroundContents()` throws (selection crosses element boundaries)
- PDF highlights (saved from viewer) are **not re-rendered** when the viewer is reopened
- `chrome.extension.isAllowedFileSchemeAccess` is deprecated in MV3 but still functional
- `getPageId()` uses `hostname + pathname` only, so URL fragments/query params won't separate pages

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0a0a0a` | App background |
| Surface | `#18181b` | Cards, popups |
| Border | `#27272a` | Dividers |
| Muted | `#71717a` | Secondary text |
| Accent | `#facc15` | Highlights, CTAs |
| Danger | `#ef4444` | Delete actions |
