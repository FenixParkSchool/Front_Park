// Arquivo: Front_Park/js/shared/utils.js
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export const normalizePlate = (value = '') => String(value).replace(/[^a-z0-9]/gi, '').toUpperCase();

// Definida antes de ser utilizada na função isValidPlate
export const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export const isValidPlate = (value = '') => {
  const plate = normalizePlate(value);
  return PLATE_REGEX.test(plate); // Corrigido de .text para .test
};
 
export function maskPlate(value) {
  const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let out = '';
  for (const ch of raw) {
    const i = out.length;
    if (i >= 7) break;
    const isLetter = /[A-Z]/.test(ch);
    const isDigit = /[0-9]/.test(ch);
    const ok = i < 3 ? isLetter : (i === 3 || i >= 5) ? isDigit : (isLetter || isDigit);
    if (ok) out += ch;
  }
  return out;
}