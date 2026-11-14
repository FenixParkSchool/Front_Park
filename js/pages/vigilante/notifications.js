//Arquivo: Front_Park/js/pages/vigilante/notifications.js
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';
import { state } from './state.js';
 
const pad = (n) => String(n).padStart(2, '0');
const initials = (nome) => (nome || 'V').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const knownIds = new Set();
let primeira = true;
 
const erros = new Map();    // id -> mensagem da última falha
const enviando = new Set(); // ids com a marcação em andamento
 
function itemHtml(r) {
  const visita = r.tipo === 'VISITA';
  const ocupado = enviando.has(r.id);
  const erro = erros.get(r.id);
 
  const quem = visita && r.visitante
    ? `<p><i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(r.visitante.nome)} · ${escapeHtml(r.visitante.telefone)}</p>`
    : '';
 
  const botao = r.visto
    ? `<button class="btn btn-sm btn-outline-secondary" type="button" data-visto="false" data-id="${r.id}" ${ocupado ? 'disabled' : ''}>
         <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Desfazer
       </button>`
    : `<button class="accept-btn" type="button" data-visto="true" data-id="${r.id}" ${ocupado ? 'disabled' : ''}>
         <i class="fa-solid fa-check" aria-hidden="true"></i> ${ocupado ? 'Salvando...' : 'Vaga sinalizada'}
       </button>`;
 
  return `<article class="notification-item${r.visto ? ' is-done' : ''}">
    <div class="notification-avatar">${visita ? escapeHtml(initials(r.visitante?.nome)) : '<i class="fa-solid fa-calendar-day" aria-hidden="true"></i>'}</div>
    <div class="notification-content">
      <div><b>Vaga ${pad(r.numeroVaga)}</b> <span class="time">${escapeHtml(r.entrada)} – ${escapeHtml(r.saida)}</span></div>
      ${quem}
      <p>${escapeHtml(r.motivo)}</p>
      ${r.placa ? `<small><i class="fa-solid fa-car" aria-hidden="true"></i> <b>${escapeHtml(r.placa)}</b></small>` : ''}
      <div><span class="badge text-bg-light border text-secondary">${visita ? 'Visita' : 'Outra ocasião'}${r.visto ? ' · Sinalizada' : ''}</span></div>
      ${erro ? `<p class="text-danger mb-1" role="alert"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ${escapeHtml(erro)}</p>` : ''}
      <div class="notification-actions">${botao}</div>
    </div>
  </article>`;
}
 
// Grava o visto no servidor. A tela só muda depois do 200: o refresh recarrega tudo da API.
async function marcar(id, visto, context) {
  if (enviando.has(id)) return;
  enviando.add(id);
  erros.delete(id);
  renderNotifications(context);
  try {
    await api(`/reserva-vagas/${id}/visto`, { method: 'PATCH', body: JSON.stringify({ visto }) });
    enviando.delete(id);
    await context.refresh();
  } catch (error) {
    enviando.delete(id);
    erros.set(id, error.message || 'Não foi possível registrar. Tente novamente.');
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
    const aSinalizar = state.reservas.filter((r) => !r.visto);
    const feitas = state.reservas.filter((r) => r.visto);
    list.innerHTML =
      (aSinalizar.length
        ? `<h3 class="h6 mb-2">Para sinalizar (${aSinalizar.length})</h3>${aSinalizar.map(itemHtml).join('')}`
        : '<p class="form-text mb-2">Todas as reservas de hoje já foram sinalizadas.</p>')
      + (feitas.length
        ? `<h3 class="h6 mt-3 mb-2">Já sinalizadas</h3>${feitas.map(itemHtml).join('')}`
        : '');
  }
 
  list.onclick = (event) => {
    const button = event.target.closest('[data-visto]');
    if (button) marcar(Number(button.dataset.id), button.dataset.visto === 'true', context);
  };
 
  const novas = state.reservas.filter((r) => !knownIds.has(r.id));
  if (!primeira && novas.length) context.showToast(`Nova reserva para hoje: vaga ${pad(novas[0].numeroVaga)}.`);
  state.reservas.forEach((r) => knownIds.add(r.id));
  primeira = false;
}