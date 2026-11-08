// Role lookup (staff + instructor) and assignment (staff only).
// API: GET /roles, GET /roles/:subject, PUT /roles/:subject

import { api, errorText } from '../api.js';
import {
  h, icon, clear, card, pageHeader, emptyState, errorState, notice, badge, roleBadge,
  field, busy, toast, confirmDialog, formatDate, ROLE_LABEL,
} from '../ui.js';

export async function renderRoles(view, session, ctx) {
  const isStaff = session.role === 'staff';
  const r = await api('GET', '/roles');
  if (!ctx.isCurrent()) return;
  if (!r.ok) return clear(view, errorState(errorText(r, 'โหลดข้อมูลสิทธิ์ไม่สำเร็จ'), () => renderRoles(view, session, ctx)));

  const { availableRoles, subjects } = r.data;
  const reload = () => renderRoles(view, session, ctx);
  const order = { staff: 0, instructor: 1, student: 2 };
  const rows = [...subjects].sort((a, b) => (order[a.role] - order[b.role]) || String(a.subject).localeCompare(String(b.subject)));

  const filter = h('select', { 'aria-label': 'กรองตาม role' },
    h('option', { value: '' }, 'ทุก role'), availableRoles.map((x) => h('option', { value: x }, ROLE_LABEL[x] || x)));
  const search = h('input', { type: 'search', placeholder: 'ค้นหา subject หรือชื่อ', 'aria-label': 'ค้นหา' });
  const tbody = h('tbody');
  const emptyBox = h('div');
  const tableWrap = h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
    h('thead', null, h('tr', null,
      h('th', null, 'Subject'), h('th', null, 'ชื่อ'), h('th', null, 'Role'),
      h('th', { class: 'hide-sm' }, 'ที่มา'), h('th', { class: 'hide-sm' }, 'แก้ไขโดย'))),
    tbody));

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const shown = rows.filter((x) => (!filter.value || x.role === filter.value)
      && (!q || [x.subject, x.name].some((v) => String(v || '').toLowerCase().includes(q))));
    clear(tbody, shown.map((x) => roleRow(x, availableRoles, isStaff, session, reload)));
    tableWrap.hidden = !shown.length;
    clear(emptyBox, shown.length ? null : emptyState('ไม่พบรายการ', 'ลองเปลี่ยนตัวกรองหรือคำค้นหา'));
  };
  filter.addEventListener('change', draw);
  search.addEventListener('input', draw);

  clear(view,
    pageHeader('สิทธิ์ผู้ใช้ (Roles)', isStaff ? 'ดูและกำหนด role ของผู้ใช้แต่ละคน' : 'ดู role ของผู้ใช้ (อ่านอย่างเดียว)'),
    notice('info', 'Role ใหม่จะมีผลเมื่อผู้ใช้คนนั้นเข้าสู่ระบบครั้งถัดไป เพราะ role ถูกฝังอยู่ใน token ที่ออกไปแล้ว ผู้ที่ไม่มี role กำหนดไว้จะเป็น "นักศึกษา" โดยอัตโนมัติ'),
    h('div', { class: 'grid-2 top roles-grid' },
      card(h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), search), filter), tableWrap, emptyBox),
      lookupCard(availableRoles, isStaff, session, reload),
    ),
  );
  draw();
}

function roleRow(x, availableRoles, isStaff, session, reload) {
  let roleCell;
  if (isStaff) {
    const sel = h('select', { 'aria-label': `role ของ ${x.subject}`, class: 'sm' }, availableRoles.map((r) => h('option', { value: r }, ROLE_LABEL[r] || r)));
    sel.value = x.role;
    sel.addEventListener('change', async () => {
      const ok = await assignRole(x.subject, sel.value, session);
      if (ok) reload(); else sel.value = x.role;
    });
    roleCell = sel;
  } else {
    roleCell = roleBadge(x.role);
  }
  return h('tr', null,
    h('td', { class: 'mono' }, x.subject),
    h('td', null, x.name || '—'),
    h('td', null, roleCell),
    h('td', { class: 'hide-sm' }, x.source === 'assigned' ? badge('กำหนดเอง', 'accent') : badge('ค่าเริ่มต้น')),
    h('td', { class: 'hide-sm muted small' }, x.updatedBy ? `${x.updatedBy} · ${formatDate(x.updatedAt)}` : '—'),
  );
}

async function assignRole(subject, role, session) {
  if (subject === session.sub) {
    const ok = await confirmDialog('เปลี่ยน role ของตัวเอง', `คุณกำลังเปลี่ยน role ของตัวเองเป็น "${ROLE_LABEL[role]}" ถ้าไม่ใช่เจ้าหน้าที่แล้ว คุณจะจัดการ role ไม่ได้อีกหลังเข้าสู่ระบบครั้งถัดไป`, { confirmText: 'เปลี่ยน role', danger: true });
    if (!ok) return false;
  }
  const r = await api('PUT', `/roles/${encodeURIComponent(subject)}`, { body: { role } });
  if (r.ok) { toast(`ตั้ง ${subject} เป็น ${ROLE_LABEL[role]} แล้ว`); return true; }
  toast(errorText(r, 'เปลี่ยน role ไม่สำเร็จ'), 'error');
  return false;
}

function lookupCard(availableRoles, isStaff, session, reload) {
  const subject = h('input', { name: 'subject', placeholder: 'รหัสนักศึกษา หรือชื่อผู้ใช้', autocomplete: 'off', required: true });
  const btn = h('button', { class: 'btn', type: 'submit' }, icon('search'), 'ค้นหา');
  const result = h('div', { class: 'lookup-result' });
  const form = h('form', { class: 'stack' }, field('Subject (รหัสนักศึกษาหรือชื่อผู้ใช้)', subject), btn);

  const showAssign = (subj, currentRole) => {
    if (!isStaff) return null;
    const sel = h('select', { 'aria-label': 'role ใหม่' }, availableRoles.map((r) => h('option', { value: r }, ROLE_LABEL[r] || r)));
    sel.value = currentRole || 'staff';
    const save = h('button', { class: 'btn primary', type: 'button' }, 'บันทึก role');
    save.addEventListener('click', () => busy(save, async () => { if (await assignRole(subj, sel.value, session)) reload(); }));
    return h('div', { class: 'assign-row' }, sel, save);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const subj = subject.value.trim();
    if (!subj) return;
    busy(btn, async () => {
      const r = await api('GET', `/roles/${encodeURIComponent(subj)}`);
      if (r.ok) {
        const x = r.data;
        clear(result,
          h('dl', { class: 'kv' },
            h('dt', null, 'Subject'), h('dd', { class: 'mono' }, x.subject),
            h('dt', null, 'ชื่อ'), h('dd', null, x.name || '—'),
            h('dt', null, 'Role'), h('dd', null, roleBadge(x.role), ' ', x.source === 'assigned' ? badge('กำหนดเอง', 'accent') : badge('ค่าเริ่มต้น')),
          ),
          showAssign(x.subject, x.role));
      } else if (r.status === 404) {
        clear(result,
          notice('warn', `ไม่พบ "${subj}" ในระบบ`),
          isStaff ? h('p', { class: 'muted small' }, 'กำหนด role ให้ผู้ใช้ใหม่ได้ เช่น บัญชีเจ้าหน้าที่หรืออาจารย์ที่ไม่มีข้อมูลนักศึกษา') : null,
          showAssign(subj, 'staff'));
      } else {
        clear(result, notice('danger', errorText(r, 'ค้นหาไม่สำเร็จ')));
      }
    });
  });

  return card(h('h2', null, isStaff ? 'ค้นหาและกำหนด role' : 'ค้นหา role'), form, result);
}
