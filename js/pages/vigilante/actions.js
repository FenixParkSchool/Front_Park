//Arquivo:Front_Park/js/pages/vigilante/actions.js
import { api } from '../../services/auth.js';
import { renderVacancies } from './vacancies.js';
import { state } from './state.js';

export function initVigilanteActions({ refresh, showToast }) {
  const $ = (id) => document.getElementById(id);
  $('buscaVaga')?.addEventListener('input', renderVacancies);
  $('filtroTipo')?.addEventListener('change', renderVacancies);
  $('btnAtualizar')?.addEventListener('click', refresh);
  $('btnVerReservas')?.addEventListener('click', (event) => {
    state.filtroEstado = state.filtroEstado ? null : 'RESERVADA';
    event.currentTarget.setAttribute('aria-pressed', String(Boolean(state.filtroEstado)));
    renderVacancies();
  });

  const alternarOcupacao = async (card) => {
    const vaga = state.vagas.find((v) => v.idVaga === Number(card.dataset.idVaga));
    if (!vaga) return;
    const ocupar = vaga.estadoAtual !== 'OCUPADA';

    try {
      await api(`/vagas/${vaga.idVaga}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ ocupada: ocupar }),
      });
      await refresh();
    } catch (error) {
      showToast(error.message || 'Não foi possível alterar a vaga.');
    }
  };

  const mapa = $('containerVagas');
  mapa?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-id-vaga]');
    if (card) alternarOcupacao(card);
  });
  mapa?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-id-vaga]');
    if (!card) return;
    event.preventDefault();
    alternarOcupacao(card);
  });
}