//Arquivo:Front_Park/js/pages/vigilante/actions.js
import { renderVacancies } from './vacancies.js';
import { state } from './state.js';

export function initVigilanteActions({ refresh }) {
  const $ = (id) => document.getElementById(id);
  $('buscaVaga')?.addEventListener('input', renderVacancies);
  $('filtroTipo')?.addEventListener('change', renderVacancies);
  $('btnAtualizar')?.addEventListener('click', refresh);
  $('btnVerReservas')?.addEventListener('click', (event) => {
    state.filtroEstado = state.filtroEstado ? null : 'RESERVADA';
    event.currentTarget.setAttribute('aria-pressed', String(Boolean(state.filtroEstado)));
    renderVacancies();
  });
}