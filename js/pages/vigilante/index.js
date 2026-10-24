import { initVigilanteActions } from './actions.js';
import { renderNotifications } from './notifications.js';
import { renderVacancies, updateMetrics } from './vacancies.js';

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
  renderNotifications(context);
  updateMetrics();
}
