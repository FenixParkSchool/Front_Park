
import { vacancies, visits } from './state.js';
import { updateMetrics, renderVacancies } from './vacancies.js';
import { visitsRepo } from '../../services/repositories.js';

export function renderNotifications(context) {
  const list = document.getElementById('listaNotificacoes');

  if (!list) return;

  const pending = visits.filter(
    (visit) => visit.status === 'pending'
  );

  if (!pending.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-check-double"></i>
        <p>Sem visitas pendentes.</p>
      </div>
    `;

    updateMetrics();
    return;
  }

  list.innerHTML = pending.map((visit) => `
    <article class="notification-item">
      <div class="notification-avatar">
        ${(visit.nome || 'V').split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()}
      </div>

      <div class="notification-content">
        <div>
          <b>${visit.nome || 'Visitante'}</b>
          <span class="time">${visit.entrada || 'Hoje'}</span>
        </div>

        <p>${visit.motivo || ''}</p>

        <small>
          <i class="fa-solid fa-car"></i>
          ${visit.placa || ''}
        </small>

        <div class="notification-actions">
          <button
            class="accept-btn"
            type="button"
            data-visit-action="confirmar"
            data-id="${visit.id}"
          >
            <i class="fa-solid fa-check"></i>
            Confirmar
          </button>
        </div>
      </div>
    </article>
  `).join('');

  list.onclick = (event) => {
    const button = event.target.closest('[data-visit-action]');

    if (!button) return;

    const visit = visits.find(
      (item) => String(item.id) === button.dataset.id
    );

    if (!visit || visit.status !== 'pending') return;

    visit.status = 'confirmed';

    const vacancy = vacancies.find(
      (item) => Number(item.number) === Number(visit.vaga)
    );

    if (vacancy) {
      vacancy.status = 'reserved';
      vacancy.plate = visit.placa || '';
    }

    visitsRepo.save(visits);

    context.showToast('Visita confirmada.');

    renderVacancies(context);
    renderNotifications(context);
    updateMetrics();
  };

  updateMetrics();
}
