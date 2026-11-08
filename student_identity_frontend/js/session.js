// The signed-in user's token, kept in sessionStorage (cleared when the tab closes).
// The backend issues HS256 JWTs valid for 15 minutes with no refresh endpoint,
// so the UI reads `exp` from the token and signs the user out when it passes.

const KEY = 'si.session';
const FLASH = 'si.flash';

function decodePayload(token) {
  const part = String(token).split('.')[1];
  if (!part) throw new Error('bad token');
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function saveToken(token) {
  const p = decodePayload(token);
  const session = { token, sub: String(p.sub), role: p.role, scopes: p.scopes || [], exp: p.exp };
  try { sessionStorage.setItem(KEY, JSON.stringify(session)); } catch (e) { memory = session; }
  memory = session;
  return session;
}

let memory = null;

export function getSession() {
  let s = memory;
  if (!s) {
    try { s = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { s = null; }
  }
  if (!s || !s.token) return null;
  if (secondsLeft(s) <= 0) { clearSession(); return null; }
  memory = s;
  return s;
}

export function secondsLeft(s = getSession()) {
  return s ? Math.floor(s.exp - Date.now() / 1000) : 0;
}

export function clearSession() {
  memory = null;
  try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

// One-shot message shown on the next screen (e.g. "your session expired").
export function setFlash(msg) {
  try { sessionStorage.setItem(FLASH, msg); } catch (e) { /* ignore */ }
}
export function takeFlash() {
  try {
    const m = sessionStorage.getItem(FLASH);
    sessionStorage.removeItem(FLASH);
    return m;
  } catch (e) { return null; }
}
