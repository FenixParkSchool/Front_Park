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


    // ---------- F15: registrar entrada ----------
  const painel = $('painelEntrada');
  const campoPlaca = $('placaEntrada');
  const avisoEntrada = $('entradaAviso');
  const botaoEntrada = $('btnRegistrarEntrada');
  const pad2 = (n) => String(n ?? '?').padStart(2, '0');

  // Reserva de hoje da vaga (a mais cedo que ainda não terminou).
  // O servidor decide se ela autoriza a entrada (confirmada, placa, vaga).
  const reservaDaVaga = (vaga) =>
    vaga.estadoAtual === 'RESERVADA'
      ? state.reservas.find((r) => r.numeroVaga === vaga.numeroVaga)
      : null;

  const limparSelecao = () => {
    state.vagaSelecionada = null;
    if (painel) painel.hidden = true;
    if (campoPlaca) campoPlaca.value = '';
    if (avisoEntrada) avisoEntrada.textContent = '';
    renderVacancies();
  };

  const selecionarVaga = (card) => {
    const vaga = state.vagas.find((v) => v.idVaga === Number(card.dataset.idVaga));
    if (!vaga) return;
    if (vaga.estadoAtual === 'OCUPADA') {
      showToast(`Vaga ${pad2(vaga.numeroVaga)} já está ocupada.`);
      return;
    }
    if (vaga.estadoAtual === 'INDISPONIVEL') {
      showToast(`Vaga ${pad2(vaga.numeroVaga)} está indisponível.`);
      return;
    }

    const reserva = reservaDaVaga(vaga);
    state.vagaSelecionada = vaga.idVaga;
    $('entradaVaga').textContent = `Vaga ${pad2(vaga.numeroVaga)}`;
    campoPlaca.value = reserva?.placa ?? '';
    avisoEntrada.textContent = reserva
      ? 'Vaga reservada: a entrada será vinculada à reserva.'
      : '';
    painel.hidden = false;
    campoPlaca.focus();
    renderVacancies();
  };

  $('btnCancelarEntrada')?.addEventListener('click', limparSelecao);

  $('formEntrada')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const vaga = state.vagas.find((v) => v.idVaga === state.vagaSelecionada);
    if (!vaga) return;

    const placa = campoPlaca.value.trim();
    if (!placa) {
      showToast('Informe a placa do veículo.');
      return;
    }

    // Só idVaga, placa e (se houver) idReservaVaga. Data/hora e responsável são do servidor.
    const corpo = { idVaga: vaga.idVaga, placa };
    const reserva = reservaDaVaga(vaga);
    if (reserva) corpo.idReservaVaga = reserva.id;

    botaoEntrada.disabled = true;
    try {
      await api('/movimentacoes', { method: 'POST', body: JSON.stringify(corpo) });
      showToast(`Entrada registrada na vaga ${pad2(vaga.numeroVaga)}.`);
      limparSelecao();
      await refresh();
    } catch (error) {
      // Erro: mantém o painel e a placa como estavam.
      showToast(error.message || 'Não foi possível registrar a entrada.');
    } finally {
      botaoEntrada.disabled = false;
    }
  });

  const mapa = $('containerVagas');
  mapa?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-id-vaga]');
    if (card) selecionarVaga(card);
  });
  mapa?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-id-vaga]');
    if (!card) return;
    event.preventDefault();
    selecionarVaga(card);
  });
}