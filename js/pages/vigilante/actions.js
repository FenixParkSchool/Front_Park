import { vacancies } from './state.js';
import { renderVacancies, updateMetrics } from './vacancies.js';
import { renderNotifications } from './notifications.js';

export function initVigilanteActions(context) {
  const act = (name) => {
    if (name === 'reservas') {
      const filter = document.getElementById('filtroTipo');
      if (filter) filter.value = 'Visitantes';
      renderVacancies(context);
      context.showToast('Exibindo vagas reservadas para visitantes.');
      return;
    }
    const targetStatus = name === 'liberar' ? ['occupied', 'reserved'] : ['available'];
    const vacancy = vacancies.find((item) => targetStatus.includes(item.status));
    if (!vacancy) {
      context.showToast(name === 'liberar' ? 'Nenhuma vaga ocupada no momento.' : 'Nenhuma vaga disponível para ocupar.');
      return;
    }
    vacancy.status = name === 'liberar' ? 'available' : 'occupied';
    vacancy.plate = name === 'liberar' ? '' : 'MANUAL';
    renderVacancies(context);
    renderNotifications(context);
    updateMetrics();
    context.showToast(`Vaga ${String(vacancy.number).padStart(2, '0')} ${name === 'liberar' ? 'liberada' : 'ocupada'}.`);
  };

  document.getElementById('btnLiberar')?.addEventListener('click', () => act('liberar'));
  document.getElementById('btnOcupar')?.addEventListener('click', () => act('ocupar'));
  document.getElementById('btnVerReservas')?.addEventListener('click', () => act('reservas'));
  document.getElementById('buscaVaga')?.addEventListener('input', () => renderVacancies(context));
  document.getElementById('filtroTipo')?.addEventListener('change', () => renderVacancies(context));
}
