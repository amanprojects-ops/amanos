/**
 * AmanOS - Windows 7 Style Web OS
 * ui.js - Full window manager, taskbar, start menu, desktop icons
 */

'use strict';

// =========================================================
//  GLOBAL STATE
// =========================================================

const APP_META = {
  'win-about':       { title: 'About Us',     icon: '👤' },
  'win-services':    { title: 'Services',      icon: '🖥️' },
  'win-portfolio':   { title: 'Portfolio',     icon: '💼' },
  'win-contact':     { title: 'Contact Us',    icon: '📧' },
  'win-blog':        { title: 'Blog',          icon: '📝' },
  'win-mycomputer':  { title: 'My Computer',   icon: '💻' },
};

let zCounter = 50;           // z-index counter
let activeWindowId = null;   // currently focused window id

// =========================================================
//  UTILITY
// =========================================================

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function getWin(id) { return document.getElementById(id); }

// =========================================================
//  WINDOW FOCUS / Z-INDEX
// =========================================================

function bringToFront(win) {
  zCounter++;
  win.style.zIndex = zCounter;
  // mark active — only among real app windows (not dialogs)
  document.querySelectorAll('.os-window:not([role="dialog"])').forEach(w => w.classList.remove('active'));
  win.classList.add('active');
  activeWindowId = win.id;
  updateTaskbarButtons();
}

function closeActiveWindow() {
  if (activeWindowId) closeWindow(activeWindowId);
}

// =========================================================
//  OPEN / CLOSE / MINIMISE / MAXIMISE
// =========================================================

function openWindow(id) {
  const win = getWin(id);
  if (!win) return;
  win.classList.remove('closed', 'minimized');
  bringToFront(win);
  closeStartMenu();
  updateTaskbarButtons();
}

function closeWindow(id) {
  const win = getWin(id);
  if (!win) return;
  win.classList.add('closed');
  if (activeWindowId === id) activeWindowId = null;
  updateTaskbarButtons();
}

function minimizeWindow(id) {
  const win = getWin(id);
  if (!win) return;
  win.classList.add('minimized');
  win.classList.remove('active');
  if (activeWindowId === id) activeWindowId = null;
  updateTaskbarButtons();
}

function toggleMinimize(id) {
  const win = getWin(id);
  if (!win || win.classList.contains('closed')) {
    openWindow(id);
    return;
  }
  if (win.classList.contains('minimized')) {
    openWindow(id);
  } else if (activeWindowId === id) {
    minimizeWindow(id);
  } else {
    bringToFront(win);
  }
}

const restoreRects = {};

function maximizeWindow(id) {
  const win = getWin(id);
  if (!win) return;
  if (win.classList.contains('maximized')) {
    // restore
    const r = restoreRects[id];
    if (r) {
      win.classList.remove('maximized');
      win.style.left   = r.left;
      win.style.top    = r.top;
      win.style.width  = r.width;
      win.style.height = r.height;
    }
  } else {
    const rect = win.getBoundingClientRect();
    restoreRects[id] = {
      left:   win.style.left   || rect.left + 'px',
      top:    win.style.top    || rect.top  + 'px',
      width:  win.style.width  || rect.width + 'px',
      height: win.style.height || '',
    };
    win.classList.add('maximized');
  }
  bringToFront(win);
}

// =========================================================
//  DRAG
// =========================================================

function makeDraggable(win) {
  const titleBar = win.querySelector('.title-bar');
  if (!titleBar) return;

  let dragging = false, pid = null;
  let sx = 0, sy = 0, sl = 0, st = 0;

  titleBar.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('.title-bar-controls')) return;
    if (win.classList.contains('maximized')) return;

    bringToFront(win);
    dragging = true;
    pid = e.pointerId;
    win.classList.add('dragging');
    titleBar.setPointerCapture(pid);

    const rect = win.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY;
    sl = rect.left; st = rect.top;
    win.style.left = rect.left + 'px';
    win.style.top  = rect.top  + 'px';
    e.preventDefault();
  });

  titleBar.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    const deskH = window.innerHeight - 40;
    const maxL = window.innerWidth  - win.offsetWidth;
    const maxT = deskH - win.offsetHeight;
    win.style.left = clamp(sl + dx, 0, Math.max(0, maxL)) + 'px';
    win.style.top  = clamp(st + dy, 0, Math.max(0, maxT)) + 'px';
  });

  const stopDrag = () => {
    if (!dragging) return;
    dragging = false;
    win.classList.remove('dragging');
    try { titleBar.releasePointerCapture(pid); } catch(_) {}
    pid = null;
  };

  titleBar.addEventListener('pointerup', stopDrag);
  titleBar.addEventListener('pointercancel', stopDrag);

  // double-click title bar = toggle maximize
  titleBar.addEventListener('dblclick', e => {
    if (e.target.closest('.title-bar-controls')) return;
    maximizeWindow(win.id);
  });
}

// =========================================================
//  RESIZE
// =========================================================

function makeResizable(win) {
  const MIN_W = 260, MIN_H = 140;

  win.querySelectorAll('.resize-handle').forEach(handle => {
    let resizing = false, pid = null;
    let dir = '', sx = 0, sy = 0, sl = 0, st = 0, sw = 0, sh = 0;

    handle.addEventListener('pointerdown', e => {
      if (win.classList.contains('maximized')) return;
      resizing = true;
      dir = handle.dataset.dir;
      pid = e.pointerId;
      handle.setPointerCapture(pid);

      const rect = win.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      sl = rect.left; st = rect.top;
      sw = rect.width; sh = rect.height;
      win.style.left   = sl + 'px';
      win.style.top    = st + 'px';
      win.style.width  = sw + 'px';
      win.style.height = sh + 'px';
      e.preventDefault(); e.stopPropagation();
    });

    handle.addEventListener('pointermove', e => {
      if (!resizing) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      let nl = sl, nt = st, nw = sw, nh = sh;

      if (dir.includes('e')) nw = sw + dx;
      if (dir.includes('w')) { nw = sw - dx; nl = sl + dx; }
      if (dir.includes('s')) nh = sh + dy;
      if (dir.includes('n')) { nh = sh - dy; nt = st + dy; }

      if (nw < MIN_W) { if (dir.includes('w')) nl -= (MIN_W - nw); nw = MIN_W; }
      if (nh < MIN_H) { if (dir.includes('n')) nt -= (MIN_H - nh); nh = MIN_H; }

      const deskH = window.innerHeight - 40;
      nl = clamp(nl, 0, Math.max(0, window.innerWidth - nw));
      nt = clamp(nt, 0, Math.max(0, deskH - nh));

      win.style.left   = nl + 'px';
      win.style.top    = nt + 'px';
      win.style.width  = nw + 'px';
      win.style.height = nh + 'px';
    });

    const stop = () => {
      if (!resizing) return;
      resizing = false;
      try { handle.releasePointerCapture(pid); } catch(_) {}
      pid = null;
    };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  });
}

// =========================================================
//  TITLE BAR CONTROL BUTTONS
// =========================================================

function wireButtons(win) {
  const controls = win.querySelector('.title-bar-controls');
  if (!controls) return;

  const [minBtn, maxBtn, closeBtn] = controls.querySelectorAll('button');

  if (minBtn)   minBtn.addEventListener('click',   e => { e.stopPropagation(); minimizeWindow(win.id); });
  if (maxBtn)   maxBtn.addEventListener('click',   e => { e.stopPropagation(); maximizeWindow(win.id); });
  if (closeBtn) closeBtn.addEventListener('click', e => { e.stopPropagation(); closeWindow(win.id); });
}

// =========================================================
//  TASKBAR BUTTONS
// =========================================================

function updateTaskbarButtons() {
  const container = document.getElementById('taskbar-buttons');
  if (!container) return;
  container.innerHTML = '';

  document.querySelectorAll('.os-window:not([role="dialog"])').forEach(win => {
    if (!win.id || win.classList.contains('closed')) return;
    const meta = APP_META[win.id] || { title: win.id, icon: '🪟' };

    const btn = document.createElement('button');
    btn.className = 'tb-btn';
    if (win.id === activeWindowId) btn.classList.add('tb-active');
    if (win.classList.contains('minimized')) btn.classList.add('tb-minimized');

    btn.innerHTML = `<span class="tb-btn-icon">${meta.icon}</span><span class="tb-btn-label">${meta.title}</span>`;
    btn.title = meta.title;
    btn.addEventListener('click', () => toggleMinimize(win.id));
    container.appendChild(btn);
  });
}

// =========================================================
//  DESKTOP ICONS
// =========================================================

function setupDesktopIcons() {
  let selectedIcon = null;

  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const winId = icon.dataset.window;

    icon.addEventListener('click', e => {
      e.stopPropagation();
      if (selectedIcon) selectedIcon.classList.remove('selected');
      icon.classList.add('selected');
      selectedIcon = icon;
    });

    icon.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (winId) openWindow(winId);
    });

    icon.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && winId) {
        e.preventDefault();
        openWindow(winId);
      }
    });
  });

  document.getElementById('desktop').addEventListener('click', () => {
    if (selectedIcon) { selectedIcon.classList.remove('selected'); selectedIcon = null; }
    closeStartMenu();
  });
}

// =========================================================
//  START MENU
// =========================================================

function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  const btn  = document.getElementById('start-btn');
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  } else {
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
  }
}

function closeStartMenu() {
  const menu = document.getElementById('start-menu');
  const btn  = document.getElementById('start-btn');
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  btn.classList.remove('active');
}

function launchApp(id) {
  closeStartMenu();
  openWindow(id);
}

// =========================================================
//  CLOCK
// =========================================================

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const day  = days[now.getDay()];
  const date = `${day} ${now.getMonth() + 1}/${now.getDate()}`;

  const timeEl = document.getElementById('tray-time');
  const dateEl = document.getElementById('tray-date');
  if (timeEl) timeEl.textContent = `${h}:${m}`;
  if (dateEl) dateEl.textContent = date;
}

// =========================================================
//  SHOW DESKTOP
// =========================================================

let allMinimized = false;

function setupShowDesktop() {
  const btn = document.getElementById('show-desktop-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const windows = document.querySelectorAll('.os-window:not(.closed)');
    if (!allMinimized) {
      windows.forEach(w => { if (!w.classList.contains('minimized')) w.classList.add('minimized'); });
      allMinimized = true;
    } else {
      windows.forEach(w => w.classList.remove('minimized'));
      allMinimized = false;
    }
    updateTaskbarButtons();
  });
}

// =========================================================
//  WINDOW CLICK-TO-FOCUS
// =========================================================

function setupWindowFocus() {
  document.querySelectorAll('.os-window:not([role="dialog"])').forEach(win => {
    win.addEventListener('mousedown', () => {
      if (!win.classList.contains('minimized') && !win.classList.contains('closed')) {
        bringToFront(win);
      }
    });
  });
}

// =========================================================
//  TABS (generic for any tablist in a window)
// =========================================================

function setupTabs(container) {
  const tabLists = container.querySelectorAll('menu[role="tablist"]');
  tabLists.forEach(tabList => {
    const buttons = Array.from(tabList.querySelectorAll('button[role="tab"]'));
    const panels  = buttons.map(b => document.getElementById(b.getAttribute('aria-controls'))).filter(Boolean);

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('aria-controls');
        buttons.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
        panels.forEach(p => { if (p.id === target) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); });
      });
    });
  });
}

// =========================================================
//  CONTACT FORM
// =========================================================

function handleContact(e) {
  e.preventDefault();
  document.getElementById('contactForm').style.display = 'none';
  document.getElementById('contact-success').style.display = 'block';
}

// =========================================================
//  SHUTDOWN
// =========================================================

function confirmShutdown() {
  closeStartMenu();
  document.getElementById('shutdown-dialog').style.display = 'block';
}

function doShutdown() {
  document.getElementById('shutdown-dialog').style.display = 'none';
  const screen = document.getElementById('shutdown-screen');
  screen.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-direction:column;position:fixed;inset:0;background:#000;z-index:99999;';
  setTimeout(() => {
    screen.innerHTML = '<div style="color:#fff;font-size:14pt;font-family:Segoe UI,sans-serif;">It is now safe to close the browser tab.</div>';
  }, 2500);
}

// =========================================================
//  KEEP WINDOWS IN BOUNDS ON RESIZE
// =========================================================

window.addEventListener('resize', () => {
  document.querySelectorAll('.os-window:not(.closed):not(.maximized)').forEach(win => {
    const rect = win.getBoundingClientRect();
    const deskH = window.innerHeight - 40;
    const maxL  = window.innerWidth  - rect.width;
    const maxT  = deskH - rect.height;
    win.style.left = clamp(rect.left, 0, Math.max(0, maxL)) + 'px';
    win.style.top  = clamp(rect.top,  0, Math.max(0, maxT)) + 'px';
  });
});

// =========================================================
//  INIT
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Wire up all windows (skip dialogs that aren't real app windows)
  document.querySelectorAll('.os-window:not([role="dialog"])').forEach(win => {
    makeDraggable(win);
    makeResizable(win);
    // Only wire min/max/close on windows that have all three buttons
    const btns = win.querySelectorAll('.title-bar-controls button');
    if (btns.length === 3) wireButtons(win);
    setupTabs(win);
  });

  // Show Desktop button
  setupShowDesktop();

  // Desktop icons
  setupDesktopIcons();

  // Window click-to-focus
  setupWindowFocus();

  // Start with About Us window open and active, rest closed
  const startOpen  = ['win-about'];
  document.querySelectorAll('.os-window:not([role="dialog"])').forEach(win => {
    if (!startOpen.includes(win.id)) {
      win.classList.add('closed');
    }
  });

  const firstWin = getWin('win-about');
  if (firstWin) bringToFront(firstWin);

  updateTaskbarButtons();

  // Close start menu when clicking elsewhere
  document.addEventListener('click', e => {
    const menu = document.getElementById('start-menu');
    const btn  = document.getElementById('start-btn');
    if (menu.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) {
      closeStartMenu();
    }
  });

  // Clock
  updateClock();
  setInterval(updateClock, 10000);
});
