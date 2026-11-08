// Backend address picker + a cheap "is the server awake?" probe.

import { apiBase, setApiBase, PRESET_SERVERS } from '../config.js';
import { api } from './api.js';
import { h, icon, field, openDialog, toast } from './ui.js';

// POST /tokens/verify needs no auth and always answers 200 — ideal as a ping.
export async function pingServer() {
  const r = await api('POST', '/tokens/verify', { body: { token: '' }, auth: false, timeout: 70000 });
  return r.status === 200;
}

export function serverStatus() {
  const dot = h('span', { class: 'dot checking', 'aria-hidden': 'true' });
  const text = h('span', null, 'กำลังตรวจสอบเซิร์ฟเวอร์…');
  const el = h('span', { class: 'server-status' }, dot, text);
  const run = async () => {
    dot.className = 'dot checking';
    text.textContent = 'กำลังตรวจสอบเซิร์ฟเวอร์…';
    const ok = await pingServer();
    dot.className = `dot ${ok ? 'ok' : 'down'}`;
    text.textContent = ok ? 'เซิร์ฟเวอร์พร้อมใช้งาน' : 'ติดต่อเซิร์ฟเวอร์ไม่ได้';
  };
  run();
  return { el, refresh: run };
}

export function openServerDialog(onChange) {
  const input = h('input', { name: 'url', type: 'url', required: true, placeholder: 'https://student-identity.onrender.com' });
  input.value = apiBase();
  const presets = h('div', { class: 'chip-row' }, PRESET_SERVERS.map((p) =>
    h('button', { class: 'chip', type: 'button', onclick: () => { input.value = p.url; } }, p.label)));
  const save = h('button', { class: 'btn primary', type: 'submit', form: 'serverForm' }, 'บันทึก');
  const form = h('form', { id: 'serverForm', class: 'stack' },
    h('p', { class: 'muted' }, 'ที่อยู่ของ backend Student Identity ที่หน้าเว็บนี้จะเรียกใช้ ค่าจะถูกจำไว้ในเบราว์เซอร์นี้เท่านั้น'),
    presets,
    field('ที่อยู่เซิร์ฟเวอร์', input),
  );
  const { close } = openDialog('ตั้งค่าเซิร์ฟเวอร์', form, { actions: [save] });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let url;
    try { url = new URL(input.value.trim()); } catch (err) {
      form.querySelector('.field-error').textContent = 'กรอก URL ให้ถูกต้อง เช่น http://localhost:3000';
      return;
    }
    setApiBase(url.origin);
    toast(`เปลี่ยนเซิร์ฟเวอร์เป็น ${url.origin}`);
    close();
    if (onChange) onChange();
  });
}

export function serverLine(onChange) {
  return h('button', { class: 'link-btn', type: 'button', onclick: () => openServerDialog(onChange) },
    icon('server'), ` ${apiBase()}`);
}
