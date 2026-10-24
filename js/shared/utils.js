export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export const normalizePlate = (value = '') => String(value).replace(/[^a-z0-9]/gi, '').toUpperCase();

export const isValidPlate = (value = '') => {
  const plate = normalizePlate(value);
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate) || /^[A-Z]{3}[0-9]{4}$/.test(plate);
};
