//Arquivo:Front_Park/js/pages/vigilante/notifications.js
import { escapeHtml } from '../../shared/utils.js';
import { state } from './state.js';

const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada' };
const pad = (n) => String(n).padStart(2, '0');
const initials = (nome) => (nome || 'V').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const knownIds = new Set();
let primeira = true;

export function renderNotifications(context) {
  const list = document.getElementById('listaNotificacoes');
  if (!list) return;

  if (state.erroReservas) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHtml(state.erroReservas)}</p></div>`;
    return;
  }
  if (!state.reservas.length) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-double"></i><p>Nenhuma reserva para hoje.</p></div>';
  } else {
    list.innerHTML = state.reservas.map((r) => {
      const visita = r.tipo === 'VISITA';
      const quem = visita && r.visitante
        ? `<p><i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(r.visitante.nome)} · ${escapeHtml(r.visitante.telefone)}</p>`
        : '';
      return `<article class="notification-item">
        <div class="notification-avatar">${visita ? escapeHtml(initials(r.visitante?.nome)) : '<i class="fa-solid fa-calendar-day" aria-hidden="true"></i>'}</div>
        <div class="notification-content">
          <div><b>Vaga ${pad(r.numeroVaga)}</b> <span class="time">${escapeHtml(r.entrada)} – ${escapeHtml(r.saida)}</span></div>
          ${quem}
          <p>${escapeHtml(r.motivo)}</p>
          ${r.placa ? `<small><i class="fa-solid fa-car" aria-hidden="true"></i> <b>${escapeHtml(r.placa)}</b></small>` : ''}
          <div><span class="badge text-bg-light border text-secondary">${visita ? `Visita · ${escapeHtml(STATUS[r.status] ?? r.status ?? '')}` : 'Outra ocasião'}</span></div>
        </div>
      </article>`;
    }).join('');
  }

  const novas = state.reservas.filter((r) => !knownIds.has(r.id));
  if (!primeira && novas.length) context.showToast(`Nova reserva para hoje: vaga ${pad(novas[0].numeroVaga)}.`);
  state.reservas.forEach((r) => knownIds.add(r.id));
  primeira = false;
}