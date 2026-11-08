// Where the Student Identity backend lives.
// Local backend (npm start in student_identity) → http://localhost:3000
// Deployed backend → https://student-identity.onrender.com
// The value can also be changed from the UI (saved in this browser only).

const LOCAL = 'http://localhost:3000';
const DEPLOYED = 'https://student-identity.onrender.com';

const isLocalPage = ['localhost', '127.0.0.1', ''].includes(location.hostname);

export const DEFAULT_API_BASE = isLocalPage ? LOCAL : DEPLOYED;
export const PRESET_SERVERS = [
  { label: 'เครื่องตัวเอง (localhost:3000)', url: LOCAL },
  { label: 'Render (ออนไลน์)', url: DEPLOYED },
];

const STORAGE_KEY = 'si.apiBase';

export function apiBase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch (e) { /* storage blocked */ }
  return DEFAULT_API_BASE;
}

export function setApiBase(url) {
  const clean = String(url || '').trim().replace(/\/+$/, '');
  try {
    if (!clean || clean === DEFAULT_API_BASE) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, clean);
  } catch (e) { /* storage blocked */ }
}
