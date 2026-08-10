/**
 * AmanOS — Admin Panel
 * admin.js — all admin-specific logic
 * Runs after ui.js (window manager, drag, resize, taskbar are already wired)
 */

'use strict';

// =========================================================
//  ADMIN STATE
// =========================================================

let ADMIN_USERS = [
  { id: 1, name: 'Aman',  role: 'admin',  status: 'active',   lastLogin: 'Just now',    emoji: '👤' },
  { id: 2, name: 'Guest', role: 'viewer', status: 'inactive', lastLogin: 'Never',       emoji: '👻' },
];

let ADMIN_MESSAGES = [
  {
    id: 1, from: 'Alice Johnson', email: 'alice@example.com',
    subject: 'Project Inquiry', time: '11:42',
    body: 'Hi Aman,\n\nI came across your portfolio and I\'m really impressed with your work. I have a project in mind that I think would be a great fit.\n\nWould you be available for a quick call this week?\n\nBest,\nAlice',
    read: false,
  },
  {
    id: 2, from: 'Bob Smith', email: 'bob@example.com',
    subject: 'Collaboration Opportunity', time: '10:15',
    body: 'Hello,\n\nI saw your blog post on building a Windows 7 UI in CSS — outstanding work! I\'d love to collaborate on an open-source OS-themed project.\n\nLet me know if you\'re interested.\n\nCheers,\nBob',
    read: false,
  },
  {
    id: 3, from: 'Carol Davis', email: 'carol@example.com',
    subject: 'Feedback on Services', time: '09:05',
    body: 'Hi,\n\nJust wanted to say your services page is beautifully designed. The attention to detail is fantastic.\n\nKeep up the great work!\n\n— Carol',
    read: true,
  },
];

const FM_TREE = {
  '/': {
    dirs:  ['assets', 'images', 'documents'],
    files: ['index.html', 'admin.html', 'bg.jpg', 'icon.png', 'README.md'],
  },
  '/assets': {
    dirs:  ['css', 'js'],
    files: [],
  },
  '/assets/css': {
    dirs:  [],
    files: ['os.css', 'desktop.css', 'admin.css'],
  },
  '/assets/js': {
    dirs:  [],
    files: ['ui.js', 'admin.js'],
  },
  '/images': {
    dirs:  [],
    files: ['bg.jpg', 'icon.png', 'logo.svg'],
  },
  '/documents': {
    dirs:  [],
    files: ['resume.pdf', 'portfolio.pdf'],
  },
};

let fmCurrentPath = '/';

const SYS_LOGS = [
  { time: '12:04:01', level: 'info',  msg: 'User "Aman" authenticated successfully.' },
  { time: '12:04:02', level: 'info',  msg: 'Admin session started. Session ID: ADM-4821.' },
  { time: '11:58:33', level: 'info',  msg: 'File uploaded: assets/css/admin.css (4.2 KB).' },
  { time: '11:42:17', level: 'info',  msg: 'Settings changed: maintenance_mode=false.' },
  { time: '11:30:05', level: 'warn',  msg: 'High memory usage detected: 78% of limit.' },
  { time: '10:30:44', level: 'error', msg: 'Failed login attempt from Guest (wrong password).' },
  { time: '09:15:22', level: 'info',  msg: 'New contact message from alice@example.com.' },
  { time: '09:10:10', level: 'info',  msg: 'AmanOS booted successfully. All services online.' },
  { time: '09:08:55', level: 'warn',  msg: 'SSL certificate expires in 30 days.' },
  { time: '09:05:01', level: 'info',  msg: 'New contact message from carol@example.com.' },
];

const TRAFFIC_SOURCES = [
  { label: 'Direct',        pct: 42 },
  { label: 'Google Search', pct: 28 },
  { label: 'GitHub',        pct: 16 },
  { label: 'Twitter/X',     pct: 9  },
  { label: 'Other',         pct: 5  },
];

// =========================================================
//  TOAST NOTIFICATIONS
// =========================================================

function adminToast(msg, type = 'info', duration = 3000) {
  let wrap = document.getElementById('admin-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'admin-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `admin-toast admin-toast--${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// =========================================================
//  OVERRIDE: APP_META for admin windows
// =========================================================

// Extend the global APP_META defined in ui.js
Object.assign(APP_META, {
  'win-dashboard': { title: 'Dashboard',    icon: '📊' },
  'win-users':     { title: 'Users',        icon: '👥' },
  'win-messages':  { title: 'Messages',     icon: '📧' },
  'win-analytics': { title: 'Analytics',    icon: '📈' },
  'win-files':     { title: 'File Manager', icon: '📁' },
  'win-settings':  { title: 'Settings',     icon: '⚙️' },
  'win-syslog':    { title: 'System Log',   icon: '🖥️' },
});

// =========================================================
//  USERS
// =========================================================

function renderUsers(list) {
  list = list || ADMIN_USERS;
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = list.map(u => `
    <tr>
      <td><div class="user-avatar-cell">${u.emoji}</div></td>
      <td><strong>${u.name}</strong></td>
      <td><span class="badge badge--${u.role === 'admin' ? 'blue' : 'grey'}">${u.role}</span></td>
      <td><span class="badge badge--${u.status === 'active' ? 'green' : 'grey'}">${u.status}</span></td>
      <td>${u.lastLogin}</td>
      <td style="display:flex;gap:4px;">
        <button class="admin-btn" onclick="toggleUserStatus(${u.id})">${u.status === 'active' ? 'Disable' : 'Enable'}</button>
        ${u.name !== 'Aman' ? `<button class="admin-btn admin-btn--danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}
      </td>
    </tr>
  `).join('');
  // update dashboard stat
  const el = document.getElementById('stat-users');
  if (el) el.textContent = ADMIN_USERS.length;
}

function filterUsers(q) {
  const filtered = ADMIN_USERS.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.role.toLowerCase().includes(q.toLowerCase())
  );
  renderUsers(filtered);
}

function openAddUserDialog() {
  document.getElementById('dlg-add-user').style.display = 'block';
  document.getElementById('nu-name').value = '';
  document.getElementById('nu-pw').value   = '';
  document.getElementById('nu-err').textContent = '';
  setTimeout(() => document.getElementById('nu-name').focus(), 60);
}

function addUser() {
  const name = document.getElementById('nu-name').value.trim();
  const role = document.getElementById('nu-role').value;
  const pw   = document.getElementById('nu-pw').value;
  const err  = document.getElementById('nu-err');

  if (!name) { err.textContent = 'Username is required.'; return; }
  if (ADMIN_USERS.find(u => u.name.toLowerCase() === name.toLowerCase())) {
    err.textContent = 'Username already exists.'; return;
  }
  if (pw.length < 4) { err.textContent = 'Password must be at least 4 characters.'; return; }

  ADMIN_USERS.push({
    id: Date.now(), name, role,
    status: 'active', lastLogin: 'Never', emoji: '👤',
  });
  document.getElementById('dlg-add-user').style.display = 'none';
  renderUsers();
  addLog('info', `New user "${name}" (${role}) created by Admin.`);
  adminToast(`User "${name}" added.`, 'success');
}

function toggleUserStatus(id) {
  const u = ADMIN_USERS.find(u => u.id === id);
  if (!u) return;
  u.status = u.status === 'active' ? 'inactive' : 'active';
  renderUsers();
  addLog('info', `User "${u.name}" status changed to ${u.status}.`);
  adminToast(`"${u.name}" is now ${u.status}.`, 'info');
}

function deleteUser(id) {
  const u = ADMIN_USERS.find(u => u.id === id);
  if (!u) return;
  ADMIN_USERS = ADMIN_USERS.filter(u => u.id !== id);
  renderUsers();
  addLog('warn', `User "${u.name}" deleted by Admin.`);
  adminToast(`"${u.name}" deleted.`, 'error');
}

// =========================================================
//  MESSAGES
// =========================================================

function renderMessageList() {
  const list = document.getElementById('msg-list');
  if (!list) return;
  list.innerHTML = ADMIN_MESSAGES.map(m => `
    <div class="msg-item ${m.read ? '' : 'unread'}" id="msgitem-${m.id}" onclick="openMessage(${m.id})">
      <div class="msg-item-name">${m.from}</div>
      <div class="msg-item-subject">${m.subject}</div>
      <div class="msg-item-time">${m.time}</div>
    </div>
  `).join('');
  // update badge
  const unread = ADMIN_MESSAGES.filter(m => !m.read).length;
  const statEl = document.getElementById('stat-msgs');
  if (statEl) statEl.textContent = unread;
}

function openMessage(id) {
  const m = ADMIN_MESSAGES.find(m => m.id === id);
  if (!m) return;
  m.read = true;

  // Highlight active item
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById(`msgitem-${id}`);
  if (item) { item.classList.add('active'); item.classList.remove('unread'); }

  const detail = document.getElementById('msg-detail');
  detail.innerHTML = `
    <div class="msg-detail-header">
      <div class="msg-detail-from">${m.from} &lt;${m.email}&gt;</div>
      <div class="msg-detail-subject"><strong>Subject:</strong> ${m.subject}</div>
      <div class="msg-detail-meta">Received at ${m.time}</div>
    </div>
    <div class="msg-detail-body">${m.body}</div>
    <div class="msg-detail-actions">
      <button class="admin-btn admin-btn--primary" onclick="replyMessage(${m.id})">↩ Reply</button>
      <button class="admin-btn admin-btn--danger"  onclick="deleteMessage(${m.id})">🗑 Delete</button>
    </div>
  `;
  renderMessageList();
}

function replyMessage(id) {
  const m = ADMIN_MESSAGES.find(m => m.id === id);
  if (!m) return;
  adminToast(`Opening email client for ${m.email}…`, 'info');
  setTimeout(() => window.open(`mailto:${m.email}?subject=Re: ${m.subject}`), 400);
}

function deleteMessage(id) {
  ADMIN_MESSAGES = ADMIN_MESSAGES.filter(m => m.id !== id);
  document.getElementById('msg-detail').innerHTML = '<div class="msg-detail-empty">Select a message to read</div>';
  renderMessageList();
  addLog('info', 'Message deleted by Admin.');
  adminToast('Message deleted.', 'error');
}

// =========================================================
//  ANALYTICS — traffic bars
// =========================================================

function renderTrafficBars() {
  const el = document.getElementById('traffic-bars');
  if (!el) return;
  el.innerHTML = TRAFFIC_SOURCES.map(s => `
    <div class="analytics-bar-row">
      <div class="analytics-bar-label">${s.label}</div>
      <div class="analytics-bar-track">
        <div class="analytics-bar-fill" style="width:0%" data-pct="${s.pct}"></div>
      </div>
      <div class="analytics-bar-pct">${s.pct}%</div>
    </div>
  `).join('');
  // Animate fills after paint
  requestAnimationFrame(() => {
    el.querySelectorAll('.analytics-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  });
}

// =========================================================
//  DASHBOARD CHART (canvas sparkline)
// =========================================================

function drawAdminChart() {
  const canvas = document.getElementById('admin-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const data = [320, 480, 290, 600, 410, 720, 550];
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const max = Math.max(...data);
  const pad = { t: 10, r: 20, b: 24, l: 36 };
  const gW = W - pad.l - pad.r;
  const gH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(100,150,220,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (gH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gW, y); ctx.stroke();
  }

  // Area fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + gH);
  grad.addColorStop(0, 'rgba(58,143,212,0.35)');
  grad.addColorStop(1, 'rgba(58,143,212,0.02)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + (gW / (data.length - 1)) * i;
    const y = pad.t + gH - (v / max) * gH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + gW, pad.t + gH);
  ctx.lineTo(pad.l, pad.t + gH);
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.strokeStyle = '#3a8fd4';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + (gW / (data.length - 1)) * i;
    const y = pad.t + gH - (v / max) * gH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  ctx.fillStyle = '#1a62a8';
  data.forEach((v, i) => {
    const x = pad.l + (gW / (data.length - 1)) * i;
    const y = pad.t + gH - (v / max) * gH;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#667';
  ctx.font = '10px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    const x = pad.l + (gW / (data.length - 1)) * i;
    ctx.fillText(l, x, H - 4);
  });

  // Y labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (gH / 4) * i;
    const val = Math.round(max - (max / 4) * i);
    ctx.fillText(val, pad.l - 4, y + 3);
  }
}

// =========================================================
//  FILE MANAGER
// =========================================================

function renderFM(path) {
  fmCurrentPath = path || fmCurrentPath;
  const pathEl = document.getElementById('fm-path');
  const body   = document.getElementById('fm-body');
  if (!pathEl || !body) return;

  pathEl.textContent = fmCurrentPath;
  const node = FM_TREE[fmCurrentPath];
  if (!node) return;

  body.innerHTML = [
    ...node.dirs.map(d => `
      <div class="fm-item" ondblclick="fmNavigate('${fmCurrentPath === '/' ? '' : fmCurrentPath}/${d}')" title="${d}/">
        <div class="fm-item-icon">📁</div>
        <div class="fm-item-name">${d}</div>
      </div>`),
    ...node.files.map(f => `
      <div class="fm-item" title="${f}">
        <div class="fm-item-icon">${fmFileIcon(f)}</div>
        <div class="fm-item-name">${f}</div>
      </div>`),
  ].join('');
}

function fmFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { html:'🌐', css:'🎨', js:'⚙️', pdf:'📄', jpg:'🖼️', png:'🖼️', svg:'🖼️', md:'📝' };
  return map[ext] || '📄';
}

function fmNavigate(path) {
  if (FM_TREE[path]) renderFM(path);
}

function fmGoUp() {
  if (fmCurrentPath === '/') return;
  const parts = fmCurrentPath.split('/').filter(Boolean);
  parts.pop();
  renderFM(parts.length ? '/' + parts.join('/') : '/');
}

function fmNewFolder() {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;
  const clean = name.trim().replace(/[^a-z0-9_-]/gi, '_');
  const node = FM_TREE[fmCurrentPath];
  if (node && !node.dirs.includes(clean)) {
    node.dirs.push(clean);
    FM_TREE[`${fmCurrentPath === '/' ? '' : fmCurrentPath}/${clean}`] = { dirs: [], files: [] };
    renderFM();
    addLog('info', `Folder "${clean}" created at ${fmCurrentPath}`);
    adminToast(`Folder "${clean}" created.`, 'success');
  }
}

function fmUpload() {
  adminToast('File upload: connect to a backend to enable real uploads.', 'info', 4000);
}

// =========================================================
//  SETTINGS
// =========================================================

function saveSettings() {
  addLog('info', 'Site settings saved by Admin.');
  adminToast('Settings saved successfully.', 'success');
}

function changePassword() {
  const oldPw  = document.getElementById('set-pw-old').value;
  const newPw  = document.getElementById('set-pw-new').value;
  const confPw = document.getElementById('set-pw-confirm').value;
  const msg    = document.getElementById('set-pw-msg');

  if (oldPw !== 'aman123') {
    msg.style.color = '#c00';
    msg.textContent = 'Current password is incorrect.';
    return;
  }
  if (newPw.length < 4) {
    msg.style.color = '#c00';
    msg.textContent = 'New password must be at least 4 characters.';
    return;
  }
  if (newPw !== confPw) {
    msg.style.color = '#c00';
    msg.textContent = 'New passwords do not match.';
    return;
  }
  msg.style.color = '#2a8a2a';
  msg.textContent = 'Password updated successfully!';
  document.getElementById('set-pw-old').value   = '';
  document.getElementById('set-pw-new').value   = '';
  document.getElementById('set-pw-confirm').value = '';
  addLog('info', 'Admin password changed.');
  adminToast('Password updated.', 'success');
}

// =========================================================
//  SYSTEM LOG
// =========================================================

function addLog(level, msg) {
  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  SYS_LOGS.unshift({ time, level, msg });
  renderLogs();
  // update alert count for errors
  const errors = SYS_LOGS.filter(l => l.level === 'error').length;
  const el = document.getElementById('stat-logs');
  if (el) el.textContent = errors;
}

function renderLogs() {
  const body   = document.getElementById('syslog-body');
  const filter = document.getElementById('log-filter');
  if (!body) return;
  const level = filter ? filter.value : 'all';
  const lines  = level === 'all' ? SYS_LOGS : SYS_LOGS.filter(l => l.level === level);
  body.innerHTML = lines.map(l => `
    <div class="log-line">
      <span class="log-time">${l.time}</span>
      <span class="log-level log-level--${l.level}">[${l.level.toUpperCase()}]</span>
      <span class="log-msg">${l.msg}</span>
    </div>
  `).join('');
}

function clearLogs() {
  SYS_LOGS.length = 0;
  renderLogs();
  adminToast('Logs cleared.', 'info');
}

function exportLogs() {
  const txt = SYS_LOGS.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n');
  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `amanos-log-${Date.now()}.txt`;
  a.click();
  adminToast('Log exported.', 'success');
}

// =========================================================
//  SHUTDOWN (admin version)
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
//  CLOCK (reuse ui.js updateClock pattern for admin tray)
// =========================================================

function updateAdminClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const day  = days[now.getDay()];
  const date = `${day} ${now.getMonth() + 1}/${now.getDate()}`;
  const timeEl = document.getElementById('tray-time');
  const dateEl = document.getElementById('tray-date');
  if (timeEl) timeEl.textContent = `${h}:${m}`;
  if (dateEl) dateEl.textContent = date;
}

// =========================================================
//  ADMIN DESKTOP INIT
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  // 1. Welcome screen → reveal desktop after 2s
  const welcome = document.getElementById('admin-welcome');
  const desktop = document.getElementById('admin-desktop');

  setTimeout(() => {
    if (welcome) welcome.classList.add('fade-out');
    if (desktop) {
      desktop.classList.remove('admin-desktop--hidden');
      desktop.classList.add('admin-desktop--reveal');
    }
    setTimeout(() => {
      if (welcome) welcome.style.display = 'none';
    }, 750);
  }, 2000);

  // 2. Wire all admin windows (ui.js init is skipped on admin pages)
  document.querySelectorAll('.os-window:not([role="dialog"])').forEach(win => {
    makeDraggable(win);
    makeResizable(win);
    const btns = win.querySelectorAll('.title-bar-controls button');
    if (btns.length === 3) wireButtons(win);
    setupTabs(win);
    win.addEventListener('mousedown', () => {
      if (!win.classList.contains('minimized') && !win.classList.contains('closed')) {
        bringToFront(win);
      }
    });
  });

  // 3. Desktop icons
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const id = icon.dataset.window;
    if (!id) return;
    icon.addEventListener('dblclick', () => openWindow(id));
    icon.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWindow(id); }
    });
    icon.addEventListener('click', e => {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
      e.stopPropagation();
    });
  });

  document.getElementById('admin-desktop').addEventListener('click', () => {
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  });

  // 4. Show Desktop button
  setupShowDesktop();

  // 5. Start menu close-on-outside-click
  document.addEventListener('click', e => {
    const menu = document.getElementById('start-menu');
    const btn  = document.getElementById('start-btn');
    if (menu && menu.classList.contains('open') &&
        !menu.contains(e.target) && !btn.contains(e.target)) {
      closeStartMenu();
    }
  });

  // 6. Right-click context menu on desktop
  const desktop2 = document.getElementById('admin-desktop');
  const ctxMenu  = document.getElementById('ctx-menu');
  if (desktop2 && ctxMenu) {
    desktop2.addEventListener('contextmenu', e => {
      if (e.target.closest('.os-window') || e.target.closest('.taskbar')) return;
      e.preventDefault();
      ctxMenu.style.left    = e.clientX + 'px';
      ctxMenu.style.top     = Math.min(e.clientY, window.innerHeight - 100) + 'px';
      ctxMenu.style.display = 'block';
    });
    document.addEventListener('click', () => { ctxMenu.style.display = 'none'; });
  }

  // 7. Clock
  updateAdminClock();
  setInterval(updateAdminClock, 10000);

  // 8. Open Dashboard by default
  const dash = document.getElementById('win-dashboard');
  if (dash) {
    dash.classList.remove('closed');
    setTimeout(() => bringToFront(dash), 2100);
  }
  updateTaskbarButtons();

  // 9. Populate all data-driven panels
  renderUsers();
  renderMessageList();
  renderLogs();
  renderTrafficBars();
  setTimeout(drawAdminChart, 100); // wait for canvas layout

  // 10. Init file manager
  renderFM('/');

  // 11. Render analytics bars with animation delay
  setTimeout(renderTrafficBars, 400);
});
