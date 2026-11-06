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

  const alternarVaga = async (card) => {
    const vaga = state.vagas.find((v) => v.idVaga === Number(card.dataset.idVaga));
    if (!vaga) return;
    if (vaga.estadoAtual === 'OCUPADA') {
      showToast(`Vaga ${vaga.numeroVaga} está ocupada e não pode ser desativada.`);
      return;
    }
    const ativar = vaga.estadoAtual === 'INDISPONIVEL';
    if (!ativar && !window.confirm(`Marcar a vaga ${vaga.numeroVaga} como indisponível?`)) return;

    try {
      await api(`/vagas/${vaga.idVaga}/disponibilidade`, {
        method: 'PATCH',
        body: JSON.stringify({ ativa: ativar }),
      });
      showToast(`Vaga ${vaga.numeroVaga} ${ativar ? 'ativada' : 'desativada'}.`);
      await refresh();
    } catch (error) {
      showToast(error.message || 'Não foi possível alterar a vaga.');
    }
  };

  const mapa = $('containerVagas');
  mapa?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-id-vaga]');
    if (card) alternarVaga(card);
  });
  mapa?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-id-vaga]');
    if (!card) return;
    event.preventDefault();
    alternarVaga(card);
  });
}