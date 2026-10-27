import { api } from '../api.js';

export { API_BASE_URL, api } from '../api.js';

const loginDestinations = {
  ADMINISTRADOR: 'admin.html',
  VIGILANTE: 'tela-vigilante.html',
  FUNCIONARIO: 'perfil.html',
};

export const loginDestinationForProfile = (perfil) => {
  const normalizedProfile = perfil === 'ADMIN' ? 'ADMINISTRADOR' : perfil;
  return Object.hasOwn(loginDestinations, normalizedProfile) ? loginDestinations[normalizedProfile] : null;
};

export async function logout() {
  await api('/logout', { method: 'POST' });
  sessionStorage.clear();
  location.replace('login.html');
}
