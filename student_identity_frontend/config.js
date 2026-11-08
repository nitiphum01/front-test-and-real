// Address of the Student Identity backend this site talks to.
// Production backend: https://student-identity.onrender.com
// To work against a backend on your own machine, change it to 'http://localhost:3000'.

export const API_BASE = 'https://student-identity.onrender.com';

export function apiBase() {
  return API_BASE;
}
