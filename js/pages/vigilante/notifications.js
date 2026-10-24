import { vacancies, visits } from './state.js';
import { updateMetrics, renderVacancies } from './vacancies.js';
import { visitsRepo } from '../../services/repositories.js';

export function renderNotifications(context) {
  const list = document.getElementById('listaNotificacoes');
  if (!list) return;
  const pending = visits.filter((visit) => visit.status === 'pending');
  if (!pending.length) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-double" aria-hidden="true"></i><p>Sem visitas pendentes.</p></div>';
    updateMetrics();
    return;
  }
  list.innerHTML = pending.map((visit) => `<article class="notification-item">
    <div class="notification-avatar">${(visit.nome || 'V').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
    <div class="notification-content"><div><b>${visit.nome || 'Visitante'}</b><span class="time">${visit.entrada || 'Hoje'}</span></div>
    <p>${visit.motivo || ''}</p><small><i class="fa-solid fa-car" aria-hidden="true"></i> ${visit.placa || ''}</small>
    <div class="notification-actions"><button class="accept-btn" type="button" data-visit-action="confirmar" data-id="${visit.id}"><i class="fa-solid fa-check" aria-hidden="true"></i> Confirmar</button>
    <button class="deny-btn" type="button" data-visit-action="recusar" data-id="${visit.id}">Recusar</button></div></div></article>`).join('');
  list.onclick = (event) => {
    const button = event.target.closest('[data-visit-action]');
    if (!button) return;
    const visit = visits.find((item) => String(item.id) === button.dataset.id);
    if (!visit) return;
    if (button.dataset.visitAction === 'confirmar') {
      visit.status = 'confirmed';
      const vacancy = vacancies.find((item) => item.number === visit.vaga);
      if (vacancy) { vacancy.status = 'reserved'; vacancy.plate = visit.placa || ''; }
      context.showToast('Visita confirmada.');
      renderVacancies(context);
    } else {
      visit.status = 'rejected';
      context.showToast('Visita recusada.');
    }
    visitsRepo.save(visits);
    renderNotifications(context);
    updateMetrics();
  };
  updateMetrics();
}
