// "Is the backend awake?" indicator shown on the sign-in page.
// The free Render tier sleeps when idle; pinging early starts waking it while
// the user types their credentials.

import { api } from './api.js';
import { h } from './ui.js';

// POST /tokens/verify needs no auth and always answers 200 — ideal as a ping.
export async function pingServer() {
  const r = await api('POST', '/tokens/verify', { body: { token: '' }, auth: false, timeout: 70000 });
  return r.status === 200;
}

export function serverStatus() {
  const dot = h('span', { class: 'dot checking', 'aria-hidden': 'true' });
  const text = h('span', null, 'กำลังเชื่อมต่อระบบ…');
  const el = h('span', { class: 'server-status', role: 'status' }, dot, text);
  const run = async () => {
    dot.className = 'dot checking';
    text.textContent = 'กำลังเชื่อมต่อระบบ…';
    const ok = await pingServer();
    dot.className = `dot ${ok ? 'ok' : 'down'}`;
    text.textContent = ok ? 'ระบบพร้อมใช้งาน' : 'ขณะนี้ติดต่อระบบไม่ได้ ลองใหม่ภายหลัง';
  };
  run();
  return { el, refresh: run };
}
