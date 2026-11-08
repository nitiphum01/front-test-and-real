// Small DOM helpers. Everything is built with createElement/textContent —
// never innerHTML with server data — so names or emails can't inject markup.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (typeof v === 'boolean') { if (k in el) el[k] = v; else el.setAttribute(k, ''); }
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
}

export const icon = (name, extra = '') => h('i', { class: `ti ti-${name} ${extra}`.trim(), 'aria-hidden': 'true' });

export function clear(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

// ---- page building blocks ----

export function pageHeader(title, subtitle, ...actions) {
  return h('div', { class: 'page-head' },
    h('div', null, h('h1', null, title), subtitle ? h('p', { class: 'muted' }, subtitle) : null),
    actions.length ? h('div', { class: 'page-actions' }, actions) : null,
  );
}

export function card(...children) {
  return h('section', { class: 'card' }, children);
}

export function loading(text = 'กำลังโหลด…') {
  return h('div', { class: 'state' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), h('p', { class: 'muted' }, text));
}

export function emptyState(title, body, action) {
  return h('div', { class: 'state' }, icon('inbox', 'state-icon'), h('h3', null, title), body ? h('p', { class: 'muted' }, body) : null, action || null);
}

export function errorState(message, onRetry) {
  return h('div', { class: 'state' },
    icon('alert-triangle', 'state-icon danger'),
    h('p', null, message),
    onRetry ? h('button', { class: 'btn', type: 'button', onclick: onRetry }, icon('refresh'), 'ลองใหม่') : null,
  );
}

export function notice(kind, ...children) {
  const icons = { info: 'info-circle', warn: 'alert-triangle', danger: 'alert-octagon', success: 'circle-check' };
  return h('div', { class: `notice ${kind}`, role: kind === 'danger' ? 'alert' : null }, icon(icons[kind] || 'info-circle'), h('div', null, children));
}

export function badge(text, kind = '') {
  return h('span', { class: `badge ${kind}`.trim() }, text);
}

export const ROLE_LABEL = { student: 'นักศึกษา', instructor: 'อาจารย์', staff: 'เจ้าหน้าที่', service: 'บริการ (service)' };
export const roleBadge = (role) => badge(ROLE_LABEL[role] || role, `role-${role}`);

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

// ---- forms ----

export function field(label, input, hint) {
  const name = input.name;
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    input,
    h('small', { class: 'field-error', dataset: { for: name || '' } }),
    hint ? h('small', { class: 'field-hint' }, hint) : null,
  );
}

export function setFieldErrors(form, errors = {}) {
  form.querySelectorAll('.field-error').forEach((el) => {
    const msg = errors[el.dataset.for];
    el.textContent = msg || '';
    const input = form.elements[el.dataset.for];
    if (input && input.setAttribute) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  });
  const first = Object.keys(errors).map((k) => form.elements[k]).find(Boolean);
  if (first && first.focus) first.focus();
}

// Disable a button while an async action runs, so it can't be double-submitted.
export async function busy(button, fn) {
  if (!button) return fn();
  const prev = button.disabled;
  button.disabled = true;
  button.classList.add('is-busy');
  try { return await fn(); } finally {
    button.disabled = prev;
    button.classList.remove('is-busy');
  }
}

// ---- toast ----

let toastTimer;
export function toast(message, kind = 'success') {
  const el = document.getElementById('toast');
  clear(el, icon(kind === 'error' ? 'alert-circle' : 'circle-check'), h('span', null, message));
  el.className = `toast ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3800);
}

// ---- dialogs (native <dialog>) ----

export function openDialog(title, body, { actions = [], wide = false, onClose } = {}) {
  const dlg = h('dialog', { class: `dialog ${wide ? 'wide' : ''}`.trim() });
  const close = () => dlg.close();
  dlg.append(
    h('div', { class: 'dialog-head' },
      h('h2', null, title),
      h('button', { class: 'btn ghost icon-only', type: 'button', 'aria-label': 'ปิด', onclick: close }, icon('x')),
    ),
    h('div', { class: 'dialog-body' }, body),
    actions.length ? h('div', { class: 'dialog-foot' }, actions) : null,
  );
  dlg.addEventListener('close', () => { dlg.remove(); if (onClose) onClose(); });
  document.body.append(dlg);
  dlg.showModal();
  return { dlg, close };
}

export function confirmDialog(title, message, { confirmText = 'ยืนยัน', danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const ok = h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, type: 'button' }, confirmText);
    const cancel = h('button', { class: 'btn', type: 'button' }, 'ยกเลิก');
    const { close } = openDialog(title, h('p', null, message), {
      actions: [cancel, ok],
      onClose: () => resolve(result),
    });
    ok.addEventListener('click', () => { result = true; close(); });
    cancel.addEventListener('click', close);
    setTimeout(() => cancel.focus(), 0);
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = h('textarea', { style: 'position:absolute;left:-9999px' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function jsonBlock(obj) {
  return h('pre', { class: 'code' }, JSON.stringify(obj, null, 2));
}

export const FIELD_LABEL = {
  student_id: 'รหัสนักศึกษา',
  first_name: 'ชื่อ',
  last_name: 'นามสกุล',
  email: 'อีเมล',
  age: 'อายุ',
};

export const SCOPE_LABEL = {
  'profile:read': 'อ่านข้อมูลโปรไฟล์ (ชื่อ-นามสกุล และความครบของโปรไฟล์)',
};
