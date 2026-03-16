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
    sidebar.js            # Right-side panel: list all highlights grouped by domain → page
    styles/main.css       # All injected UI styles (highlights, popup, sidebar, note modal)
  utils/
    helpers.js            # Shared utilities: ID generation, page ID, favicon, HTML escaping
    welcome-init.js       # Logic for the welcome page (copy URL, close tab)
  pdf/
    viewer.html           # Standalone PDF viewer page (chrome-extension:// URL)
    viewer-script.js      # PDF.js rendering + continuous scroll + highlight saving/restoring
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
  text: string,                    // highlighted text (or image filename)
  color: string,                   // hex color e.g. "#facc15"
  note: string,                    // optional annotation
  context: string,                 // surrounding text for re-anchoring
  pageId: string,                  // hostname + pathname (not full URL)
  pageTitle: string,               // cleaned document.title
  url: string,                     // full URL for the page link
  favicon: string,                 // Google favicon service URL
  createdAt: number,               // Date.now()
  // Image-only fields:
  isImage: boolean,
  imageSrc: string,
  // PDF-only fields:
  isPdf: boolean,
  pdfPage: number
}
```

Custom display names (domain/page rename) are stored alongside highlights:
```js
{ highlights: [], customNames: { domains: {}, pages: {} } }
```

All data lives in one `chrome.storage.local` key: `site_memory_data`.

## Key Design Decisions

- **Highlight triggers (no auto-highlight):**
  - Right-click → "Highlight Selection" → immediately saves with `lastColor`, then auto-opens note modal
  - Ctrl+Shift+S with text selected → shows color picker bubble → pick color → saves → auto-opens note modal
  - Ctrl+Shift+S with nothing selected → toggles sidebar open/closed
  - No manifest `commands` key (removed to prevent double-firing with content script keydown handler)

- **Note modal auto-opens on every new highlight** — so users can annotate right away. Cancel skips the note.

- **Context-based restoration:** Highlights are re-anchored on page load by searching for saved text within nodes matching the surrounding `context` string. Handles minor page edits but fails if text changes significantly.

- **`surroundContents()` limitation:** Throws if a selection spans multiple HTML elements. Selections crossing tag boundaries are silently dropped.

- **Sidebar is light-themed** to match the page background. Uses `getComputedStyle` on body/html at open time, set as `--sm-bg` CSS variable on the panel.

- **Sidebar note expansion:** Notes in sidebar are truncated by default. Click the note text to expand/collapse to full multi-line. Clicking a non-note area of the highlight row scrolls to and shows the popup.

- **Image highlights:** Right-clicking an image → "Save Image to Memory" stores a highlight with `isImage: true`, `imageSrc`, and the URL as the note. Sidebar shows a thumbnail instead of a color dot.

- **PDF viewer — continuous scroll:** All pages render in a single scrollable column. Pages 1–2 render immediately; remaining pages lazy-render via `IntersectionObserver` as they approach the viewport.

- **PDF text layer Y-coordinate fix:** The correct formula is `tx[5] - fontSize` (not `viewport.height - tx[5] - fontSize`). `Util.transform` produces `tx[5]` already in CSS screen coordinates (pixels from top); subtracting `fontSize` gives the top of the glyph. The old inverted formula placed spans upside-down, breaking text selection.

- **PDF highlight restoration:** Saved PDF highlights are drawn as colored overlay `<div>` elements on the `hl-layer` (positioned absolutely over the canvas). Matching is done by checking if a text content item's string appears within the saved highlight text.

- **No background page:** Service worker is stateless; all durable state lives in `chrome.storage.local`.

## Highlight Popup Modes

The single `.sm-popup` element operates in two modes toggled by CSS class:

| Mode | CSS class | Visible controls |
|------|-----------|-----------------|
| Selection (new) | `selection-mode` | color dots only |
| Edit (existing) | _(none)_ | color dots + note pencil + sidebar icon + delete |

## Common Tasks

### Load the extension for testing
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the root folder (where `manifest.json` is)

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
- PDF highlight restoration uses substring matching — very short or very common words may produce extra overlays
- `chrome.extension.isAllowedFileSchemeAccess` is deprecated in MV3 but still functional
- `getPageId()` uses `hostname + pathname` only, so URL fragments/query params won't separate pages

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Accent | `#facc15` | Yellow highlight, Save button, CTAs |
| Grey highlight | `#a1a1aa` | First/default highlight color option |
| Green | `#4ade80` | Color option |
| Blue | `#60a5fa` | Color option |
| Pink | `#f472b6` | Color option |
| Purple | `#c084fc` | Color option |
| Danger | `#ef4444` | Delete actions |

Sidebar/popup/note modal use a **light theme** (white backgrounds, dark text) to blend with page content.
PDF viewer uses its own **dark theme** (standalone page, not injected).
