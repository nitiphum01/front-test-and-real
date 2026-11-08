// Sign in / Create account. Uses POST /auth/login and POST /auth/signup.
// Dev shortcuts use POST /dev/issue-token, which only exists when the backend
// is NOT running with NODE_ENV=production.

import { api, errorText } from '../api.js';
import { saveToken, takeFlash } from '../session.js';
import { go, homeFor } from '../router.js';
import { h, icon, field, setFieldErrors, busy, notice, clear } from '../ui.js';
import { serverStatus, serverLine } from '../server.js';

const STUDENT_ID = /^\d{10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function finish(token) {
  const s = saveToken(token);
  go(homeFor(s.role));
}

export function renderLogin(root) {
  const flash = takeFlash();
  const status = serverStatus();

  const tabIn = h('button', { type: 'button', role: 'tab', class: 'tab active', 'aria-selected': 'true' }, 'เข้าสู่ระบบ');
  const tabUp = h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': 'false' }, 'สร้างบัญชี');
  const signin = signinForm();
  const signup = signupForm();
  signup.hidden = true;

  const show = (which) => {
    const isIn = which === 'in';
    tabIn.classList.toggle('active', isIn); tabIn.setAttribute('aria-selected', String(isIn));
    tabUp.classList.toggle('active', !isIn); tabUp.setAttribute('aria-selected', String(!isIn));
    signin.hidden = !isIn; signup.hidden = isIn;
    (isIn ? signin : signup).querySelector('input').focus();
  };
  tabIn.addEventListener('click', () => show('in'));
  tabUp.addEventListener('click', () => show('up'));

  clear(root, h('div', { class: 'auth' },
    h('div', { class: 'auth-wrap' },
      h('div', { class: 'brand auth-brand' },
        h('span', { class: 'brand-mark' }, icon('fingerprint')),
        h('span', { class: 'brand-text' }, h('b', null, 'Student Identity'))),
      h('section', { class: 'card auth-card' },
        h('div', { class: 'card-header center' },
          h('h1', { class: 'card-title' }, 'ยินดีต้อนรับ'),
          h('p', { class: 'card-description' }, 'เข้าสู่ระบบด้วยรหัสนักศึกษา 10 หลัก หรือสร้างบัญชีใหม่')),
        flash ? notice('warn', flash) : null,
        h('div', { class: 'tabs', role: 'tablist' }, tabIn, tabUp),
        signin,
        signup,
        devShortcuts(),
      ),
      h('div', { class: 'auth-server' }, status.el, serverLine(() => renderLogin(root))),
      h('p', { class: 'auth-foot' }, 'อีเมลและอายุของคุณจะไม่ถูกส่งให้บริการอื่น'),
    ),
  ));
  signin.querySelector('input').focus();
}

function signinForm() {
  const sid = h('input', { name: 'studentId', inputmode: 'numeric', autocomplete: 'username', required: true, maxlength: '40', placeholder: '6731503032' });
  const pw = h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const err = h('div', { class: 'form-error', role: 'alert' });
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'เข้าสู่ระบบ');
  const form = h('form', { class: 'stack', novalidate: true },
    field('รหัสนักศึกษา', sid),
    field('รหัสผ่าน', pw, null),
    err, btn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.textContent = '';
    const errors = {};
    if (!sid.value.trim()) errors.studentId = 'กรอกรหัสนักศึกษา';
    if (!pw.value) errors.password = 'กรอกรหัสผ่าน';
    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;
    busy(btn, async () => {
      const r = await api('POST', '/auth/login', { body: { studentId: sid.value.trim(), password: pw.value }, auth: false });
      if (r.ok && r.data && r.data.token) return finish(r.data.token);
      err.textContent = errorText(r, 'เข้าสู่ระบบไม่สำเร็จ');
      pw.select();
    });
  });
  return form;
}

function signupForm() {
  const inp = (name, attrs = {}) => h('input', { name, required: true, ...attrs });
  const form = h('form', { class: 'stack', novalidate: true },
    field('รหัสนักศึกษา', inp('studentId', { inputmode: 'numeric', maxlength: '10', autocomplete: 'username', placeholder: '6731503032' }), 'ตัวเลข 10 หลัก'),
    h('div', { class: 'grid-2' },
      field('ชื่อ', inp('firstName', { autocomplete: 'given-name', maxlength: '100' })),
      field('นามสกุล', inp('lastName', { autocomplete: 'family-name', maxlength: '100' })),
    ),
    field('อีเมล', inp('email', { type: 'email', autocomplete: 'email', placeholder: '6731503032@lamduan.mfu.ac.th' })),
    field('รหัสผ่าน', inp('password', { type: 'password', autocomplete: 'new-password', minlength: '8' }), 'อย่างน้อย 8 ตัวอักษร'),
    field('ยืนยันรหัสผ่าน', inp('confirm', { type: 'password', autocomplete: 'new-password' })),
  );
  const err = h('div', { class: 'form-error', role: 'alert' });
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'สร้างบัญชี');
  form.append(err, btn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.textContent = '';
    const v = Object.fromEntries(new FormData(form));
    const body = {
      studentId: String(v.studentId || '').trim(),
      firstName: String(v.firstName || '').trim(),
      lastName: String(v.lastName || '').trim(),
      email: String(v.email || '').trim().toLowerCase(),
      password: String(v.password || ''),
    };
    const errors = {};
    if (!STUDENT_ID.test(body.studentId)) errors.studentId = 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก';
    if (!body.firstName) errors.firstName = 'กรอกชื่อ';
    if (!body.lastName) errors.lastName = 'กรอกนามสกุล';
    if (!EMAIL.test(body.email)) errors.email = 'กรอกอีเมลให้ถูกต้อง';
    if (body.password.length < 8) errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (v.confirm !== body.password) errors.confirm = 'รหัสผ่านไม่ตรงกัน';
    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;

    busy(btn, async () => {
      const r = await api('POST', '/auth/signup', { body, auth: false });
      if (r.ok && r.data && r.data.token) return finish(r.data.token);
      if (r.status === 400 && r.data && r.data.fields) {
        const th = { studentId: 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก', firstName: 'กรอกชื่อ', lastName: 'กรอกนามสกุล', email: 'กรอกอีเมลให้ถูกต้อง', password: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
        const mapped = {};
        Object.keys(r.data.fields).forEach((k) => { mapped[k] = th[k] || r.data.fields[k]; });
        setFieldErrors(form, mapped);
      }
      err.textContent = errorText(r, 'สร้างบัญชีไม่สำเร็จ');
    });
  });
  return form;
}

function devShortcuts() {
  const msg = h('div', { class: 'form-error', role: 'alert' });
  const issue = async (payload, btn) => busy(btn, async () => {
    msg.textContent = '';
    const r = await api('POST', '/dev/issue-token', { body: payload, auth: false });
    if (r.ok && r.data && r.data.token) return finish(r.data.token);
    msg.textContent = r.status === 404
      ? 'ทางลัดนี้ปิดอยู่ เพราะเซิร์ฟเวอร์รันแบบ production'
      : errorText(r, 'ขอ token ไม่สำเร็จ');
  });

  const preset = (label, ic, payload) => {
    const b = h('button', { class: 'chip', type: 'button' }, icon(ic), label);
    b.addEventListener('click', () => issue(payload, b));
    return b;
  };

  const sub = h('input', { name: 'sub', placeholder: 'staff-2', autocomplete: 'off', required: true });
  const role = h('select', { name: 'role' }, ['student', 'instructor', 'staff', 'service'].map((r) => h('option', { value: r }, r)));
  const goBtn = h('button', { class: 'btn', type: 'submit' }, 'เข้าใช้');
  const custom = h('form', { class: 'dev-custom' }, sub, role, goBtn);
  custom.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!sub.value.trim()) { msg.textContent = 'กรอก subject'; return; }
    const payload = { sub: sub.value.trim(), role: role.value };
    if (role.value === 'service') payload.scopes = ['profile:read'];
    issue(payload, goBtn);
  });

  return h('details', { class: 'dev' },
    h('summary', null, icon('code'), 'สำหรับนักพัฒนา: เข้าใช้โดยไม่ใช้รหัสผ่าน'),
    h('p', { class: 'muted small' }, 'ใช้ POST /dev/issue-token ของ backend ได้เฉพาะตอนที่เซิร์ฟเวอร์ไม่ได้รันแบบ production เหมาะสำหรับทดสอบหน้าเจ้าหน้าที่ อาจารย์ และ service'),
    h('div', { class: 'chip-row' },
      preset('เจ้าหน้าที่', 'briefcase', { sub: 'staff-1', role: 'staff' }),
      preset('อาจารย์', 'school', { sub: 'instructor-1', role: 'instructor' }),
      preset('Service', 'plug', { sub: 'internship-service', role: 'service', scopes: ['profile:read'] }),
    ),
    custom,
    msg,
  );
}
