# AmanOs

A browser-based desktop environment styled after Windows 7, built with vanilla HTML, CSS, and JavaScript.

Live demo and source: [github.com/amanprojects-ops/amanos](https://github.com/amanprojects-ops/amanos)

---

## Features

- **Draggable windows** — grab the title bar and move windows freely around the desktop
- **Resizable windows** — eight resize handles (corners + edges) let you reshape any window
- **Minimize / Maximize / Close** — full window control buttons with hover animations
- **Restore** — double-click the title bar or click Maximize again to restore a window
- **Tabbed window content** — accessible tab panels inside windows
- **Desktop icon** — single-click to select, double-click to open a closed window
- **Keyboard accessible** — Enter / Space on the desktop icon opens the window
- **Viewport clamping** — windows stay within screen bounds while dragging or resizing
- **Windows 7 UI theme** — glass title bar, Aero-style buttons, and classic control styling via `os.css`

---

## File Structure

```
AmanOs/
├── index.html          # Main entry point
├── assets/
│   ├── css/
│   │   └── os.css      # Windows 7-style UI component library
│   └── js/
│       └── ui.js       # Window manager: drag, resize, min/max/close, tabs, desktop icon
├── bg.jpg              # Desktop wallpaper
└── icon.png            # Desktop icon image
```

---

## Getting Started

No build step required. Just open `index.html` in any modern browser.

```bash
git clone https://github.com/amanprojects-ops/amanos.git
cd amanos
# open index.html in your browser
```

---

## How It Works

### Window Manager (`ui.js`)

| Module | What it does |
|---|---|
| `setupTabs()` | Activates tab panels and syncs `aria-selected` state |
| `setupWindow()` | Handles minimize, maximize/restore, close, and pointer-based dragging |
| `makeResizable()` | Listens on eight `data-dir` resize handles for pointer drag events |
| `setupDesktopIcon()` | Manages icon selection state and reopens the window on double-click |

### CSS Theme (`os.css`)

A self-contained Windows 7 component stylesheet covering buttons, inputs, checkboxes, radio buttons, tabs, scrollbars, progress bars, menus, tooltips, tree views, and the window chrome (title bar, glass effect, control buttons).

---

## Built by

[Aman Projects](https://amanprojects.com)
