// Single place that talks to the Student Identity backend.
// Every call resolves to { ok, status, data } — it never throws — so pages can
// show a friendly message instead of crashing.

import { apiBase } from '../config.js';
import { getSession, clearSession, setFlash } from './session.js';

const SLOW_MS = 3500;      // after this, tell the user the server may be waking up
const TIMEOUT_MS = 70000;  // Render free tier can take ~50 s to wake

let pending = 0;
function slowBanner(delta) {
  pending = Math.max(0, pending + delta);
  const el = document.getElementById('wakeBanner');
  if (el) el.hidden = pending === 0;
}

/**
 * @param {string} method
 * @param {string} path  e.g. "/me"
 * @param {{ body?: any, headers?: Record<string,string>, auth?: boolean, timeout?: number }} [opts]
 *   auth: attach the signed-in user's token (default true). A custom
 *   Authorization header (e.g. an API key) always wins and never triggers sign-out.
 */
export async function api(method, path, opts = {}) {
  const { body, headers = {}, auth = true, timeout = TIMEOUT_MS } = opts;
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const session = getSession();
  const usingSessionToken = auth && session && !h.Authorization;
  if (usingSessionToken) h.Authorization = `Bearer ${session.token}`;

  const ctrl = new AbortController();
  const killer = setTimeout(() => ctrl.abort(), timeout);
  let slowShown = false;
  const slow = setTimeout(() => { slowShown = true; slowBanner(+1); }, SLOW_MS);

  try {
    const res = await fetch(apiBase() + path, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { error: text.slice(0, 200) }; }

    if (res.status === 401 && usingSessionToken) {
      clearSession();
      setFlash('เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง');
      location.hash = '#/login';
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const timedOut = err && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: { error: timedOut ? 'เซิร์ฟเวอร์ไม่ตอบสนอง ลองใหม่อีกครั้ง' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตหรือที่อยู่เซิร์ฟเวอร์' },
    };
  } finally {
    clearTimeout(killer);
    clearTimeout(slow);
    if (slowShown) slowBanner(-1);
  }
}

// Backend error strings are English; translate the common ones.
const KNOWN = {
  'Insufficient role': 'บัญชีของคุณไม่มีสิทธิ์ทำรายการนี้',
  'Not found': 'ไม่พบข้อมูล',
  'Student not found': 'ไม่พบนักศึกษารหัสนี้',
  'No consent granted for this scope': 'นักศึกษายังไม่ได้อนุญาตให้บริการนี้เข้าถึงข้อมูล',
  'Invalid API key': 'API key ไม่ถูกต้อง',
  'Invalid or expired token': 'Token ไม่ถูกต้องหรือหมดอายุ',
  'Missing or malformed Authorization header': 'ไม่ได้แนบ token',
  'Wrong student ID or password': 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง',
  'Please fix the highlighted fields': 'กรุณาแก้ไขช่องที่ไฮไลต์',
  'Nothing to update': 'ไม่มีข้อมูลที่เปลี่ยนแปลง',
  'Service client not found': 'ไม่พบ service client นี้',
  'An account already exists for this student ID. Sign in instead.': 'รหัสนักศึกษานี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ',
  'This student ID is registered with a different email.': 'รหัสนักศึกษานี้ลงทะเบียนไว้กับอีเมลอื่น',
  'This email is already used by another student.': 'อีเมลนี้ถูกใช้โดยนักศึกษาคนอื่นแล้ว',
  'No role or student record for this subject': 'ไม่พบ role หรือข้อมูลนักศึกษาของรายการนี้',
};

export function errorText(res, fallback = 'เกิดข้อผิดพลาด') {
  const raw = res && res.data && res.data.error;
  if (typeof raw === 'string' && raw) return KNOWN[raw] || raw;
  if (res && res.status) return `${fallback} (รหัส ${res.status})`;
  return fallback;
}
