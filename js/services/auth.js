export { API_BASE_URL, api } from '../api.js';
export { logout } from '../sessao.js';

const loginDestinations = {
  ADMINISTRADOR: 'admin.html',
  VIGILANTE: 'tela-vigilante.html',
  FUNCIONARIO: 'perfil.html',
};

export const loginDestinationForProfile = (perfil) => {
  const normalizedProfile = perfil === 'ADMIN' ? 'ADMINISTRADOR' : perfil;
  return Object.hasOwn(loginDestinations, normalizedProfile) ? loginDestinations[normalizedProfile] : null;
};
