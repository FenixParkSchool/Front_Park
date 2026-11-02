import { vacancies } from './state.js';
import { updateMetrics, renderVacancies } from './vacancies.js';
import { loadTodayReservations } from './reservations.js';
import { escapeHtml } from '../../shared/utils.js';

const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada' };

let items = [];
let loadError = null;
let firstLoad = true;
const knownIds = new Set(); // para avisar só o que chegou depois da primeira carga
const markedOnMap = new Set(); // reservas já marcadas no mapa nesta sessão

const initials = (name) => (name || 'V').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const pad = (n) => String(n).padStart(2, '0');

function itemHtml(item) {
  const isVisit = item.tipo === 'VISITA';
  const done = markedOnMap.has(item.id);
  const person = isVisit && item.visitante
    ? `<p><i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(item.visitante.nome)} · ${escapeHtml(item.visitante.telefone)}</p>
       <p>${escapeHtml(item.motivo)}</p>`
    : `<p>Outra ocasião: ${escapeHtml(item.motivo)}</p>`;
  const car = isVisit && item.veiculo
    ? `<small><i class="fa-solid fa-car" aria-hidden="true"></i> ${escapeHtml(item.veiculo.tipo)} ${escapeHtml(item.veiculo.modelo)} · ${escapeHtml(item.veiculo.cor)} · ${escapeHtml(item.veiculo.ano)} · <b>${escapeHtml(item.veiculo.placa)}</b></small>`
    : '';
  const badge = isVisit ? `Visita · ${escapeHtml(STATUS[item.status] ?? item.status ?? '')}` : 'Outra ocasião';

  return `<article class="notification-item">
    <div class="notification-avatar">${isVisit ? escapeHtml(initials(item.visitante?.nome)) : '<i class="fa-solid fa-calendar-day" aria-hidden="true"></i>'}</div>
    <div class="notification-content">
      <div><b>Reservar a vaga ${pad(item.numeroVaga)}</b> <span class="time">${escapeHtml(item.horaEntrada)} – ${escapeHtml(item.horaSaida)}</span></div>
      ${person}
      ${car}
      <div><span class="badge text-bg-light border text-secondary">${badge}</span></div>
      <div class="notification-actions">
        <button class="accept-btn" type="button" data-reserva-action="reservar" data-id="${item.id}" ${done ? 'disabled' : ''}>
          <i class="fa-solid fa-check" aria-hidden="true"></i> ${done ? 'Reservada no mapa' : 'Reservar vaga'}
        </button>
      </div>
    </div>
  </article>`;
}

// Desenha a partir do que já foi carregado (usado também após ocupar/liberar vagas).
export function renderNotifications(context) {
  const list = document.getElementById('listaNotificacoes');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = loadError
      ? `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHtml(loadError)}</p></div>`
      : '<div class="empty-state"><i class="fa-solid fa-check-double"></i><p>Nenhuma vaga reservada para hoje.</p></div>';
    updateMetrics();
    return;
  }

  list.innerHTML = items.map(itemHtml).join('');

  list.onclick = (event) => {
    const button = event.target.closest('[data-reserva-action="reservar"]');
    if (!button) return;
    const item = items.find((entry) => String(entry.id) === button.dataset.id);
    if (!item || markedOnMap.has(item.id)) return;

    const vacancy = vacancies.find((entry) => Number(entry.number) === Number(item.numeroVaga));
    if (!vacancy) {
      context.showToast(`A vaga ${pad(item.numeroVaga)} não está no mapa.`);
      return;
    }
    vacancy.status = 'reserved';
    vacancy.plate = item.placa || '';
    markedOnMap.add(item.id);

    context.showToast(`Vaga ${pad(item.numeroVaga)} reservada no mapa.`);
    renderVacancies(context);
    renderNotifications(context);
    updateMetrics();
  };

  updateMetrics();
}

// Busca as reservas de hoje na API e redesenha. Avisa com um toast quando chega uma nova.
export async function refreshNotifications(context) {
  try {
    items = await loadTodayReservations();
    loadError = null;
    const fresh = items.filter((item) => !knownIds.has(item.id));
    if (!firstLoad && fresh.length) {
      context.showToast(`Nova reserva para hoje: vaga ${pad(fresh[0].numeroVaga)}.`);
    }
    items.forEach((item) => knownIds.add(item.id));
    firstLoad = false;
  } catch (error) {
    loadError = error.message || 'Não foi possível carregar as reservas de hoje.';
  }
  renderNotifications(context);
}