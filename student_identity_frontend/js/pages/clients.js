// Service clients (other teams' backends) — staff only.
// API: POST /service-clients (Idempotency-Key), GET /service-clients/:id/key,
//      POST /service-clients/:id/keys, and GET /dev/service-clients for the list when the backend
//      offers it (it has no production list endpoint).

import { api, errorText } from '../api.js';
import { apiBase } from '../../config.js';
import {
  h, icon, clear, card, pageHeader, emptyState, errorState, notice, badge, field,
  busy, toast, openDialog, confirmDialog, copyText, formatDate,
} from '../ui.js';

// Clients created in this browser, used when /dev/service-clients is unavailable.
const LOCAL_KEY = () => `si.clients:${apiBase()}`;
function localClients() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY())) || []; } catch (e) { return []; } }
function rememberClient(rec) {
  try {
    const list = localClients().filter((c) => c.id !== rec.id);
    list.push({ id: rec.id, name: rec.name, created_at: rec.created_at, key_prefix: rec.key_prefix, canCopy: rec.canCopy, hasApiKey: rec.hasApiKey });
    localStorage.setItem(LOCAL_KEY(), JSON.stringify(list));
  } catch (e) { /* ignore */ }
}

export async function renderClients(view, session, ctx) {
  const r = await api('GET', '/dev/service-clients');
  if (!ctx.isCurrent()) return;
  const reload = () => renderClients(view, session, ctx);

  let records;
  let fromServer = true;
  if (r.ok) records = r.data.records || [];
  else if (r.status === 404) { records = localClients(); fromServer = false; }
  else return clear(view, errorState(errorText(r, 'โหลดรายการไม่สำเร็จ'), reload));

  records = [...records].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  clear(view,
    pageHeader('Service clients', 'ลงทะเบียนระบบของทีมอื่น (เช่น ระบบฝึกงาน) และออก API key ให้เรียกดูข้อมูลนักศึกษา'),
    fromServer ? null : notice('warn', 'เซิร์ฟเวอร์นี้ไม่เปิดให้ดูรายการทั้งหมด (รันแบบ production) จึงแสดงเฉพาะรายการที่สร้างจากเบราว์เซอร์นี้'),
    h('div', { class: 'grid-2 top clients-grid' },
      card(
        h('div', { class: 'card-head' }, h('h2', null, 'รายการ'), h('span', { class: 'muted small' }, `${records.length} รายการ`)),
        records.length
          ? h('div', { class: 'client-list' }, records.map((c) => clientRow(c, reload)))
          : emptyState('ยังไม่มี service client', 'ลงทะเบียนระบบแรกจากฟอร์มด้านข้าง'),
      ),
      h('div', { class: 'stack' }, createCard(reload), howToCard()),
    ),
  );
}

function clientRow(c, reload) {
  const copyBtn = h('button', { class: 'btn sm', type: 'button' }, icon('copy'), 'คัดลอก key');
  const rotateBtn = h('button', { class: 'btn sm ghost', type: 'button' }, icon('refresh'), 'ออก key ใหม่');

  copyBtn.addEventListener('click', () => busy(copyBtn, async () => {
    const r = await api('GET', `/service-clients/${encodeURIComponent(c.id)}/key`);
    if (r.ok && r.data.apiKey) {
      (await copyText(r.data.apiKey)) ? toast(`คัดลอก API key ของ ${c.name} แล้ว`) : showKey(c.name, r.data.apiKey, false);
    } else if (r.status === 409) {
      toast('key นี้สร้างก่อนระบบรองรับการคัดลอก กด "ออก key ใหม่" หนึ่งครั้ง', 'error');
    } else toast(errorText(r, 'คัดลอกไม่สำเร็จ'), 'error');
  }));

  rotateBtn.addEventListener('click', async () => {
    const ok = await confirmDialog('ออก API key ใหม่', `key เดิมของ ${c.name} จะใช้ไม่ได้ทันที ทีมที่ใช้ key เดิมต้องเปลี่ยนเป็น key ใหม่`, { confirmText: 'ออก key ใหม่', danger: true });
    if (!ok) return;
    busy(rotateBtn, async () => {
      const r = await api('POST', `/service-clients/${encodeURIComponent(c.id)}/keys`);
      if (r.ok && r.data.apiKey) { rememberClient(r.data); showKey(c.name, r.data.apiKey, true, reload); }
      else toast(errorText(r, 'ออก key ใหม่ไม่สำเร็จ'), 'error');
    });
  });

  return h('div', { class: 'client' },
    h('div', { class: 'client-main' },
      h('span', { class: 'avatar' }, icon('plug')),
      h('div', null,
        h('b', null, c.name),
        h('div', { class: 'muted small' },
          c.key_prefix ? h('span', { class: 'mono' }, `${c.key_prefix}…`) : 'ยังไม่มี key',
          ' · ', formatDate(c.created_at)),
      ),
    ),
    h('div', { class: 'row-gap wrap' },
      (c.scopes || ['profile:read']).map((s) => badge(s, 'mono')),
      c.hasApiKey === false ? null : copyBtn,
      rotateBtn,
    ),
  );
}

function createCard(reload) {
  const name = h('input', { name: 'name', placeholder: 'internship-service', required: true, maxlength: '80', autocomplete: 'off', pattern: '[a-z0-9][a-z0-9-]*' });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, icon('plus'), 'ลงทะเบียน');
  const err = h('div', { class: 'form-error', role: 'alert' });
  const form = h('form', { class: 'stack', novalidate: true },
    field('ชื่อบริการ', name, 'ใช้ตัวพิมพ์เล็ก ตัวเลข และ - เช่น internship-service ชื่อนี้คือสิ่งที่นักศึกษาเห็นในหน้าความเป็นส่วนตัว'),
    err, btn);

  // One Idempotency-Key per intended creation: a double click or a retry after a
  // timeout replays the same request instead of creating a second client.
  let pendingKey = null;
  let pendingName = null;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.textContent = '';
    const v = name.value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(v)) { err.textContent = 'ชื่อต้องมี 2 ตัวขึ้นไป ใช้ a-z, 0-9 และ - เท่านั้น'; name.focus(); return; }
    if (pendingName !== v) { pendingKey = crypto.randomUUID(); pendingName = v; }
    busy(btn, async () => {
      const r = await api('POST', '/service-clients', { body: { name: v }, headers: { 'Idempotency-Key': pendingKey } });
      if (!r.ok) { err.textContent = errorText(r, 'ลงทะเบียนไม่สำเร็จ'); return; }
      pendingKey = null; pendingName = null;
      rememberClient(r.data);
      name.value = '';
      if (r.data.apiKey) showKey(v, r.data.apiKey, true, reload);
      else { toast('รายการนี้ถูกสร้างไว้แล้ว'); reload(); }
    });
  });
  return card(h('h2', null, 'ลงทะเบียนบริการใหม่'), form);
}

function showKey(name, apiKey, isNew, onClose) {
  const keyBox = h('code', { class: 'key-box' }, apiKey);
  const copy = h('button', { class: 'btn primary', type: 'button' }, icon('copy'), 'คัดลอก');
  copy.addEventListener('click', async () => {
    toast((await copyText(apiKey)) ? 'คัดลอกแล้ว' : 'คัดลอกไม่สำเร็จ เลือกข้อความแล้วคัดลอกเอง', 'success');
  });
  openDialog(isNew ? `API key ของ ${name}` : `API key ของ ${name}`, h('div', { class: 'stack' },
    notice('warn', 'ส่ง key นี้ให้ทีมเจ้าของบริการผ่านช่องทางที่ปลอดภัย ห้ามใส่ในโค้ดฝั่งหน้าเว็บหรือ commit ขึ้น Git'),
    keyBox,
  ), { actions: [copy], onClose, wide: true });
}

function howToCard() {
  return card(
    h('h2', null, 'ทีมอื่นใช้ key อย่างไร'),
    h('p', { class: 'muted small' }, 'backend ของทีมนั้นส่ง key มากับทุกคำขอ และจะได้ข้อมูลเฉพาะนักศึกษาที่อนุญาตบริการนั้นแล้ว'),
    h('pre', { class: 'code' }, `GET ${apiBase()}/students/{studentId}/claims\nX-API-Key: sik_…`),
    h('p', { class: 'muted small' }, 'ผลลัพธ์: 200 = นักศึกษาอนุญาตแล้ว · 403 = ยังไม่อนุญาต · 404 = ไม่พบนักศึกษา · 401 = key ผิด'),
    h('a', { class: 'btn sm', href: '#/tools' }, icon('plug-connected'), 'ทดสอบในหน้าทดสอบการเชื่อมต่อ'),
  );
}
