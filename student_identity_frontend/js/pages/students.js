// Student directory for staff (full control) and instructors (read only).
// API: GET /students, GET /students/:id, POST /students, DELETE /students/:id

import { api, errorText } from '../api.js';
import {
  h, icon, clear, card, pageHeader, emptyState, errorState, field, setFieldErrors,
  busy, toast, openDialog, confirmDialog, formatDate,
} from '../ui.js';

export async function renderStudents(view, session, ctx) {
  const isStaff = session.role === 'staff';
  const r = await api('GET', '/students');
  if (!ctx.isCurrent()) return;
  if (!r.ok) return clear(view, errorState(errorText(r, 'โหลดรายชื่อไม่สำเร็จ'), () => renderStudents(view, session, ctx)));

  let rows = [...r.data].sort((a, b) => String(a.student_id).localeCompare(String(b.student_id)));
  const reload = () => renderStudents(view, session, ctx);

  const search = h('input', { type: 'search', placeholder: 'ค้นหารหัส ชื่อ หรืออีเมล', 'aria-label': 'ค้นหานักศึกษา' });
  const count = h('span', { class: 'muted small' });
  const tbody = h('tbody');
  const table = h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
    h('thead', null, h('tr', null,
      h('th', null, 'รหัสนักศึกษา'), h('th', null, 'ชื่อ-นามสกุล'), h('th', { class: 'hide-sm' }, 'อีเมล'),
      h('th', { class: 'hide-sm' }, 'สร้างเมื่อ'), h('th', { class: 'actions-col' }, h('span', { class: 'sr-only' }, 'จัดการ')))),
    tbody));
  const emptyBox = h('div');

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const shown = rows.filter((s) => !q || [s.student_id, s.first_name, s.last_name, s.email].some((v) => String(v || '').toLowerCase().includes(q)));
    count.textContent = q ? `พบ ${shown.length} จาก ${rows.length} คน` : `ทั้งหมด ${rows.length} คน`;
    clear(tbody, shown.map((s) => studentRow(s, isStaff, () => { rows = rows.filter((x) => x !== s); draw(); })));
    table.hidden = !shown.length;
    clear(emptyBox, shown.length ? null : (rows.length
      ? emptyState('ไม่พบนักศึกษาที่ค้นหา', 'ลองค้นด้วยคำอื่น')
      : emptyState('ยังไม่มีนักศึกษาในระบบ', isStaff ? 'เพิ่มนักศึกษาคนแรก หรือให้นักศึกษาสมัครบัญชีเอง' : 'นักศึกษาจะแสดงที่นี่เมื่อสมัครบัญชี')));
  };
  search.addEventListener('input', draw);

  const addBtn = isStaff ? h('button', { class: 'btn primary', type: 'button', onclick: () => openCreate(reload) }, icon('user-plus'), 'เพิ่มนักศึกษา') : null;

  clear(view,
    pageHeader('นักศึกษา', isStaff ? 'ดู เพิ่ม และลบข้อมูลนักศึกษา' : 'ดูข้อมูลนักศึกษา (อ่านอย่างเดียว)', addBtn),
    card(h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), search), count), table, emptyBox),
  );
  draw();
}

function studentRow(s, isStaff, onDeleted) {
  const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || '—';
  const viewBtn = h('button', { class: 'btn ghost sm icon-only', type: 'button', 'aria-label': `ดูข้อมูล ${name}`, title: 'ดูข้อมูล', onclick: () => openDetail(s.student_id) }, icon('eye'));
  const delBtn = isStaff ? h('button', { class: 'btn ghost sm icon-only danger-text', type: 'button', 'aria-label': `ลบ ${name}`, title: 'ลบ' }, icon('trash')) : null;
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      const ok = await confirmDialog('ลบนักศึกษา', `ลบข้อมูลของ ${name} (${s.student_id}) ออกจากระบบ การลบนี้ย้อนกลับไม่ได้`, { confirmText: 'ลบ', danger: true });
      if (!ok) return;
      busy(delBtn, async () => {
        const r = await api('DELETE', `/students/${encodeURIComponent(s.student_id)}`);
        if (r.ok) { toast(`ลบ ${name} แล้ว`); onDeleted(); } else toast(errorText(r, 'ลบไม่สำเร็จ'), 'error');
      });
    });
  }
  return h('tr', null,
    h('td', { class: 'mono' }, s.student_id),
    h('td', null, name),
    h('td', { class: 'hide-sm' }, s.email || '—'),
    h('td', { class: 'hide-sm muted nowrap' }, formatDate(s.created_at)),
    h('td', { class: 'actions-col' }, h('div', { class: 'row-gap end' }, viewBtn, delBtn)),
  );
}

async function openDetail(id) {
  const body = h('div', null, h('p', { class: 'muted' }, 'กำลังโหลด…'));
  openDialog('ข้อมูลนักศึกษา', body);
  const r = await api('GET', `/students/${encodeURIComponent(id)}`);
  if (!r.ok) { clear(body, h('p', null, errorText(r, 'โหลดข้อมูลไม่สำเร็จ'))); return; }
  const s = r.data;
  clear(body, h('dl', { class: 'kv' },
    h('dt', null, 'รหัสนักศึกษา'), h('dd', { class: 'mono' }, s.student_id),
    h('dt', null, 'ชื่อ'), h('dd', null, s.first_name || '—'),
    h('dt', null, 'นามสกุล'), h('dd', null, s.last_name || '—'),
    h('dt', null, 'อีเมล'), h('dd', null, s.email || '—'),
    h('dt', null, 'อายุ'), h('dd', null, s.age ?? '—'),
    h('dt', null, 'สร้างเมื่อ'), h('dd', null, formatDate(s.created_at)),
    h('dt', null, 'แก้ไขล่าสุด'), h('dd', null, formatDate(s.updated_at)),
  ));
}

function openCreate(onCreated) {
  const inp = (name, attrs = {}) => h('input', { name, required: true, ...attrs });
  const formError = h('div', { class: 'form-error', role: 'alert' });
  const form = h('form', { id: 'createStudent', class: 'stack', novalidate: true },
    field('รหัสนักศึกษา', inp('studentId', { inputmode: 'numeric', maxlength: '10', placeholder: 'รหัสนักศึกษา 10 หลัก' }), 'ตัวเลข 10 หลัก'),
    h('div', { class: 'grid-2' }, field('ชื่อ', inp('firstName', { maxlength: '100' })), field('นามสกุล', inp('lastName', { maxlength: '100' }))),
    field('อีเมล', inp('email', { type: 'email' }), 'นักศึกษาต้องสมัครด้วยอีเมลนี้ จึงจะผูกบัญชีกับข้อมูลนี้ได้'),
    formError,
  );
  const save = h('button', { class: 'btn primary', type: 'submit', form: 'createStudent' }, 'เพิ่มนักศึกษา');
  const { close } = openDialog('เพิ่มนักศึกษา', form, { actions: [save] });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.textContent = '';
    const v = Object.fromEntries(new FormData(form));
    const body = {
      studentId: String(v.studentId).trim(),
      firstName: String(v.firstName).trim(),
      lastName: String(v.lastName).trim(),
      email: String(v.email).trim().toLowerCase(),
    };
    const errors = {};
    if (!/^\d{10}$/.test(body.studentId)) errors.studentId = 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก';
    if (!body.firstName) errors.firstName = 'กรอกชื่อ';
    if (!body.lastName) errors.lastName = 'กรอกนามสกุล';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.email = 'กรอกอีเมลให้ถูกต้อง';
    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;

    busy(save, async () => {
      const r = await api('POST', '/students', { body });
      if (r.ok) { toast(`เพิ่ม ${body.firstName} ${body.lastName} แล้ว`); close(); onCreated(); return; }
      const raw = String((r.data && r.data.error) || '');
      formError.textContent = /duplicate|unique/i.test(raw)
        ? 'รหัสนักศึกษาหรืออีเมลนี้มีในระบบแล้ว'
        : errorText(r, 'เพิ่มไม่สำเร็จ');
    });
  });
}
