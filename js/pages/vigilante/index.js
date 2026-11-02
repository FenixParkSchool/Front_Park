import { initVigilanteActions } from './actions.js';
import { refreshNotifications } from './notifications.js';
import { renderVacancies, updateMetrics } from './vacancies.js';

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
  initVigilanteActions(context);
  renderVacancies(context);
  updateMetrics();
  refreshNotifications(context);
  // reservas novas ou que terminaram: atualiza sozinho, sem precisar de F5
  window.setInterval(() => refreshNotifications(context), REFRESH_MS);
}