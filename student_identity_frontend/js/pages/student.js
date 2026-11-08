// Student pages: overview, profile, privacy (consent).
// API: GET/PATCH /me, GET /me/profile-completeness, GET/PUT/DELETE /me/consents/:granteeId

import { api, errorText } from '../api.js';
import {
  h, icon, clear, card, pageHeader, loading, emptyState, errorState, notice, badge,
  field, setFieldErrors, busy, toast, confirmDialog, formatDate, FIELD_LABEL, SCOPE_LABEL,
} from '../ui.js';

const REQUIRED = ['first_name', 'last_name', 'email']; // same checklist the backend uses

function noStudentRecord(view) {
  clear(view, emptyState('ยังไม่มีข้อมูลนักศึกษาของบัญชีนี้', 'บัญชีนี้ยังไม่ผูกกับข้อมูลนักศึกษา ติดต่อเจ้าหน้าที่ หรือสมัครบัญชีด้วยรหัสนักศึกษาของคุณ'));
}

// ---------------------------------------------------------------- overview
export async function renderOverview(view, session, { isCurrent }) {
  const [me, comp, cons] = await Promise.all([
    api('GET', '/me'),
    api('GET', '/me/profile-completeness'),
    api('GET', '/me/consents'),
  ]);
  if (!isCurrent()) return;
  if (me.status === 404) return noStudentRecord(view);
  if (!me.ok) return clear(view, errorState(errorText(me, 'โหลดข้อมูลไม่สำเร็จ'), () => renderOverview(view, session, { isCurrent })));

  const s = me.data;
  const present = REQUIRED.filter((f) => s[f]);
  const pct = Math.round((present.length / REQUIRED.length) * 100);
  const services = cons.ok ? cons.data.services : [];
  const allowed = services.filter((x) => x.scopes.length);

  const completenessBody = [];
  if (comp.ok && comp.data.source === 'ai') {
    completenessBody.push(h('p', null, comp.data.message), badge('คำแนะนำจาก AI', 'accent'));
  } else if (comp.ok) {
    completenessBody.push(
      notice('info', 'ระบบคำแนะนำ AI ไม่พร้อมใช้งานชั่วคราว จึงแสดงรายการตรวจสอบแทน'),
      h('ul', { class: 'checklist' }, (comp.data.checklist || []).map((c) =>
        h('li', { class: c.present ? 'ok' : 'missing' }, icon(c.present ? 'circle-check' : 'circle-dashed'), FIELD_LABEL[c.field] || c.field))),
    );
  } else {
    completenessBody.push(h('p', { class: 'muted' }, errorText(comp, 'โหลดคำแนะนำไม่สำเร็จ')));
  }

  clear(view,
    pageHeader(`สวัสดี ${s.first_name || ''}`.trim(), 'ภาพรวมบัญชี Student Identity ของคุณ'),
    h('div', { class: 'grid-3' },
      h('div', { class: 'metric' }, h('span', { class: 'metric-label' }, 'รหัสนักศึกษา'), h('span', { class: 'metric-value mono' }, s.student_id)),
      h('div', { class: 'metric' }, h('span', { class: 'metric-label' }, 'ความครบของโปรไฟล์'), h('span', { class: 'metric-value' }, `${pct}%`), progress(pct)),
      h('div', { class: 'metric' }, h('span', { class: 'metric-label' }, 'บริการที่คุณอนุญาต'), h('span', { class: 'metric-value' }, `${allowed.length} / ${services.length}`)),
    ),
    h('div', { class: 'grid-2 top' },
      card(
        h('div', { class: 'card-head' }, h('h2', null, 'ความครบของโปรไฟล์'), h('a', { class: 'btn sm', href: '#/profile' }, icon('edit'), 'แก้ไขโปรไฟล์')),
        completenessBody,
      ),
      card(
        h('div', { class: 'card-head' }, h('h2', null, 'บริการที่เข้าถึงข้อมูลคุณ'), h('a', { class: 'btn sm', href: '#/privacy' }, icon('shield-lock'), 'จัดการ')),
        allowed.length
          ? h('ul', { class: 'plain-list' }, allowed.map((x) => h('li', null, icon('plug-connected'), h('span', null, x.granteeId), badge('อนุญาต', 'success'))))
          : h('p', { class: 'muted' }, 'ยังไม่มีบริการใดเข้าถึงข้อมูลของคุณได้'),
      ),
    ),
  );
}

function progress(pct) {
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) },
    h('span', { style: `width:${pct}%` }));
}

// ---------------------------------------------------------------- profile
export async function renderProfile(view, session, { isCurrent }) {
  const me = await api('GET', '/me');
  if (!isCurrent()) return;
  if (me.status === 404) return noStudentRecord(view);
  if (!me.ok) return clear(view, errorState(errorText(me, 'โหลดโปรไฟล์ไม่สำเร็จ'), () => renderProfile(view, session, { isCurrent })));
  drawProfile(view, me.data);
}

function drawProfile(view, s) {
  const inputs = {
    first_name: h('input', { name: 'first_name', maxlength: '100', autocomplete: 'given-name', required: true }),
    last_name: h('input', { name: 'last_name', maxlength: '100', autocomplete: 'family-name', required: true }),
    email: h('input', { name: 'email', type: 'email', autocomplete: 'email', required: true }),
    age: h('input', { name: 'age', type: 'number', min: '1', max: '119', step: '1', inputmode: 'numeric' }),
  };
  Object.entries(inputs).forEach(([k, el]) => { el.value = s[k] ?? ''; });

  const save = h('button', { class: 'btn primary', type: 'submit' }, icon('device-floppy'), 'บันทึก');
  const reset = h('button', { class: 'btn', type: 'button' }, 'คืนค่าเดิม');
  const formError = h('div', { class: 'form-error', role: 'alert' });

  const form = h('form', { class: 'stack', novalidate: true },
    h('div', { class: 'grid-2' }, field('ชื่อ', inputs.first_name), field('นามสกุล', inputs.last_name)),
    field('อีเมล', inputs.email, 'ใช้ติดต่อคุณเท่านั้น ไม่ถูกส่งให้บริการอื่น'),
    field('อายุ', inputs.age, 'ไม่บังคับ · ไม่ถูกส่งให้บริการอื่น'),
    formError,
    h('div', { class: 'form-actions' }, reset, save),
  );

  reset.addEventListener('click', () => { Object.entries(inputs).forEach(([k, el]) => { el.value = s[k] ?? ''; }); setFieldErrors(form, {}); formError.textContent = ''; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.textContent = '';
    const errors = {};
    const updates = {};
    ['first_name', 'last_name'].forEach((k) => {
      const v = inputs[k].value.trim();
      if (!v) errors[k] = `กรอก${FIELD_LABEL[k]}`;
      else if (v !== (s[k] || '')) updates[k] = v;
    });
    const email = inputs.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'กรอกอีเมลให้ถูกต้อง';
    else if (email !== (s.email || '')) updates.email = email;
    const ageRaw = inputs.age.value.trim();
    const age = ageRaw === '' ? null : Number(ageRaw);
    if (age !== null && (!Number.isInteger(age) || age < 1 || age > 119)) errors.age = 'อายุต้องเป็นจำนวนเต็ม 1–119';
    else if (age !== (s.age ?? null)) updates.age = age;

    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;
    if (!Object.keys(updates).length) { toast('ไม่มีข้อมูลที่เปลี่ยนแปลง'); return; }

    busy(save, async () => {
      const r = await api('PATCH', '/me', { body: updates });
      if (r.ok) {
        const { _webhookDebug, ...fresh } = r.data;
        toast('บันทึกโปรไฟล์แล้ว');
        drawProfile(view, fresh);
        return;
      }
      if (r.status === 400 && r.data && r.data.fields) {
        const th = {
          first_name: 'ต้องมี 1–100 ตัวอักษร', last_name: 'ต้องมี 1–100 ตัวอักษร',
          email: 'กรอกอีเมลให้ถูกต้อง', age: 'อายุต้องเป็นจำนวนเต็ม 1–119',
        };
        const mapped = {};
        Object.keys(r.data.fields).filter((k) => k !== '_').forEach((k) => { mapped[k] = th[k] || r.data.fields[k]; });
        setFieldErrors(form, mapped);
      }
      // The backend answers 404 for any failed update, most often a duplicate email.
      formError.textContent = r.status === 404
        ? 'บันทึกไม่สำเร็จ อีเมลนี้อาจถูกใช้โดยนักศึกษาคนอื่นแล้ว'
        : errorText(r, 'บันทึกไม่สำเร็จ');
    });
  });

  clear(view,
    pageHeader('โปรไฟล์ของฉัน', 'ข้อมูลที่ระบบอื่นในแคมปัสใช้ยืนยันตัวตนคุณ'),
    h('div', { class: 'grid-2 top profile-grid' },
      card(h('h2', null, 'ข้อมูลส่วนตัว'), form),
      card(
        h('h2', null, 'ข้อมูลบัญชี'),
        h('dl', { class: 'kv' },
          h('dt', null, 'รหัสนักศึกษา'), h('dd', { class: 'mono' }, s.student_id),
          h('dt', null, 'สร้างเมื่อ'), h('dd', null, formatDate(s.created_at)),
          h('dt', null, 'แก้ไขล่าสุด'), h('dd', null, formatDate(s.updated_at)),
        ),
        notice('info', 'รหัสนักศึกษาแก้ไขเองไม่ได้ หากผิดพลาดให้ติดต่อเจ้าหน้าที่'),
        h('h3', null, 'ข้อมูลที่บริการอื่นเห็น'),
        h('p', { class: 'muted small' }, 'เฉพาะบริการที่คุณอนุญาตในหน้าความเป็นส่วนตัว จะเห็นชื่อ-นามสกุล และสถานะความครบของโปรไฟล์ อีเมลและอายุจะไม่ถูกส่งออก'),
      ),
    ),
  );
}

// ---------------------------------------------------------------- privacy
export async function renderPrivacy(view, session, { isCurrent }) {
  const r = await api('GET', '/me/consents');
  if (!isCurrent()) return;
  if (!r.ok) return clear(view, errorState(errorText(r, 'โหลดการตั้งค่าไม่สำเร็จ'), () => renderPrivacy(view, session, { isCurrent })));

  const { availableScopes, services } = r.data;
  const header = pageHeader('ความเป็นส่วนตัว', 'เลือกว่าบริการไหนในแคมปัสดูข้อมูลของคุณได้ เปลี่ยนได้ตลอดเวลา');

  if (!services.length) {
    return clear(view, header, card(emptyState('ยังไม่มีบริการที่ลงทะเบียน', 'เมื่อเจ้าหน้าที่ลงทะเบียนบริการ เช่น ระบบฝึกงาน บริการนั้นจะแสดงที่นี่ให้คุณเลือกอนุญาต')));
  }

  const list = h('div', { class: 'consent-list' }, services.map((svc) => consentRow(svc, availableScopes)));
  clear(view, header,
    notice('info', 'บริการที่คุณอนุญาตจะเห็นเฉพาะชื่อ-นามสกุลและสถานะความครบของโปรไฟล์เท่านั้น อีเมลและอายุไม่ถูกส่งออก ทุกการอนุญาตหรือยกเลิกจะถูกบันทึกไว้'),
    list,
  );
}

function consentRow(svc, availableScopes) {
  let current = [...svc.scopes];
  const updated = h('small', { class: 'muted' }, svc.updatedAt ? `อัปเดต ${formatDate(svc.updatedAt)}` : 'ยังไม่เคยอนุญาต');
  const statusBadge = h('span');
  const revokeBtn = h('button', { class: 'btn ghost sm danger-text', type: 'button' }, 'ยกเลิกทั้งหมด');

  const refresh = () => {
    statusBadge.replaceChildren(current.length ? badge('อนุญาตแล้ว', 'success') : badge('ไม่อนุญาต'));
    revokeBtn.hidden = !current.length;
    toggles.forEach((t) => { t.input.checked = current.includes(t.scope); });
  };

  const save = async (next, control) => {
    const r = next.length
      ? await api('PUT', `/me/consents/${encodeURIComponent(svc.granteeId)}`, { body: { scopes: next } })
      : await api('DELETE', `/me/consents/${encodeURIComponent(svc.granteeId)}`);
    if (!r.ok) { toast(errorText(r, 'บันทึกไม่สำเร็จ'), 'error'); refresh(); return; }
    current = next;
    updated.textContent = `อัปเดต ${formatDate(new Date().toISOString())}`;
    toast(next.length ? `อนุญาตให้ ${svc.granteeId} แล้ว` : `ยกเลิกการเข้าถึงของ ${svc.granteeId} แล้ว`);
    refresh();
    if (control) control.focus();
  };

  const toggles = availableScopes.map((scope) => {
    const input = h('input', { type: 'checkbox', role: 'switch', class: 'switch' });
    input.addEventListener('change', () => {
      const next = input.checked ? [...new Set([...current, scope])] : current.filter((x) => x !== scope);
      input.disabled = true;
      save(next, input).finally(() => { input.disabled = false; });
    });
    return { scope, input, el: h('label', { class: 'scope-row' }, h('span', null, h('b', null, SCOPE_LABEL[scope] || scope), h('small', { class: 'muted mono' }, scope)), input) };
  });

  revokeBtn.addEventListener('click', async () => {
    const ok = await confirmDialog('ยกเลิกการเข้าถึงทั้งหมด', `${svc.granteeId} จะไม่สามารถดูข้อมูลของคุณได้อีก จนกว่าคุณจะอนุญาตใหม่`, { confirmText: 'ยกเลิกการเข้าถึง', danger: true });
    if (ok) busy(revokeBtn, () => save([], null));
  });

  const row = h('section', { class: 'card consent' },
    h('div', { class: 'consent-head' },
      h('div', { class: 'consent-title' }, h('span', { class: 'avatar' }, icon('plug')), h('div', null, h('h3', null, svc.granteeId), updated)),
      h('div', { class: 'row-gap' }, statusBadge, revokeBtn),
    ),
    toggles.map((t) => t.el),
  );
  refresh();
  return row;
}
