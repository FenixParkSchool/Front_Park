//Arquivo:Front_Park/js/pages/vigilante/index.js
import { api } from '../../services/auth.js';
import { initVigilanteActions } from './actions.js';
import { renderNotifications } from './notifications.js';
import { loadReservas } from './reservations.js';
import { loadVagas, renderVacancies, updateMetrics } from './vacancies.js';
import { state } from './state.js';

const REFRESH_MS = 60_000;

export function init() {
  const toast = document.getElementById('toast');
  const showToast = (message) => {
    if (!toast) return;
    const text = toast.querySelector('span');
    if (text) text.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2800);
  };
  const context = { showToast };

  const refresh = async () => {
    await loadVagas(); // vagas primeiro: as reservas usam o número da vaga
    await loadReservas();
    state.carregando = false;
    renderVacancies();
    renderNotifications(context);
    updateMetrics();
  };

  // nome da conta logada
  api('/me').then((me) => {
    const nome = me?.user?.username ?? me?.username ?? 'Vigilante';
    const strong = document.querySelector('.nav-user-info strong');
    const avatar = document.querySelector('.nav-user-avatar');
    if (strong) strong.textContent = nome;
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();
  }).catch(() => {});

  initVigilanteActions({ refresh, showToast }); // <-- agora com showToast
  renderVacancies(); // mostra "Carregando..."
  updateMetrics();
  refresh();
  window.setInterval(refresh, REFRESH_MS);
}
// (nada depois do fechamento do init)