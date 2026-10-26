export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'N?o foi poss?vel concluir a opera??o.'), { status: response.status });
  return data;
}
export const homeForRole = role => ({ ADMIN: 'admin.html', VIGILANTE: 'tela-vigilante.html', FUNCIONARIO: 'cadastro_veiculo.html' }[role] || 'login.html');
export async function guardPage(page) {
  const allowed = { admin: ['ADMIN'], vigilante: ['ADMIN', 'VIGILANTE'], cadastroVeiculo: ['FUNCIONARIO'], reserva: ['ADMIN'] }[page];
  if (!allowed) return true;
  document.body.style.visibility = 'hidden';
  try {
    const user = await api('/users');
    if (!allowed.includes(user.role)) { location.replace(homeForRole(user.role)); return false; }
    document.body.style.visibility = '';
    return true;
  } catch { location.replace('login.html'); return false; }
}
export async function logout() {
  await api('/logout', { method: 'POST' });
  sessionStorage.clear();
  location.replace('login.html');
}
