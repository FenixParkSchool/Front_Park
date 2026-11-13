//Arquivo:Front_Park/js/pages/vigilante/notifications.js
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';
import { state } from './state.js';
 
const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada' };
const pad = (n) => String(n).padStart(2, '0');
const initials = (nome) => (nome || 'V').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const knownIds = new Set();
let primeira = true;
 
const erros = new Map(); // idReservaVaga -> mensagem da última tentativa que falhou
const enviando = new Set(); // idReservaVaga com a decisão em andamento
 
export const ehPendente = (r) => r.tipo === 'VISITA' && r.status === 'PENDENTE';
 
function itemHtml(r) {
  const visita = r.tipo === 'VISITA';
  const pendente = ehPendente(r);
  const ocupado = enviando.has(r.id);
  const erro = erros.get(r.id);
  const quem = visita && r.visitante
    ? `<p><i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(r.visitante.nome)} · ${escapeHtml(r.visitante.telefone)}</p>`
    : '';
  const acoes = pendente
    ? `<div class="notification-actions">
        <button class="accept-btn" type="button" data-decisao="CONFIRMADA" data-id="${r.id}" ${ocupado ? 'disabled' : ''}>
          <i class="fa-solid fa-check" aria-hidden="true"></i> ${ocupado ? 'Salvando...' : 'Confirmar'}
        </button>
        <button class="btn btn-sm btn-outline-danger ms-2" type="button" data-decisao="RECUSADA" data-id="${r.id}" ${ocupado ? 'disabled' : ''}>
          <i class="fa-solid fa-xmark" aria-hidden="true"></i> Recusar
        </button>
      </div>`
    : '';
  return `<article class="notification-item">
    <div class="notification-avatar">${visita ? escapeHtml(initials(r.visitante?.nome)) : '<i class="fa-solid fa-calendar-day" aria-hidden="true"></i>'}</div>
    <div class="notification-content">
      <div><b>Vaga ${pad(r.numeroVaga)}</b> <span class="time">${escapeHtml(r.entrada)} – ${escapeHtml(r.saida)}</span></div>
      ${quem}
      <p>${escapeHtml(r.motivo)}</p>
      ${r.placa ? `<small><i class="fa-solid fa-car" aria-hidden="true"></i> <b>${escapeHtml(r.placa)}</b></small>` : ''}
      <div><span class="badge text-bg-light border text-secondary">${visita ? `Visita · ${escapeHtml(STATUS[r.status] ?? r.status ?? '')}` : 'Outra ocasião'}</span></div>
      ${erro ? `<p class="text-danger mb-1" role="alert"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ${escapeHtml(erro)}</p>` : ''}
      ${acoes}
    </div>
  </article>`;
}
 
// Grava a decisão no servidor. A tela só muda depois do 200: o refresh recarrega tudo da API.
// Se falhar, o item continua na lista, com a mensagem de erro, e nada é alterado localmente.
async function decidir(id, decisao, context) {
  const reserva = state.reservas.find((r) => r.id === id);
  if (!reserva || !ehPendente(reserva) || enviando.has(id)) return;
 
  if (decisao === 'RECUSADA' && !window.confirm(
    `Recusar a visita de ${reserva.visitante?.nome ?? 'visitante'} na vaga ${pad(reserva.numeroVaga)}?`,
  )) return;
 
  enviando.add(id);
  erros.delete(id);
  renderNotifications(context);
  try {
    await api(`/reserva-vagas/${id}`, { method: 'PUT', body: JSON.stringify({ statusVisita: decisao }) });
    enviando.delete(id);
    context.showToast(decisao === 'CONFIRMADA' ? 'Visita confirmada.' : 'Visita recusada.');
    await context.refresh(); // pendências, mapa e indicadores vêm do que ficou gravado
  } catch (error) {
    enviando.delete(id);
    erros.set(id, error.message || 'Não foi possível registrar a decisão. Tente novamente.');
    renderNotifications(context);
  }
}
 
export function renderNotifications(context) {
  const list = document.getElementById('listaNotificacoes');
  if (!list) return;
 
  if (state.erroReservas) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHtml(state.erroReservas)}</p></div>`;
    return;
  }
 
  // erros de itens que já saíram da lista não precisam ser lembrados
  for (const id of [...erros.keys()]) {
    if (!state.reservas.some((r) => r.id === id)) erros.delete(id);
  }
 
  if (!state.reservas.length) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-double"></i><p>Nenhuma reserva para hoje.</p></div>';
  } else {
    const pendentes = state.reservas.filter(ehPendente);
    const demais = state.reservas.filter((r) => !ehPendente(r));
    list.innerHTML =
      (pendentes.length
        ? `<h3 class="h6 mb-2">Aguardando decisão (${pendentes.length})</h3>${pendentes.map(itemHtml).join('')}`
        : '<p class="form-text mb-2">Nenhuma visita aguardando decisão.</p>')
      + (demais.length
        ? `<h3 class="h6 mt-3 mb-2">Reservas de hoje</h3>${demais.map(itemHtml).join('')}`
        : '');
  }
 
  list.onclick = (event) => {
    const button = event.target.closest('[data-decisao]');
    if (button) decidir(Number(button.dataset.id), button.dataset.decisao, context);
  };
 
  const novas = state.reservas.filter((r) => !knownIds.has(r.id));
  if (!primeira && novas.length) context.showToast(`Nova reserva para hoje: vaga ${pad(novas[0].numeroVaga)}.`);
  state.reservas.forEach((r) => knownIds.add(r.id));
  primeira = false;
}