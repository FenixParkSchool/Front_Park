import { vacancies, totalVacancies } from './state.js';

const icons = { Diretoria: 'fa-building', PCD: 'fa-wheelchair', Visitantes: 'fa-user', Funcionários: 'fa-car' };
const statusLabel = (status) => ({ occupied: 'Ocupada', reserved: 'Reservada', available: 'Disponível' }[status] || 'Disponível');

export function updateMetrics() {
  const occupied = vacancies.filter((item) => ['occupied', 'reserved'].includes(item.status)).length;
  const pending = document.querySelectorAll('#listaNotificacoes .notification-item').length;
  const values = { totalVagas: totalVacancies, vagasDisponiveis: vacancies.filter((item) => item.status === 'available').length, vagasOcupadas: occupied, visitasPendentes: pending, badgeNotificacoes: pending };
  Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = String(value); });
}

export function renderVacancies({ showToast, onChanged = () => { } }) {
  const container = document.getElementById('containerVagas');
  if (!container) return;
  const search = document.getElementById('buscaVaga')?.value.trim() || '';
  const filter = document.getElementById('filtroTipo')?.value || 'todos';
  const filtered = vacancies.filter((vacancy) => (!search || String(vacancy.number).includes(search)) && (filter === 'todos' || vacancy.type === filter));
  container.innerHTML = filtered.map((vacancy) => {
    const statusIcon = vacancy.status === 'available' ? 'fa-check' : vacancy.status === 'reserved' ? 'fa-calendar-check' : 'fa-car';
    return `<button type="button" class="vaga-card ${vacancy.status}" data-vaga="${vacancy.number}" aria-label="Vaga ${String(vacancy.number).padStart(2, '0')}: ${statusLabel(vacancy.status)}">
      <span class="vaga-card-top"><span class="vaga-type">${vacancy.type}</span><i class="fa-solid ${icons[vacancy.type] || 'fa-car'}" aria-hidden="true"></i></span>
      <strong>${String(vacancy.number).padStart(2, '0')}</strong><span class="vaga-status"><i class="fa-solid ${statusIcon}" aria-hidden="true"></i> ${statusLabel(vacancy.status)}</span>
      ${vacancy.plate ? `<small>${vacancy.plate}</small>` : ''}</button>`;
  }).join('');
  container.onclick = (event) => {
    const card = event.target.closest('[data-vaga]');
    if (!card) return;
    const vacancy = vacancies.find((item) => item.number === Number(card.dataset.vaga));
    if (!vacancy) return;
    vacancy.status = vacancy.status === 'available' ? 'occupied' : 'available';
    vacancy.plate = vacancy.status === 'occupied' ? 'MANUAL' : '';
    showToast(`Vaga ${String(vacancy.number).padStart(2, '0')} ${vacancy.status === 'occupied' ? 'ocupada' : 'liberada'}.`);
    renderVacancies({ showToast, onChanged });
    updateMetrics();
    onChanged();
  };
}
