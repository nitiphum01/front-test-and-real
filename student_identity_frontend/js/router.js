// Hash router + app shell (sidebar, header, session countdown).
// Pages register themselves with: register('/path', { title, icon, roles, render }).

import { h, icon, clear, loading, emptyState, roleBadge, ROLE_LABEL, toast } from './ui.js';
import { getSession, secondsLeft, clearSession, setFlash } from './session.js';
import { api } from './api.js';

const routes = new Map();
let loginRenderer = null;
let renderSeq = 0;
let ticker = null;

export function register(path, def) { routes.set(path, def); }
export function registerLogin(fn) { loginRenderer = fn; }
export function go(path) {
  if (location.hash === `#${path}`) render();
  else location.hash = `#${path}`;
}

export function homeFor(role) {
  const first = [...routes.entries()].find(([, r]) => r.nav !== false && r.roles.includes(role));
  return first ? first[0] : '/tools';
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}

async function render() {
  const seq = ++renderSeq;
  const path = location.hash.replace(/^#/, '') || '/';
  const session = getSession();
  const root = document.getElementById('root');

  if (!session) {
    stopTicker();
    if (path !== '/login') { location.replace('#/login'); return; }
    document.title = 'เข้าสู่ระบบ · Student Identity';
    clear(root);
    loginRenderer(root);
    return;
  }
  if (path === '/login' || path === '/') { location.replace(`#${homeFor(session.role)}`); return; }

  const route = routes.get(path);
  const view = mountShell(root, session, path);

  if (!route) {
    clear(view, emptyState('ไม่พบหน้านี้', 'ลิงก์อาจไม่ถูกต้อง', h('a', { class: 'btn', href: `#${homeFor(session.role)}` }, 'กลับหน้าแรก')));
    return;
  }
  if (!route.roles.includes(session.role)) {
    clear(view, emptyState('ไม่มีสิทธิ์เข้าถึงหน้านี้', `หน้านี้สำหรับ ${route.roles.map((r) => ROLE_LABEL[r]).join(', ')}`, h('a', { class: 'btn', href: `#${homeFor(session.role)}` }, 'กลับหน้าแรก')));
    return;
  }

  document.title = `${route.title} · Student Identity`;
  clear(view, loading());
  try {
    // isCurrent() lets a slow page skip drawing if the user already navigated away.
    await route.render(view, session, { isCurrent: () => seq === renderSeq });
  } catch (err) {
    console.error(err);
    if (seq === renderSeq) clear(view, emptyState('หน้านี้แสดงผลไม่ได้', String(err && err.message || err)));
  }
}

let shell = null;

function mountShell(root, session, path) {
  if (!shell || shell.sessionToken !== session.token || !root.contains(shell.el)) {
    shell = buildShell(session);
    clear(root, shell.el);
    startTicker();
  }
  shell.nav.querySelectorAll('a').forEach((a) => {
    const active = a.getAttribute('href') === `#${path}`;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const route = routes.get(path);
  shell.crumb.textContent = route ? route.title : 'ไม่พบหน้า';
  shell.view.scrollTop = 0;
  window.scrollTo(0, 0);
  return shell.view;
}

function buildShell(session) {
  const navItems = [...routes.entries()]
    .filter(([, r]) => r.nav !== false && r.roles.includes(session.role))
    .map(([p, r]) => h('a', { href: `#${p}` }, icon(r.icon), h('span', null, r.title)));

  const nav = h('nav', { class: 'nav', 'aria-label': 'เมนูหลัก' },
    h('span', { class: 'nav-label' }, 'เมนู'), navItems);
  const ttl = h('span', { class: 'ttl', title: 'เวลาที่เหลือก่อนต้องเข้าสู่ระบบใหม่' });
  const crumb = h('span', { class: 'crumb-current' });
  const view = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  const initials = String(session.sub).replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'SI';

  const el = h('div', { class: 'shell' },
    h('aside', { class: 'sidebar' },
      h('a', { class: 'brand', href: `#${homeFor(session.role)}` },
        h('span', { class: 'brand-mark' }, icon('fingerprint')),
        h('span', { class: 'brand-text' }, h('b', null, 'Student Identity'), h('small', null, 'Digital Campus'))),
      nav,
      h('div', { class: 'nav-user' },
        h('span', { class: 'user-avatar', 'aria-hidden': 'true' }, initials),
        h('span', { class: 'user-text' }, h('b', null, session.sub), h('small', null, ROLE_LABEL[session.role] || session.role)),
        h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'ออกจากระบบ', title: 'ออกจากระบบ', onclick: () => signOut() }, icon('logout')),
      ),
    ),
    h('div', { class: 'main' },
      h('header', { class: 'topbar' },
        h('nav', { class: 'crumbs', 'aria-label': 'ตำแหน่งปัจจุบัน' },
          h('span', { class: 'hide-sm' }, 'Student Identity'), h('span', { class: 'crumb-sep hide-sm', 'aria-hidden': 'true' }, icon('chevron-right')), crumb),
        h('div', { class: 'topbar-right' }, roleBadge(session.role), ttl),
      ),
      view,
    ),
  );
  return { el, nav, view, ttl, crumb, sessionToken: session.token };
}

function startTicker() {
  stopTicker();
  const tick = () => {
    const left = secondsLeft();
    if (left <= 0) {
      clearSession();
      setFlash('เซสชันหมดอายุแล้ว (token มีอายุ 15 นาที) กรุณาเข้าสู่ระบบอีกครั้ง');
      go('/login');
      return;
    }
    const m = Math.floor(left / 60), s = String(left % 60).padStart(2, '0');
    shell.ttl.replaceChildren(icon('clock'), ` ${m}:${s}`);
    shell.ttl.classList.toggle('warn', left <= 120);
    if (left === 120) toast('เซสชันจะหมดอายุใน 2 นาที บันทึกงานที่ค้างไว้', 'error');
  };
  tick();
  ticker = setInterval(tick, 1000);
}

function stopTicker() { if (ticker) clearInterval(ticker); ticker = null; }

export async function signOut() {
  const s = getSession();
  // The backend only records the sign-out in its audit log; the token itself
  // stays valid until it expires, so the UI always forgets it locally too.
  if (s) api('DELETE', `/sessions/${encodeURIComponent(s.sub)}`);
  clearSession();
  shell = null;
  go('/login');
}
