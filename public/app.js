/* BizFlow CRM - 다국어 프런트엔드 (KO/EN/JA) */
'use strict';

/* ============ state ============ */
const state = {
  lang: localStorage.getItem('bizflow_lang') || 'ko',
  token: localStorage.getItem('bizflow_token'),
  user: JSON.parse(localStorage.getItem('bizflow_user') || 'null'),
  workspaces: [],
  currentWorkspace: null,
  route: 'dashboard',
  deals: [],
  contacts: [],
  teams: [],
  users: [],
  reminders: [],
  notifications: [],
  view: 'dashboard',
  period: 'month',
  authMode: 'login',
};

const API = (path) => '/api' + path;

function t(key) { return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key; }
function stageLabel(key) {
  const s = STAGE_I18N[key];
  return s ? s[state.lang] : (key || '');
}
function dealTypeLabel(key) {
  if (!key) return '';
  const s = DEAL_TYPE_I18N[key];
  return s ? s[state.lang] : key;
}
function money(v, currency) {
  const c = currency || (state.currentWorkspace && state.currentWorkspace.defaultCurrency) || 'USD';
  try { return new Intl.NumberFormat(state.lang === 'ko' ? 'ko-KR' : state.lang === 'ja' ? 'ja-JP' : 'en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0); }
  catch (e) { return (c === 'KRW' ? '₩' : c === 'JPY' ? '¥' : '$') + (v || 0).toLocaleString(); }
}
function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(state.lang === 'ko' ? 'ko-KR' : state.lang === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function initials(name) { return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

/* ============ api helper ============ */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(API(path), { ...opts, headers });
  if (res.status === 401) {
    logout();
    throw new Error('unauthorized');
  }
  let body = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) {
    try { body = await res.json(); } catch (e) { body = null; }
  }
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || res.statusText;
    throw new Error(msg || 'request failed');
  }
  return body;
}

function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('bizflow_token');
  localStorage.removeItem('bizflow_user');
  state.currentWorkspace = null; state.workspaces = [];
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('bizflow_lang', lang);
  document.documentElement.lang = lang;
  render();
}

/* ============ router ============ */
function navigate(route) {
  state.route = route;
  render();
  window.scrollTo(0, 0);
}

/* ============ icon helper ============ */
const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  deals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19l-1.5-1.5 2.3-2.3H7.3l2.3 2.3L8 19l-4.3-4.3a2.4 2.4 0 0 1 0-3.4L10 5a2.4 2.4 0 0 1 3.4 0l1.6 1.6L18.5 5z"/></svg>',
  pipeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  contacts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  teams: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  reminders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6M22 6l-3-3M6 3l-4 4M18 3l4 4"/></svg>',
  notifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  webhooks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
  switch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4a2 2 0 0 0-2-2h-14a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M9 10h6M9 14h6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
};

function icon(name) { return ICONS[name] || ''; }

/* ============ toasts ============ */
function toast(msg, type = 'success') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

/* ============ modal ============ */
function openModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay;
}

/* ============ render ============ */
function render() {
  const root = document.getElementById('root');
  if (!state.token || !state.user) {
    root.innerHTML = renderAuth();
    bindAuth();
    return;
  }
  if (!state.currentWorkspace) {
    root.innerHTML = renderWorkspacePicker();
    bindWorkspacePicker();
    return;
  }
  root.innerHTML = renderApp();
  bindApp();
  renderContent();
}

async function renderContent() {
  if (!state.token || !state.user || !state.currentWorkspace) return;
  const content = document.getElementById('content');
  if (content) content.innerHTML = await renderRoute();
  bindRoute();
}
function langSwitchBtn() {
  return `<div class="lang-switch">
    <button data-lang="ko" class="${state.lang === 'ko' ? 'active' : ''}">한</button>
    <button data-lang="en" class="${state.lang === 'en' ? 'active' : ''}">EN</button>
    <button data-lang="ja" class="${state.lang === 'ja' ? 'active' : ''}">日</button>
  </div>`;
}

function bindLang() {
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang')));
  });
}

/* ============ AUTH ============ */
function renderAuth() {
  const mode = state.authMode || 'login';
  return `<div class="auth-screen">
    ${langSwitchBtn().replace('class="lang-switch"', 'class="lang-switch lang-switch-auth"')}
    <div class="auth-card">
      <div class="auth-logo">
        <div class="logo-badge">B</div>
        <h1>${t('appName')}</h1>
        <p>${t('appTag')}</p>
      </div>
      <div class="auth-box">
        <h2>${mode === 'login' ? t('sign_in') : t('create_account')}</h2>
        <div id="auth-error"></div>
        <div id="auth-success"></div>
        <form id="auth-form" novalidate>
          ${mode === 'register' ? `<div class="field"><label>${t('full_name')}</label><input type="text" id="auth-name" required placeholder="John Doe"></div>
          <div class="field"><label>${t('workspace_name_opt')}</label><input type="text" id="auth-workspace" placeholder="My Company"></div>` : ''}
          <div class="field"><label>${t('email')}</label><input type="email" id="auth-email" required placeholder="you@example.com"></div>
          <div class="field"><label>${t('password')}</label><input type="password" id="auth-password" required minlength="8" placeholder="${mode === 'register' ? t('min_8') : '••••••••'}"></div>
          <button type="submit" class="btn-primary" id="auth-submit">${mode === 'login' ? t('sign_in') : t('create_account')}</button>
        </form>
        <div class="auth-switch">
          <button id="auth-toggle">${mode === 'login' ? t('no_account') : t('already_account')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function bindAuth() {
  bindLang();
  const form = document.getElementById('auth-form');
  const errBox = document.getElementById('auth-error');
  const okBox = document.getElementById('auth-success');
  const submitBtn = document.getElementById('auth-submit');
  document.getElementById('auth-toggle').addEventListener('click', () => {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    render();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.innerHTML = ''; okBox.innerHTML = '';
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    submitBtn.disabled = true;
    submitBtn.textContent = state.authMode === 'login' ? t('signing_in') : t('creating_account');
    try {
      let result;
      if (state.authMode === 'login') {
        result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      } else {
        const name = (document.getElementById('auth-name').value || '').trim();
        const workspaceName = (document.getElementById('auth-workspace').value || '').trim() || undefined;
        result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, workspaceName }) });
      }
      state.token = result.token;
      state.user = result.user;
      localStorage.setItem('bizflow_token', result.token);
      localStorage.setItem('bizflow_user', JSON.stringify(result.user));
      await loadWorkspaces();
      const ws = state.workspaces.find(w => w.id === result.user.workspaceId) || state.workspaces[0] || null;
      state.currentWorkspace = ws;
      state.route = 'dashboard';
      render();
    } catch (err) {
      errBox.innerHTML = `<div class="error-box">${state.authMode === 'login' ? t('invalid_credentials') : t('registration_failed')}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = state.authMode === 'login' ? t('sign_in') : t('create_account');
    }
  });
}

/* ============ WORKSPACE PICKER ============ */
function renderWorkspacePicker() {
  return `<div class="auth-screen">
    ${langSwitchBtn().replace('class="lang-switch"', 'class="lang-switch lang-switch-auth"')}
    <div class="auth-card">
      <div class="auth-logo"><div class="logo-badge">B</div><h1>${t('appName')}</h1><p>${t('appTag')}</p></div>
      <div class="auth-box">
        <h2>${t('select_workspace')}</h2>
        ${state.workspaces.length === 0 ? `<div class="error-box">${t('no_workspace')}</div>
          <div class="field"><label>${t('workspace_name')}</label><input type="text" id="ws-name" placeholder="${t('workspace_name')}"></div>
          <button class="btn-primary" id="ws-create">${t('create_workspace')}</button>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${state.workspaces.map(w => `<button class="ws-option" data-wsid="${w.id}" style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;color:white;text-align:left;">
            <span style="font-weight:600;font-size:14px;">${esc(w.name)}</span>
            <span style="color:var(--cream);font-size:11px;text-transform:uppercase;">${esc(w.plan)}</span></button>`).join('')}
        </div>
        <div style="text-align:center;margin-top:18px;"><button id="ws-signout" style="color:var(--slate-400);font-size:13px;">${t('nav_signout')}</button></div>
      </div>
    </div>
  </div>`;
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function bindWorkspacePicker() {
  bindLang();
  document.querySelectorAll('.ws-option').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.currentWorkspace = state.workspaces.find(w => w.id === btn.getAttribute('data-wsid'));
      state.route = 'dashboard';
      render();
    });
  });
  const signout = document.getElementById('ws-signout');
  if (signout) signout.addEventListener('click', () => { logout(); render(); });
  const createBtn = document.getElementById('ws-create');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name = (document.getElementById('ws-name').value || '').trim();
      if (!name) return;
      try {
        const ws = await api('/workspaces', { method: 'POST', body: JSON.stringify({ name, type: 'SALES', plan: 'FREE' }) });
        await loadWorkspaces();
        state.currentWorkspace = ws;
        state.route = 'dashboard';
        render();
      } catch (e) { toast(t('save_failed'), 'error'); }
    });
  }
}

/* ============ APP LAYOUT ============ */
function renderApp() {
  const ws = state.currentWorkspace;
  const navItems = [
    ['dashboard', t('nav_dashboard')], ['deals', t('nav_deals')], ['pipeline', t('nav_pipeline')],
    ['contacts', t('nav_contacts')], ['teams', t('nav_teams')], ['users', t('nav_users')],
    ['reminders', t('nav_reminders')], ['notifications', t('nav_notifications')],
    ['settings', t('nav_settings')], ['webhooks', t('nav_webhooks')], ['audit', t('nav_audit')], ['trash', t('nav_trash')],
  ];
  const unreadCount = (state.notifications || []).filter(n => !n.read).length;
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-badge">B</div>
        <div class="logo-text"><h2>${t('appName')}</h2><p>${t('appTag')}</p></div>
      </div>
      <nav class="nav-section">
        <div class="nav-label">${t('nav_dashboard').toUpperCase()}</div>
        ${navItems.slice(0, 4).map(([r, label]) => navItem(r, label, r === 'notifications' ? unreadCount : 0)).join('')}
        <div class="nav-label">${t('nav_teams').toUpperCase()}</div>
        ${navItems.slice(4, 8).map(([r, label]) => navItem(r, label, r === 'notifications' ? unreadCount : 0)).join('')}
        <div class="nav-label">${t('nav_settings').toUpperCase()}</div>
        ${navItems.slice(8).map(([r, label]) => navItem(r, label, 0)).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="workspace-pill">
          <div>
            <div class="ws-name">${esc(ws.name)}</div>
            <div class="ws-plan">${esc(ws.plan)}</div>
          </div>
          <button id="nav-ws-switch" title="${t('switch_workspace')}">${icon('switch')}</button>
        </div>
        <div class="user-row">
          <div class="user-avatar">${initials(state.user.name)}</div>
          <div style="flex:1;min-width:0;">
            <div class="u-name">${esc(state.user.name)}</div>
            <div class="u-role">${esc(roleLabel(state.user.role))}</div>
          </div>
          <button id="nav-signout" class="btn-icon" title="${t('nav_signout')}" style="color:var(--slate-400)">${icon('logout')}</button>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:center;">${langSwitchBtn()}</div>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn-icon mobile-nav-toggle" id="mobile-nav-toggle" style="color:var(--navy)">${icon('menu')}</button>
          <h1>${esc(pageTitle())}</h1>
        </div>
        <div class="topbar-right">
          <button class="btn-icon" id="nav-refresh" title="${t('refresh')}" style="color:var(--navy)">${icon('refresh')}</button>
          <button class="btn-icon" id="nav-bell" title="${t('nav_notifications')}" style="color:var(--navy);position:relative;">${icon('bell')}${unreadCount > 0 ? `<span style="position:absolute;top:2px;right:2px;background:var(--coral);color:var(--navy);border-radius:99px;font-size:9px;font-weight:700;padding:1px 5px;">${unreadCount}</span>` : ''}</button>
        </div>
      </div>
      <div class="content" id="content"><div class="empty-state"><p>${t('loading')}</p></div></div>
    </div>
  </div>`;
}

function navItem(route, label, badge) {
  return `<button class="nav-item ${state.route === route ? 'active' : ''}" data-nav="${route}">
    ${icon(route)}<span>${label}</span>${badge > 0 ? `<span class="nav-badge">${badge}</span>` : ''}
  </button>`;
}

function pageTitle() {
  const map = {
    dashboard: t('nav_dashboard'), deals: t('nav_deals'), pipeline: t('nav_pipeline'),
    contacts: t('nav_contacts'), teams: t('nav_teams'), users: t('nav_users'),
    reminders: t('nav_reminders'), notifications: t('nav_notifications'), settings: t('nav_settings'),
    webhooks: t('nav_webhooks'), audit: t('nav_audit'), trash: t('nav_trash'),
  };
  return map[state.route] || state.route;
}

function roleLabel(role) {
  const m = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', USER: 'User' };
  return m[role] || role;
}

function bindApp() {
  bindLang();
  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => navigate(b.getAttribute('data-nav'))));
  document.getElementById('nav-signout').addEventListener('click', () => {
    if (confirm(t('logout_confirm'))) { logout(); render(); }
  });
  document.getElementById('nav-ws-switch').addEventListener('click', () => { state.currentWorkspace = null; render(); });
  document.getElementById('nav-refresh').addEventListener('click', () => loadAll());
  const bell = document.getElementById('nav-bell');
  if (bell) bell.addEventListener('click', () => { state.route = 'notifications'; render(); });
  const toggle = document.getElementById('mobile-nav-toggle');
  if (toggle) toggle.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
}

/* ============ data loading ============ */
async function loadAll() {
  if (!state.currentWorkspace) return;
  const wsId = state.currentWorkspace.id;
  const jobs = [];
  jobs.push(api(`/deals?workspaceId=${wsId}&limit=1000`).then(d => { state.deals = Array.isArray(d) ? d : (d?.data || d?.items || []); }).catch(() => { state.deals = []; }));
  jobs.push(api(`/contacts?workspaceId=${wsId}`).then(d => { state.contacts = Array.isArray(d) ? d : (d?.data || d?.items || []); }).catch(() => { state.contacts = []; }));
  jobs.push(api('/teams').then(d => { state.teams = Array.isArray(d) ? d : (d?.data || d?.items || []); }).catch(() => { state.teams = []; }));
  jobs.push(api('/users').then(d => { state.users = Array.isArray(d) ? d : (d?.data || d?.items || []); }).catch(() => { state.users = []; }));
  jobs.push(api(`/reminders?workspaceId=${wsId}&userId=${state.user.id}`).then(d => { state.reminders = Array.isArray(d) ? d : (d?.data || d?.items || []); }).catch(() => { state.reminders = []; }));
  jobs.push(api(`/notifications?workspaceId=${wsId}&userId=${state.user.id}`).then(d => { state.notifications = Array.isArray(d) ? d : (d?.data || d?.items || []); }).catch(() => { state.notifications = []; }));
  await Promise.all(jobs);
  await renderContent();
}

async function loadWorkspaces() {
  try {
    const d = await api('/workspaces');
    state.workspaces = Array.isArray(d) ? d : (d?.data || d?.items || []);
  } catch (e) { state.workspaces = []; }
}

/* ============ ROUTES ============ */
async function renderRoute() {
  switch (state.route) {
    case 'dashboard': return renderDashboard();
    case 'deals': return renderDeals();
    case 'pipeline': return renderPipeline();
    case 'contacts': return renderContacts();
    case 'teams': return renderTeams();
    case 'users': return renderUsers();
    case 'reminders': return renderReminders();
    case 'notifications': return renderNotifications();
    case 'settings': return renderSettings();
    case 'webhooks': return renderWebhooks();
    case 'audit': return renderAudit();
    case 'trash': return renderTrash();
    default: return '<div class="empty-state"><p>404</p></div>';
  }
}

function bindRoute() {
  switch (state.route) {
    case 'deals': bindDeals(); break;
    case 'pipeline': bindPipeline(); break;
    case 'contacts': bindContacts(); break;
    case 'teams': bindTeams(); break;
    case 'users': bindUsers(); break;
    case 'reminders': bindReminders(); break;
    case 'notifications': bindNotifications(); break;
    case 'settings': bindSettings(); break;
    case 'webhooks': bindWebhooks(); break;
    case 'trash': bindTrash(); break;
  }
}

/* ============ DASHBOARD ============ */
async function renderDashboard() {
  const wsId = state.currentWorkspace.id;
  const loader = `<div class="empty-state"><div class="empty-icon">📊</div><p>${t('loading')}</p></div>`;
  let stats = null;
  try {
    const d = await api(`/analytics/dashboard?workspaceId=${wsId}`);
    stats = d.current || d;
  } catch (e) {}
  const deals = state.deals || [];
  const c = stats || {};
  const totalDeals = deals.length;
  const companies = deals.filter(d => d.clientType === 'COMPANY').length;
  const individuals = deals.filter(d => d.clientType === 'INDIVIDUAL').length;
  const stageBreakdown = (c.stageBreakdown || []).slice(0, 8);
  const recent = [...deals].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
  const won = deals.filter(d => d.stage === 'WON').length;
  const lost = deals.filter(d => d.stage === 'LOST').length;
  const attention = (c.dealsRequiringAttention != null ? c.dealsRequiringAttention : deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST').length);
  const maxStage = Math.max(1, ...stageBreakdown.map(s => s.totalValue || 0));

  return `
  <div class="stat-grid">
    ${statCard(t('total_pipeline_value'), money(c.totalPipelineValue), c.trends ? trendText(c.trends.pipelineValueChange) : '')}
    ${statCard(t('weighted_forecast'), money(c.weightedForecast), t('prob_adjusted'))}
    ${statCard(t('active_deals'), c.activeDeals, c.trends ? trendText(c.trends.activeDealChange) : '')}
    ${statCard(t('win_rate'), (c.winRate != null ? c.winRate : (totalDeals ? (won / totalDeals * 100) : 0)).toFixed(1) + '%', won + ' ' + t('won_deals').toLowerCase())}
  </div>
  <div class="chart-row">
    <div class="panel">
      <h3>${t('pipeline_value_by_stage')}</h3>
      ${stageBreakdown.length === 0 ? `<div class="empty-state"><p>${t('no_deals')}</p></div>` : `<div class="bars">
        ${stageBreakdown.map(s => `<div class="bar-row">
          <div class="bar-label">${esc(stageLabel(s.stage))}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (s.totalValue / maxStage) * 100)}%"></div></div>
          <div class="bar-value">${money(s.totalValue)}</div>
        </div>`).join('')}
      </div>`}
    </div>
    <div class="panel">
      <h3>${t('client_distribution')}</h3>
      <div class="kpi-inline" style="margin-bottom:14px;">
        <span class="kpi-tag">${t('company')}: <b>${companies}</b></span>
        <span class="kpi-tag">${t('individual')}: <b>${individuals}</b></span>
        <span class="kpi-tag">${t('won_deals')}: <b>${won}</b></span>
        <span class="kpi-tag">${t('stage_lost')}: <b>${lost}</b></span>
        <span class="kpi-tag">${t('deals_requiring_attention')}: <b>${attention}</b></span>
      </div>
      <div style="margin-top:10px;"><h3 style="margin-bottom:8px;">${t('recent_deals')}</h3>
        ${recent.length === 0 ? `<div class="empty-state"><p>${t('no_deals')}</p></div>` : `<div style="display:flex;flex-direction:column;gap:8px;">${recent.map(d => `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:var(--slate-100);border-radius:8px;">
          <div><div style="font-weight:600;color:var(--navy);font-size:13px;">${esc(d.title)}</div><div style="font-size:11px;color:var(--slate-400);">${esc(d.clientName || '')}</div></div>
          <div style="text-align:right;"><div style="font-weight:700;color:var(--navy);font-size:13px;">${money(d.value, d.currency)}</div>${stagePill(d.stage)}</div>
        </div>`).join('')}</div>`}
      </div>
    </div>
  </div>`;
}

function statCard(label, value, sub) {
  const pos = sub && sub.includes('-') ? 'negative' : (sub && sub !== 'Prob. Adjusted' && sub !== '확률 반영' && sub !== '確率反映' ? 'positive' : '');
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub ${pos}">${sub}</div>` : ''}</div>`;
}

function trendText(change) {
  const v = Number(change || 0);
  if (v === 0) return '0% ' + t('vs_last_month');
  return (v > 0 ? '+' : '') + v + '% ' + t('vs_last_month');
}

function stagePill(stage) {
  let cls = 'stage-neutral';
  if (stage === 'WON') cls = 'stage-won';
  else if (stage === 'LOST') cls = 'stage-lost';
  else if (stage === 'CLOSING' || stage === 'ORDER_EXPECTED' || stage === 'TERM_SHEET') cls = 'stage-closing';
  else if (stage && stage !== 'PROSPECT') cls = 'stage-active';
  return `<span class="stage-pill ${cls}">${esc(stageLabel(stage))}</span>`;
}

/* ============ DEALS ============ */
function renderDeals() {
  const deals = state.deals || [];
  const tab = state.dealsTab || 'all';
  const filtered = tab === 'mine' ? deals.filter(d => d.assignedToUserId === state.user.id) : deals;
  const search = (state.dealsSearch || '').toLowerCase();
  const shown = filtered.filter(d => !search || (d.title || '').toLowerCase().includes(search) || (d.clientName || '').toLowerCase().includes(search) || (d.contactEmail || '').toLowerCase().includes(search));
  return `
  <div class="toolbar">
    <div class="tab-group">
      <button data-dtab="all" class="${tab === 'all' ? 'active' : ''}">${t('all_deals')}</button>
      <button data-dtab="mine" class="${tab === 'mine' ? 'active' : ''}">${t('my_deals')}</button>
    </div>
    <div style="flex:1;"></div>
    <div class="search-input-wrap" style="position:relative;flex:1;min-width:200px;max-width:340px;">
      <input class="search-input" id="deals-search" placeholder="${t('search_deals')}" value="${esc(state.dealsSearch || '')}" style="width:100%;">
    </div>
    <button class="btn btn-coral" id="add-deal">${icon('plus')}${t('add_deal')}</button>
  </div>
  ${shown.length === 0 ? `<div class="table-wrap"><div class="empty-state"><div class="empty-icon">📄</div><p>${search ? t('no_deals_found') : t('no_deals')}</p><button class="btn btn-navy" id="empty-add-deal">${t('add_first_deal')}</button></div></div>` : `
  <div class="table-wrap"><table>
    <thead><tr>
      <th>${t('deal_name')}</th><th>${t('client')}</th><th>${t('value')}</th><th>${t('stage')}</th><th>${t('owner')}</th><th>${t('expected_close')}</th><th>${t('actions')}</th>
    </tr></thead>
    <tbody>${shown.map(d => `<tr>
      <td><span class="cell-title">${esc(d.title)}</span><div style="font-size:11px;color:var(--slate-400);">${esc(d.contactEmail || '')}</div></td>
      <td>${esc(d.clientName || '')}</td>
      <td class="mono">${money(d.value, d.currency)}</td>
      <td>${stagePill(d.stage)}</td>
      <td>${esc(userName(d.assignedToUserId))}</td>
      <td>${fmtDate(d.expectedCloseDate)}</td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn-icon" data-deal-edit="${d.id}" title="${t('edit_deal')}">${icon('edit')}</button>
        <button class="btn-icon" data-deal-delete="${d.id}" title="${t('delete')}" style="color:var(--red-500);">✕</button>
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div>`}`;
}

function userName(id) {
  const u = (state.users || []).find(u => u.id === id);
  return u ? u.name : (id === state.user.id ? state.user.name : '-');
}

function bindDeals() {
  document.querySelectorAll('[data-dtab]').forEach(b => b.addEventListener('click', () => { state.dealsTab = b.getAttribute('data-dtab'); render(); }));
  const search = document.getElementById('deals-search');
  if (search) search.addEventListener('input', (e) => { state.dealsSearch = e.target.value; render(); });
  const addBtn = document.getElementById('add-deal');
  const emptyAdd = document.getElementById('empty-add-deal');
  if (addBtn) addBtn.addEventListener('click', () => dealModal(null));
  if (emptyAdd) emptyAdd.addEventListener('click', () => dealModal(null));
  document.querySelectorAll('[data-deal-edit]').forEach(b => b.addEventListener('click', () => {
    const d = state.deals.find(x => x.id === b.getAttribute('data-deal-edit')); if (d) dealModal(d);
  }));
  document.querySelectorAll('[data-deal-delete]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-deal-delete');
    if (!confirm(t('delete_confirm'))) return;
    try { await api('/deals/' + id, { method: 'DELETE' }); toast(t('deal_deleted')); loadAll(); }
    catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

function dealModal(deal) {
  const isEdit = !!deal;
  const stages = Object.keys(STAGE_I18N);
  const users = state.users || [];
  const overlay = openModal(`
    <div class="modal-head"><h2>${isEdit ? t('edit_deal') : t('add_deal')}</h2><button class="modal-close" id="dl-close">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('deal_name')} *</label><input type="text" id="f-title" value="${esc(deal ? deal.title : '')}" required></div>
      <div class="field"><label>${t('client_name')}</label><input type="text" id="f-client" value="${esc(deal ? deal.clientName : '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>${t('deal_value')}</label><input type="number" id="f-value" value="${deal ? deal.value : ''}" min="0"></div>
        <div class="field"><label>${t('stage')}</label><select id="f-stage">${stages.map(s => `<option value="${s}" ${deal && deal.stage === s ? 'selected' : ''}>${esc(stageLabel(s))}</option>`).join('')}</select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>${t('probability')} (%)</label><input type="number" id="f-prob" min="0" max="100" value="${deal ? deal.probability : 0}"></div>
        <div class="field"><label>${t('assigned_to')}</label><select id="f-owner"><option value="">-</option>${users.map(u => `<option value="${u.id}" ${deal && deal.assignedToUserId === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>${t('expected_close_date')}</label><input type="date" id="f-close" value="${deal && deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : ''}"></div>
        <div class="field"><label>${t('lead_source')}</label><input type="text" id="f-source" value="${esc(deal ? deal.leadSource : '')}"></div>
      </div>
      <div class="field"><label>${t('notes')}</label><textarea id="f-notes" rows="3">${esc(deal ? deal.notes : '')}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="dl-cancel">${t('cancel')}</button>
      <button class="btn btn-navy" id="dl-save">${isEdit ? t('save_deal') : t('create')}</button>
    </div>`);
  overlay.querySelector('#dl-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#dl-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#dl-save').addEventListener('click', async () => {
    const title = overlay.querySelector('#f-title').value.trim();
    if (!title) { toast(t('deal_name') + ' *', 'error'); return; }
    const payload = {
      title,
      clientName: overlay.querySelector('#f-client').value.trim() || undefined,
      value: Number(overlay.querySelector('#f-value').value) || 0,
      stage: overlay.querySelector('#f-stage').value,
      probability: Number(overlay.querySelector('#f-prob').value) || 0,
      assignedToUserId: overlay.querySelector('#f-owner').value || undefined,
      expectedCloseDate: overlay.querySelector('#f-close').value ? new Date(overlay.querySelector('#f-close').value).toISOString() : undefined,
      leadSource: overlay.querySelector('#f-source').value.trim() || undefined,
      notes: overlay.querySelector('#f-notes').value.trim() || undefined,
    };
    try {
      if (isEdit) { await api('/deals/' + deal.id, { method: 'PATCH', body: JSON.stringify(payload) }); toast(t('deal_updated')); }
      else { await api('/deals', { method: 'POST', body: JSON.stringify(payload) }); toast(t('deal_created')); }
      overlay.remove(); loadAll();
    } catch (e) { toast(t('save_failed'), 'error'); }
  });
}

/* ============ PIPELINE ============ */
function renderPipeline() {
  const deals = state.deals || [];
  const stageOrder = ['PROSPECT', 'ENQUIRY', 'OUTREACH', 'INITIAL_CONTACT', 'QUALIFIED_LEAD', 'ACTIVE_QUALIFIED_LEAD', 'PITCH', 'PILOT_POC', 'TERM_SHEET', 'DUE_DILIGENCE', 'AGREEMENT_DRAFTED', 'ORDER_EXPECTED', 'CLOSING', 'PARTNERSHIP_LIVE', 'WIRED', 'WON', 'LOST'];
  return `<div class="board">${stageOrder.map(st => {
    const cols = deals.filter(d => d.stage === st);
    const total = cols.reduce((s, d) => s + (d.value || 0), 0);
    return `<div class="board-col" data-stage="${st}">
      <div class="board-col-head"><span class="col-name">${esc(stageLabel(st))}</span><span class="col-count">${cols.length} · ${money(total)}</span></div>
      ${cols.map(d => `<div class="board-card" data-deal-id="${d.id}" draggable="true">
        <div class="card-title">${esc(d.title)}</div>
        <div class="card-meta"><span class="card-client">${esc(d.clientName || '')}</span></div>
        <div class="card-meta" style="margin-top:6px;"><span class="card-value">${money(d.value, d.currency)}</span><span class="stage-pill stage-neutral" style="font-size:10px;">${d.probability != null ? d.probability + '%' : ''}</span></div>
      </div>`).join('')}
      ${cols.length === 0 ? `<div style="height:30px;"></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function bindPipeline() {
  document.querySelectorAll('.board-card').forEach(card => {
    card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', card.getAttribute('data-deal-id')));
  });
  document.querySelectorAll('.board-col').forEach(col => {
    col.addEventListener('dragover', (e) => e.preventDefault());
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      const dealId = e.dataTransfer.getData('text/plain');
      const stage = col.getAttribute('data-stage');
      if (!dealId || !stage) return;
      try {
        await api('/deals/' + dealId, { method: 'PATCH', body: JSON.stringify({ stage }) });
        loadAll();
      } catch (err) { toast(t('save_failed'), 'error'); }
    });
  });
}

/* ============ CONTACTS ============ */
function renderContacts() {
  const contacts = state.contacts || [];
  const search = (state.contactsSearch || '').toLowerCase();
  const shown = contacts.filter(c => !search || (c.firstName || '').toLowerCase().includes(search) || (c.lastName || '').toLowerCase().includes(search) || (c.email || '').toLowerCase().includes(search) || (c.company || '').toLowerCase().includes(search));
  return `
  <div class="toolbar">
    <div style="flex:1;"></div>
    <div class="search-input-wrap" style="position:relative;flex:1;min-width:200px;max-width:340px;">
      <input class="search-input" id="contacts-search" placeholder="${t('search_contacts')}" value="${esc(state.contactsSearch || '')}" style="width:100%;">
    </div>
    <button class="btn btn-coral" id="add-contact">${icon('plus')}${t('add_contact')}</button>
  </div>
  ${shown.length === 0 ? `<div class="table-wrap"><div class="empty-state"><div class="empty-icon">👤</div><p>${search ? t('no_contacts_match') : t('no_contacts')}</p><button class="btn btn-navy" id="empty-add-contact">${t('add_first_contact')}</button></div></div>` : `
  <div class="table-wrap"><table>
    <thead><tr><th>${t('name')}</th><th>${t('email_address')}</th><th>${t('company_name')}</th><th>${t('job_title')}</th><th>${t('phone')}</th><th>${t('type')}</th><th>${t('actions')}</th></tr></thead>
    <tbody>${shown.map(c => `<tr>
      <td><div style="display:flex;align-items:center;gap:9px;"><div class="user-avatar" style="width:28px;height:28px;font-size:11px;background:${c.avatarColor || '#4F46E5'};">${initials((c.firstName || '') + ' ' + (c.lastName || ''))}</div><span class="cell-title">${esc((c.firstName || '') + ' ' + (c.lastName || ''))}</span></div></td>
      <td>${esc(c.email || '')}</td><td>${esc(c.company || '')}</td><td>${esc(c.jobTitle || '')}</td><td>${esc(c.phone || '')}</td>
      <td>${esc(c.type || '')}</td>
      <td><div style="display:flex;gap:4px;"><button class="btn-icon" data-contact-edit="${c.id}" title="${t('edit_contact')}">${icon('edit')}</button><button class="btn-icon" data-contact-delete="${c.id}" title="${t('delete')}" style="color:var(--red-500);">✕</button></div></td>
    </tr>`).join('')}</tbody>
  </table></div>`}`;
}

function bindContacts() {
  const search = document.getElementById('contacts-search');
  if (search) search.addEventListener('input', (e) => { state.contactsSearch = e.target.value; render(); });
  const addBtn = document.getElementById('add-contact');
  const emptyAdd = document.getElementById('empty-add-contact');
  if (addBtn) addBtn.addEventListener('click', () => contactModal(null));
  if (emptyAdd) emptyAdd.addEventListener('click', () => contactModal(null));
  document.querySelectorAll('[data-contact-edit]').forEach(b => b.addEventListener('click', () => {
    const c = state.contacts.find(x => x.id === b.getAttribute('data-contact-edit')); if (c) contactModal(c);
  }));
  document.querySelectorAll('[data-contact-delete]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-contact-delete');
    if (!confirm(t('delete_contact_confirm'))) return;
    try { await api('/contacts/' + id, { method: 'DELETE' }); toast(t('contact_deleted')); loadAll(); }
    catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

function contactModal(contact) {
  const isEdit = !!contact;
  const overlay = openModal(`
    <div class="modal-head"><h2>${isEdit ? t('edit_contact') : t('add_contact')}</h2><button class="modal-close" id="ct-close">✕</button></div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>${t('first_name')} *</label><input type="text" id="f-fn" value="${esc(contact ? contact.firstName : '')}" required></div>
        <div class="field"><label>${t('last_name')}</label><input type="text" id="f-ln" value="${esc(contact ? contact.lastName : '')}"></div>
      </div>
      <div class="field"><label>${t('email_address')}</label><input type="email" id="f-email" value="${esc(contact ? contact.email : '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>${t('company_name')}</label><input type="text" id="f-co" value="${esc(contact ? contact.company : '')}"></div>
        <div class="field"><label>${t('job_title')}</label><input type="text" id="f-job" value="${esc(contact ? contact.jobTitle : '')}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>${t('phone')}</label><input type="text" id="f-phone" value="${esc(contact ? contact.phone : '')}"></div>
        <div class="field"><label>${t('type')}</label><select id="f-type"><option value="Lead" ${contact && contact.type === 'Lead' ? 'selected' : ''}>Lead</option><option value="Customer" ${contact && contact.type === 'Customer' ? 'selected' : ''}>Customer</option><option value="Partner" ${contact && contact.type === 'Partner' ? 'selected' : ''}>Partner</option><option value="Vendor" ${contact && contact.type === 'Vendor' ? 'selected' : ''}>Vendor</option></select></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="ct-cancel">${t('cancel')}</button>
      <button class="btn btn-navy" id="ct-save">${isEdit ? t('update') : t('create')}</button>
    </div>`);
  overlay.querySelector('#ct-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ct-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ct-save').addEventListener('click', async () => {
    const firstName = overlay.querySelector('#f-fn').value.trim();
    if (!firstName) { toast(t('first_name') + ' *', 'error'); return; }
    const payload = {
      firstName,
      lastName: overlay.querySelector('#f-ln').value.trim() || undefined,
      email: overlay.querySelector('#f-email').value.trim() || undefined,
      company: overlay.querySelector('#f-co').value.trim() || undefined,
      jobTitle: overlay.querySelector('#f-job').value.trim() || undefined,
      phone: overlay.querySelector('#f-phone').value.trim() || undefined,
      type: overlay.querySelector('#f-type').value,
    };
    try {
      if (isEdit) { await api('/contacts/' + contact.id, { method: 'PATCH', body: JSON.stringify(payload) }); toast(t('contact_updated')); }
      else { await api('/contacts', { method: 'POST', body: JSON.stringify(payload) }); toast(t('contact_created')); }
      overlay.remove(); loadAll();
    } catch (e) { toast(t('save_failed'), 'error'); }
  });
}

/* ============ TEAMS ============ */
function renderTeams() {
  const teams = state.teams || [];
  return `
  <div class="toolbar"><div style="flex:1;"></div><button class="btn btn-coral" id="add-team">${icon('plus')}${t('add_team')}</button></div>
  ${teams.length === 0 ? `<div class="table-wrap"><div class="empty-state"><div class="empty-icon">🤝</div><p>${t('no_teams')}</p></div></div>` : `<div class="table-wrap"><table>
    <thead><tr><th>${t('team_name')}</th><th>${t('team_lead')}</th><th>${t('members')}</th><th>${t('actions')}</th></tr></thead>
    <tbody>${teams.map(tm => {
      const members = (state.users || []).filter(u => u.teamId === tm.id);
      const lead = (state.users || []).find(u => u.id === tm.leadId);
      return `<tr><td><span class="cell-title">${esc(tm.name)}</span></td><td>${esc(lead ? lead.name : '-')}</td><td>${members.length} ${t('members').toLowerCase()}</td>
      <td><button class="btn btn-danger btn-sm" data-team-delete="${tm.id}">${t('delete')}</button></td></tr>`;
    }).join('')}</tbody></table></div>`}`;
}

function bindTeams() {
  const addBtn = document.getElementById('add-team');
  if (addBtn) addBtn.addEventListener('click', () => teamModal());
  document.querySelectorAll('[data-team-delete]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-team-delete');
    if (!confirm(t('remove_user_confirm'))) return;
    try { await api('/teams/' + id, { method: 'DELETE' }); loadAll(); } catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

function teamModal() {
  const overlay = openModal(`
    <div class="modal-head"><h2>${t('add_team')}</h2><button class="modal-close" id="tm-close">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('team_name')} *</label><input type="text" id="f-tname" placeholder="${t('team_name')}" required></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" id="tm-cancel">${t('cancel')}</button><button class="btn btn-navy" id="tm-save">${t('create')}</button></div>`);
  overlay.querySelector('#tm-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#tm-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#tm-save').addEventListener('click', async () => {
    const name = overlay.querySelector('#f-tname').value.trim();
    if (!name) return;
    try { await api('/teams', { method: 'POST', body: JSON.stringify({ name, workspaceId: state.currentWorkspace.id }) }); toast(t('save_changes')); overlay.remove(); loadAll(); }
    catch (e) { toast(t('save_failed'), 'error'); }
  });
}

/* ============ USERS ============ */
function renderUsers() {
  const users = (state.users || []).filter(u => u.workspaceId === state.currentWorkspace.id);
  return `
  <div class="toolbar"><div style="flex:1;"></div><button class="btn btn-coral" id="invite-user">${icon('plus')}${t('invite_user')}</button></div>
  <div class="table-wrap"><table>
    <thead><tr><th>${t('name')}</th><th>${t('email_address')}</th><th>${t('role')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
    <tbody>${users.map(u => `<tr>
      <td><div style="display:flex;align-items:center;gap:9px;"><div class="user-avatar">${initials(u.name)}</div><span class="cell-title">${esc(u.name)}</span></div></td>
      <td>${esc(u.email)}</td><td>${esc(roleLabel(u.role))}</td>
      <td><span class="stage-pill ${u.status === 'ACTIVE' ? 'stage-won' : 'stage-lost'}">${esc(u.status)}</span></td>
      <td>${u.id !== state.user.id ? `<button class="btn btn-danger btn-sm" data-user-remove="${u.id}">${t('delete')}</button>` : `<span style="font-size:11px;color:var(--slate-400);">You</span>`}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function bindUsers() {
  const inviteBtn = document.getElementById('invite-user');
  if (inviteBtn) inviteBtn.addEventListener('click', () => inviteModal());
  document.querySelectorAll('[data-user-remove]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-user-remove');
    if (!confirm(t('remove_user_confirm'))) return;
    try { await api('/users/' + id, { method: 'DELETE' }); loadAll(); } catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

function inviteModal() {
  const teams = state.teams || [];
  const overlay = openModal(`
    <div class="modal-head"><h2>${t('invite_new_user')}</h2><button class="modal-close" id="iv-close">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('work_email')} *</label><input type="email" id="f-email" required></div>
      <div class="field"><label>${t('role')}</label><select id="f-role"><option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super Admin</option></select></div>
      <div class="field"><label>${t('team_optional')}</label><select id="f-team"><option value="">-</option>${teams.map(tm => `<option value="${tm.id}">${esc(tm.name)}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" id="iv-cancel">${t('cancel')}</button><button class="btn btn-navy" id="iv-send">${t('send_invite')}</button></div>`);
  overlay.querySelector('#iv-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#iv-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#iv-send').addEventListener('click', async () => {
    const email = overlay.querySelector('#f-email').value.trim();
    if (!email) return;
    const payload = { email, role: overlay.querySelector('#f-role').value, workspaceId: state.currentWorkspace.id };
    const teamId = overlay.querySelector('#f-team').value;
    if (teamId) payload.teamId = teamId;
    try { await api('/users/invite', { method: 'POST', body: JSON.stringify(payload) }); toast(t('invitation_sent')); overlay.remove(); loadAll(); }
    catch (e) { toast(t('save_failed'), 'error'); }
  });
}

/* ============ REMINDERS ============ */
function renderReminders() {
  const reminders = state.reminders || [];
  return `
  <div class="toolbar"><div style="flex:1;"></div><button class="btn btn-coral" id="add-reminder">${icon('plus')}${t('add_reminder')}</button></div>
  ${reminders.length === 0 ? `<div class="table-wrap"><div class="empty-state"><div class="empty-icon">⏰</div><p>${t('no_reminders')}</p></div></div>` : `<div class="table-wrap"><table>
    <thead><tr><th>${t('title')}</th><th>${t('due_date_time')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
    <tbody>${reminders.map(r => `<tr>
      <td><span class="cell-title">${esc(r.title)}</span></td>
      <td>${fmtDate(r.dueAt)}</td>
      <td><span class="stage-pill ${r.completed ? 'stage-won' : 'stage-closing'}">${r.completed ? t('mark_done') : t('mark_pending')}</span></td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" data-reminder-toggle="${r.id}">${r.completed ? t('mark_pending') : t('mark_done')}</button>
        <button class="btn btn-danger btn-sm" data-reminder-delete="${r.id}">${t('delete')}</button>
      </div></td>
    </tr>`).join('')}</tbody></table></div>`}`;
}

function bindReminders() {
  const addBtn = document.getElementById('add-reminder');
  if (addBtn) addBtn.addEventListener('click', () => reminderModal());
  document.querySelectorAll('[data-reminder-toggle]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-reminder-toggle');
    const r = state.reminders.find(x => x.id === id); if (!r) return;
    try { await api('/reminders/' + id, { method: 'PATCH', body: JSON.stringify({ completed: !r.completed }) }); loadAll(); }
    catch (e) { toast(t('save_failed'), 'error'); }
  }));
  document.querySelectorAll('[data-reminder-delete]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-reminder-delete');
    try { await api('/reminders/' + id, { method: 'DELETE' }); toast(t('reminder_deleted')); loadAll(); }
    catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

function reminderModal() {
  const overlay = openModal(`
    <div class="modal-head"><h2>${t('add_reminder')}</h2><button class="modal-close" id="rm-close">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('title')} *</label><input type="text" id="f-title" required></div>
      <div class="field"><label>${t('due_date_time')}</label><input type="datetime-local" id="f-due"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" id="rm-cancel">${t('cancel')}</button><button class="btn btn-navy" id="rm-save">${t('set_reminder')}</button></div>`);
  overlay.querySelector('#rm-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#rm-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#rm-save').addEventListener('click', async () => {
    const title = overlay.querySelector('#f-title').value.trim();
    const due = overlay.querySelector('#f-due').value;
    if (!title) return;
    try {
      await api('/reminders', { method: 'POST', body: JSON.stringify({ title, workspaceId: state.currentWorkspace.id, dueAt: due ? new Date(due).toISOString() : undefined }) });
      toast(t('reminder_set')); overlay.remove(); loadAll();
    } catch (e) { toast(t('save_failed'), 'error'); }
  });
}

/* ============ NOTIFICATIONS ============ */
function renderNotifications() {
  const notifs = state.notifications || [];
  return `
  <div class="toolbar"><div style="flex:1;"></div><button class="btn btn-ghost" id="notif-read-all">${t('mark_all_read')}</button></div>
  ${notifs.length === 0 ? `<div class="table-wrap"><div class="empty-state"><div class="empty-icon">🔔</div><p>${t('no_notifications')}</p></div></div>` : `<div style="display:flex;flex-direction:column;gap:10px;">${notifs.map(n => `<div style="display:flex;align-items:center;gap:12px;background:${n.read ? 'var(--white)' : 'var(--red-50)'};border:1px solid var(--slate-200);border-radius:12px;padding:14px 16px;">
      <div style="flex:1;"><div style="font-weight:600;color:var(--navy);font-size:14px;">${esc(n.title || '')}</div>${n.message ? `<div style="font-size:12.5px;color:var(--slate-500);margin-top:3px;">${esc(n.message)}</div>` : ''}<div style="font-size:11px;color:var(--slate-400);margin-top:4px;">${fmtDate(n.createdAt)}</div></div>
      <button class="btn btn-ghost btn-sm" data-notif-toggle="${n.id}">${n.read ? t('mark_unread') : t('mark_read')}</button>
    </div>`).join('')}</div>`}`;
}

function bindNotifications() {
  const ra = document.getElementById('notif-read-all');
  if (ra) ra.addEventListener('click', async () => {
    try { await api(`/notifications/read-all?workspaceId=${state.currentWorkspace.id}`, { method: 'POST' }); loadAll(); } catch (e) {}
  });
  document.querySelectorAll('[data-notif-toggle]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-notif-toggle');
    const n = state.notifications.find(x => x.id === id); if (!n) return;
    try { await api('/notifications/' + id, { method: 'PATCH', body: JSON.stringify({ read: !n.read }) }); loadAll(); }
    catch (e) {}
  }));
}

/* ============ SETTINGS ============ */
function renderSettings() {
  const ws = state.currentWorkspace;
  return `
  <div style="display:grid;grid-template-columns:1fr;gap:16px;max-width:640px;">
    <div class="panel">
      <h3>${t('workspace_details')}</h3>
      <div class="field"><label>${t('workspace_name_label')}</label><input type="text" id="s-wsname" value="${esc(ws.name)}" style="border:1px solid var(--slate-200);background:var(--white);color:var(--slate-700);width:100%;padding:10px 14px;border-radius:8px;"></div>
      <div class="kpi-inline"><span class="kpi-tag">${t('plan')}: <b>${esc(ws.plan)}</b></span><span class="kpi-tag">${t('type')}: <b>${esc(ws.type)}</b></span></div>
      <div style="margin-top:16px;display:flex;gap:10px;">
        <button class="btn btn-navy" id="s-save-ws">${t('save_changes')}</button>
      </div>
    </div>
    <div class="panel">
      <h3>${t('currency_settings')}</h3>
      <div class="field"><label>${t('default_currency')}</label>
        <select id="s-currency" style="border:1px solid var(--slate-200);background:var(--white);color:var(--slate-700);width:100%;padding:10px 14px;border-radius:8px;">
          ${['USD', 'KRW', 'JPY', 'EUR', 'GBP', 'INR', 'AED'].map(c => `<option value="${c}" ${ws.defaultCurrency === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-navy" id="s-save-currency">${t('save_changes')}</button>
    </div>
    <div class="panel" style="border-color:var(--red-200);">
      <h3 style="color:var(--red-500);">${t('danger_zone')}</h3>
      <button class="btn btn-danger" id="s-delete-ws">${t('delete_workspace')}</button>
    </div>
  </div>`;
}

function bindSettings() {
  const saveWs = document.getElementById('s-save-ws');
  if (saveWs) saveWs.addEventListener('click', async () => {
    const name = document.getElementById('s-wsname').value.trim();
    try { await api('/workspaces/' + state.currentWorkspace.id, { method: 'PATCH', body: JSON.stringify({ name }) }); state.currentWorkspace.name = name; toast(t('workspace_updated')); render(); }
    catch (e) { toast(t('save_failed'), 'error'); }
  });
  const saveCur = document.getElementById('s-save-currency');
  if (saveCur) saveCur.addEventListener('click', async () => {
    const defaultCurrency = document.getElementById('s-currency').value;
    try { await api('/workspaces/' + state.currentWorkspace.id, { method: 'PATCH', body: JSON.stringify({ defaultCurrency }) }); state.currentWorkspace.defaultCurrency = defaultCurrency; toast(t('workspace_updated')); }
    catch (e) { toast(t('save_failed'), 'error'); }
  });
  const delWs = document.getElementById('s-delete-ws');
  if (delWs) delWs.addEventListener('click', async () => {
    if (!confirm(t('delete_workspace') + '?')) return;
    try { await api('/workspaces/' + state.currentWorkspace.id, { method: 'DELETE' }); state.currentWorkspace = null; loadWorkspaces().then(() => render()); }
    catch (e) { toast(t('delete_failed'), 'error'); }
  });
}

/* ============ WEBHOOKS & API KEYS ============ */
function renderWebhooks() {
  const endpoints = state.endpoints || [];
  const keys = state.apiKeys || [];
  return `
  <div class="toolbar"><div style="flex:1;"></div><button class="btn btn-coral" id="add-endpoint">${icon('plus')}${t('add_endpoint')}</button></div>
  <div class="panel" style="margin-bottom:16px;">
    <h3>${t('webhooks')}</h3>
    ${endpoints.length === 0 ? `<div class="empty-state"><p>${t('no_endpoints')}</p></div>` : `<div style="display:flex;flex-direction:column;gap:8px;">${endpoints.map(e => `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--slate-100);border-radius:8px;">
      <div style="flex:1;"><div style="font-weight:600;color:var(--navy);font-size:13px;">${esc(e.name || e.url)}</div><div class="mono" style="font-size:11px;color:var(--slate-400);">${esc(e.url)}</div></div>
      <button class="btn btn-danger btn-sm" data-endpoint-delete="${e.id}">${t('delete')}</button>
    </div>`).join('')}</div>`}
  </div>
  <div class="panel">
    <h3>${t('api_keys')}</h3>
    <div class="toolbar" style="margin-bottom:8px;"><button class="btn btn-navy btn-sm" id="add-key">${icon('plus')}${t('generate_key')}</button></div>
    ${keys.length === 0 ? `<div class="empty-state"><p>${t('no_keys')}</p></div>` : `<div style="display:flex;flex-direction:column;gap:8px;">${keys.map(k => `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--slate-100);border-radius:8px;">
      <div style="flex:1;"><div style="font-weight:600;color:var(--navy);font-size:13px;">${esc(k.name)}</div><div class="mono" style="font-size:11px;color:var(--slate-400);">${esc(k.keyPrefix || k.key || '')}••••</div></div>
      <button class="btn btn-danger btn-sm" data-key-revoke="${k.id}">${t('revoke')}</button>
    </div>`).join('')}</div>`}
  </div>`;
}

function bindWebhooks() {
  const ae = document.getElementById('add-endpoint');
  if (ae) ae.addEventListener('click', () => endpointModal());
  const ak = document.getElementById('add-key');
  if (ak) ak.addEventListener('click', () => keyModal());
  document.querySelectorAll('[data-endpoint-delete]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-endpoint-delete');
    try { await api('/webhooks/' + id, { method: 'DELETE' }); toast(t('endpoint_deleted')); loadAll(); }
    catch (e) { toast(t('delete_failed'), 'error'); }
  }));
  document.querySelectorAll('[data-key-revoke]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-key-revoke');
    try { await api('/api-keys/' + id, { method: 'DELETE' }); toast(t('key_revoked')); loadAll(); }
    catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

function endpointModal() {
  const overlay = openModal(`
    <div class="modal-head"><h2>${t('add_endpoint')}</h2><button class="modal-close" id="ep-close">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('endpoint_url')} *</label><input type="url" id="f-url" required></div>
      <div class="field"><label>${t('events')}</label><input type="text" id="f-events" placeholder="deal.created, deal.updated"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" id="ep-cancel">${t('cancel')}</button><button class="btn btn-navy" id="ep-save">${t('save_endpoint')}</button></div>`);
  overlay.querySelector('#ep-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ep-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ep-save').addEventListener('click', async () => {
    const url = overlay.querySelector('#f-url').value.trim();
    if (!url) return;
    try { await api('/webhooks', { method: 'POST', body: JSON.stringify({ url, events: overlay.querySelector('#f-events').value.split(',').map(s => s.trim()).filter(Boolean) }) }); toast(t('endpoint_created')); overlay.remove(); loadAll(); }
    catch (e) { toast(t('save_failed'), 'error'); }
  });
}

function keyModal() {
  const overlay = openModal(`
    <div class="modal-head"><h2>${t('generate_key')}</h2><button class="modal-close" id="k-close">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('key_name')} *</label><input type="text" id="f-kname" required placeholder="${t('key_name')}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" id="k-cancel">${t('cancel')}</button><button class="btn btn-navy" id="k-save">${t('generate_key')}</button></div>`);
  overlay.querySelector('#k-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#k-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#k-save').addEventListener('click', async () => {
    const name = overlay.querySelector('#f-kname').value.trim();
    if (!name) return;
    try {
      const res = await api('/api-keys', { method: 'POST', body: JSON.stringify({ name }) });
      overlay.remove();
      if (res && res.key) { alert(res.key); }
      toast(t('key_created')); loadAll();
    } catch (e) { toast(t('save_failed'), 'error'); }
  });
}

/* ============ AUDIT LOG ============ */
async function renderAudit() {
  let logs = state.auditLogs || [];
  if (!logs.length) {
    try { const d = await api(`/audit?workspaceId=${state.currentWorkspace.id}`); logs = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : (Array.isArray(d?.items) ? d.items : (Array.isArray(d?.logs) ? d.logs : []))); state.auditLogs = logs; }
    catch (e) { logs = []; }
  }
  return `<div class="table-wrap"><table>
    <thead><tr><th>${t('action')}</th><th>${t('performed_by')}</th><th>${t('at')}</th></tr></thead>
    <tbody>${logs.length === 0 ? `<tr><td colspan="3"><div class="empty-state"><p>${t('no_audit')}</p></div></td></tr>` : logs.map(l => `<tr>
      <td><span class="cell-title">${esc(l.action || l.type || '')}</span>${l.entity ? `<div style="font-size:11px;color:var(--slate-400);">${esc(l.entity)} ${l.entityId ? '#' + esc(l.entityId) : ''}</div>` : ''}</td>
      <td>${esc(l.userName || l.userId || '-')}</td><td>${fmtDate(l.createdAt || l.timestamp)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function bindAudit() {}

/* ============ TRASH ============ */
async function renderTrash() {
  const wsId = state.currentWorkspace.id;
  let deals = []; let contacts = [];
  try { const d = await api(`/deals/trash?workspaceId=${wsId}`); deals = Array.isArray(d) ? d : (d?.data || d?.items || []); } catch (e) { deals = []; }
  try { const c = await api(`/contacts/trash?workspaceId=${wsId}`); contacts = Array.isArray(c) ? c : (c?.data || c?.items || []); } catch (e) { contacts = []; }
  const nothing = deals.length === 0 && contacts.length === 0;
  return `
  ${nothing ? `<div class="table-wrap"><div class="empty-state"><div class="empty-icon">🗑️</div><p>${t('no_trash')}</p></div></div>` : `
  <div class="table-wrap" style="margin-bottom:16px;"><h3 style="padding:14px 16px;border-bottom:1px solid var(--slate-100);color:var(--navy);font-size:14px;">${t('deals')}</h3><table>
    <thead><tr><th>${t('deal_name')}</th><th>${t('value')}</th><th>${t('deleted')}</th><th>${t('actions')}</th></tr></thead>
    <tbody>${deals.map(d => `<tr><td><span class="cell-title">${esc(d.title)}</span></td><td class="mono">${money(d.value, d.currency)}</td><td>${fmtDate(d.deletedAt)}</td>
      <td><button class="btn btn-navy btn-sm" data-restore-deal="${d.id}">${t('restore')}</button></td></tr>`).join('')}</tbody>
  </table></div>
  <div class="table-wrap"><h3 style="padding:14px 16px;border-bottom:1px solid var(--slate-100);color:var(--navy);font-size:14px;">${t('contacts')}</h3><table>
    <thead><tr><th>${t('name')}</th><th>${t('email_address')}</th><th>${t('deleted')}</th><th>${t('actions')}</th></tr></thead>
    <tbody>${contacts.map(c => `<tr><td><span class="cell-title">${esc((c.firstName || '') + ' ' + (c.lastName || ''))}</span></td><td>${esc(c.email || '')}</td><td>${fmtDate(c.deletedAt)}</td>
      <td><button class="btn btn-navy btn-sm" data-restore-contact="${c.id}">${t('restore')}</button></td></tr>`).join('')}</tbody>
  </table></div>`}`;
}

function bindTrash() {
  document.querySelectorAll('[data-restore-deal]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-restore-deal');
    try { await api(`/deals/${id}/restore`, { method: 'POST' }); toast(t('restore_deal')); render(); } catch (e) { toast(t('delete_failed'), 'error'); }
  }));
  document.querySelectorAll('[data-restore-contact]').forEach(b => b.addEventListener('click', async () => {
    const id = b.getAttribute('data-restore-contact');
    try { await api(`/contacts/${id}/restore`, { method: 'POST' }); toast(t('restore_contact')); render(); } catch (e) { toast(t('delete_failed'), 'error'); }
  }));
}

/* ============ boot ============ */
async function boot() {
  document.documentElement.lang = state.lang;
  if (state.token && state.user) {
    try { await loadWorkspaces(); }
    catch (e) {}
    const ws = state.workspaces.find(w => w.id === state.user.workspaceId) || state.workspaces[0] || null;
    state.currentWorkspace = ws;
    if (ws) loadAll();
  }
  render();
}

boot();
