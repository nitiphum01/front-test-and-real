// Integration tester for staff and service accounts.
// API: POST /tokens/verify, GET /students/:id/claims, dev-only POST /dev/break-ai | /dev/fix-ai

import { api, errorText } from '../api.js';
import { apiBase } from '../../config.js';
import { h, icon, clear, card, pageHeader, notice, badge, roleBadge, field, busy, jsonBlock, formatDate } from '../ui.js';
import { openServerDialog } from '../server.js';

export async function renderTools(view, session) {
  clear(view,
    pageHeader('ทดสอบการเชื่อมต่อ', 'ตรวจ token และลองเรียกข้อมูลนักศึกษาแบบที่ระบบของทีมอื่นเรียกจริง'),
    h('div', { class: 'grid-2 top' },
      claimsCard(session),
      h('div', { class: 'stack' }, verifyCard(session), serverCard(), session.role === 'staff' ? aiCard() : null),
    ),
  );
}

function claimsCard(session) {
  const sid = h('input', { name: 'studentId', inputmode: 'numeric', placeholder: '6731503032', required: true });
  const useKey = session.role !== 'service';
  const keyInput = h('input', { name: 'apiKey', placeholder: 'sik_…', autocomplete: 'off', spellcheck: 'false' });
  const modeToken = h('input', { type: 'radio', name: 'cred', value: 'token', checked: !useKey });
  const modeKey = h('input', { type: 'radio', name: 'cred', value: 'key', checked: useKey });
  const keyField = field('API key ของบริการ', keyInput, 'คัดลอกได้จากหน้า Service clients');
  const syncMode = () => { keyField.hidden = !modeKey.checked; };
  modeToken.addEventListener('change', syncMode);
  modeKey.addEventListener('change', syncMode);

  const btn = h('button', { class: 'btn primary', type: 'submit' }, icon('player-play'), 'เรียกข้อมูล');
  const out = h('div', { class: 'result' });
  const form = h('form', { class: 'stack', novalidate: true },
    field('รหัสนักศึกษา', sid),
    h('fieldset', { class: 'radio-group' },
      h('legend', null, 'ยืนยันตัวตนด้วย'),
      h('label', null, modeKey, ' API key (แบบที่ backend ทีมอื่นใช้)'),
      h('label', null, modeToken, ` token ที่ใช้อยู่ (${session.sub})`),
    ),
    keyField, btn, out);
  syncMode();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = sid.value.trim();
    if (!id) { clear(out, notice('warn', 'กรอกรหัสนักศึกษา')); sid.focus(); return; }
    const opts = {};
    if (modeKey.checked) {
      const k = keyInput.value.trim();
      if (!k.startsWith('sik_')) { clear(out, notice('warn', 'API key ต้องขึ้นต้นด้วย sik_')); keyInput.focus(); return; }
      // Browsers may only send headers the backend's CORS allows; X-API-Key isn't one,
      // so the key goes in Authorization, which the backend also accepts.
      opts.headers = { Authorization: `Bearer ${k}` };
    }
    busy(btn, async () => {
      const r = await api('GET', `/students/${encodeURIComponent(id)}/claims`, opts);
      clear(out, explainClaims(r), r.data ? jsonBlock(r.data) : null);
    });
  });

  return card(
    h('h2', null, 'ทดสอบเรียกข้อมูลนักศึกษา (claims)'),
    h('p', { class: 'muted small' }, 'GET /students/{id}/claims ต้องมีสิทธิ์ profile:read และนักศึกษาต้องอนุญาตบริการนั้นแล้ว'),
    form,
  );
}

function explainClaims(r) {
  const label = h('span', { class: 'mono' }, r.status ? `HTTP ${r.status}` : 'เชื่อมต่อไม่ได้');
  if (r.status === 200) {
    const c = r.data.claims;
    return notice('success', label, ' นักศึกษาอนุญาตแล้ว ', h('b', null, `${c.name.first} ${c.name.last}`),
      ` · โปรไฟล์${c.profileComplete ? 'ครบ' : 'ยังไม่ครบ'}`);
  }
  if (r.status === 403) {
    const raw = r.data && r.data.error;
    const why = raw && raw.startsWith('Missing required scope')
      ? 'ผู้เรียกไม่มีสิทธิ์ profile:read (บัญชีคนทั่วไปเรียก claims ไม่ได้ ต้องใช้ API key หรือ token ของ service)'
      : raw === 'Insufficient role' ? 'บัญชีนี้ไม่มีสิทธิ์' : 'นักศึกษายังไม่ได้อนุญาตบริการนี้ในหน้าความเป็นส่วนตัว';
    return notice('warn', label, ` ${why}`);
  }
  if (r.status === 404) return notice('warn', label, ' ไม่พบนักศึกษารหัสนี้');
  if (r.status === 401) return notice('danger', label, ' API key หรือ token ไม่ถูกต้อง');
  return notice('danger', label, ` ${errorText(r)}`);
}

function verifyCard(session) {
  const ta = h('textarea', { name: 'token', rows: '4', spellcheck: 'false', class: 'mono small' });
  ta.value = session.token;
  const btn = h('button', { class: 'btn', type: 'submit' }, icon('shield-check'), 'ตรวจ token');
  const out = h('div', { class: 'result' });
  const form = h('form', { class: 'stack' }, field('Token (JWT)', ta, 'ค่าเริ่มต้นคือ token ของคุณเอง'), btn, out);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(btn, async () => {
      const r = await api('POST', '/tokens/verify', { body: { token: ta.value.trim() }, auth: false });
      if (!r.ok) return clear(out, notice('danger', errorText(r)));
      const d = r.data;
      clear(out, d.valid
        ? h('dl', { class: 'kv' },
          h('dt', null, 'สถานะ'), h('dd', null, badge('ใช้ได้', 'success')),
          h('dt', null, 'Subject'), h('dd', { class: 'mono' }, d.sub),
          h('dt', null, 'Role'), h('dd', null, roleBadge(d.role)),
          h('dt', null, 'Scopes'), h('dd', { class: 'mono' }, d.scopes.length ? d.scopes.join(', ') : '—'),
          h('dt', null, 'หมดอายุ'), h('dd', null, formatDate(d.expiresAt)))
        : notice('danger', 'Token ไม่ถูกต้อง หมดอายุ หรือถูกแก้ไข'));
    });
  });
  return card(h('h2', null, 'ตรวจ token'), h('p', { class: 'muted small' }, 'POST /tokens/verify แบบเดียวกับที่ทีมอื่นใช้ตรวจผู้ใช้'), form);
}

function serverCard() {
  return card(
    h('h2', null, 'เซิร์ฟเวอร์'),
    h('p', { class: 'mono small' }, apiBase()),
    h('button', { class: 'btn sm', type: 'button', onclick: () => openServerDialog(() => location.reload()) }, icon('server'), 'เปลี่ยนเซิร์ฟเวอร์'),
  );
}

function aiCard() {
  const out = h('div', { class: 'result' });
  const run = (path, btn, okText) => busy(btn, async () => {
    const r = await api('POST', path, { auth: false });
    clear(out, r.ok ? notice('success', `${okText} · ${formatDate(r.data.timestamp)}`)
      : notice('danger', r.status === 404 ? 'ใช้ไม่ได้ เพราะเซิร์ฟเวอร์รันแบบ production' : errorText(r)));
  });
  const breakBtn = h('button', { class: 'btn sm', type: 'button' }, icon('plug-x'), 'จำลอง AI ล่ม');
  const fixBtn = h('button', { class: 'btn sm', type: 'button' }, icon('plug-connected'), 'ให้ AI กลับมา');
  breakBtn.addEventListener('click', () => run('/dev/break-ai', breakBtn, 'AI ถูกปิดชั่วคราว นักศึกษาจะเห็นรายการตรวจสอบแทน'));
  fixBtn.addEventListener('click', () => run('/dev/fix-ai', fixBtn, 'AI กลับมาทำงานแล้ว'));
  return card(
    h('h2', null, 'ทดสอบระบบสำรองของ AI'),
    h('p', { class: 'muted small' }, 'เฉพาะเซิร์ฟเวอร์ที่ไม่ใช่ production ใช้ทดสอบว่าหน้าภาพรวมของนักศึกษายังทำงานได้เมื่อ AI ล่ม'),
    h('div', { class: 'row-gap' }, breakBtn, fixBtn), out,
  );
}
