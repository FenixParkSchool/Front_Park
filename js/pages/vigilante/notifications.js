import { vacancies } from './state.js';
import { updateMetrics, renderVacancies } from './vacancies.js';
import { loadTodayReservations } from './reservations.js';
import { escapeHtml } from '../../shared/utils.js';

const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada' };

let items = [];
let problems = [];
let loadError = null;
let firstLoad = true;
const knownIds = new Set(); // para avisar só o que chegou depois da primeira carga

// Reservas que o vigilante já marcou no mapa. Fica gravado no navegador (por dia): atualizar a página
// não desfaz a marcação. Cada item guarda o número da vaga para poder liberá-la quando a reserva acabar.
const pad = (n) => String(n).padStart(2, '0');
const storageKey = () => {
  const d = new Date();
  return `park_reservas_marcadas:${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
function loadMarked() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(storageKey()) || '{}');
    return new Map(Object.entries(raw).map(([id, value]) => [Number(id), value]));
  } catch {
    return new Map();
  }
}
function saveMarked() {
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(Object.fromEntries(markedOnMap)));
  } catch {
    // sem armazenamento disponível: a marcação vale só até atualizar a página
  }
}
const markedOnMap = loadMarked();

// Reaplica as marcações no mapa. Com prune=true, reservas que já terminaram ou foram recusadas
// saem da lista e a vaga volta a ficar disponível. Vaga ocupada manualmente nunca é sobrescrita.
function syncMap(prune) {
  const present = new Set(items.map((item) => item.id));
  const vacancyOf = (saved) => vacancies.find((entry) => Number(entry.number) === Number(saved.numero));
  if (prune) {
    for (const [id, saved] of [...markedOnMap]) {
      if (present.has(id)) continue;
      markedOnMap.delete(id);
      const vacancy = vacancyOf(saved);
      if (vacancy && vacancy.status === 'reserved') { vacancy.status = 'available'; vacancy.plate = ''; }
    }
  }
  for (const [, saved] of markedOnMap) {
    const vacancy = vacancyOf(saved);
    if (vacancy && vacancy.status === 'available') { vacancy.status = 'reserved'; vacancy.plate = saved.placa || ''; }
  }
  saveMarked();
}

const initials = (name) => (name || 'V').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const vagaLabel = (item) => (item.numeroVaga != null ? pad(item.numeroVaga) : `(ID ${item.idVaga})`);

function itemHtml(item) {
  const isVisit = item.tipo === 'VISITA';
  const done = markedOnMap.has(item.id);
  let person;
  if (!isVisit) {
    person = `<p>Outra ocasião: ${escapeHtml(item.motivo)}</p>`;
  } else if (item.visitante) {
    person = `<p><i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(item.visitante.nome)} · ${escapeHtml(item.visitante.telefone)}</p>
       <p>${escapeHtml(item.motivo)}</p>`;
  } else {
    person = `<p>Visita (dados do visitante indisponíveis)</p><p>${escapeHtml(item.motivo)}</p>`;
  }
  let car = '';
  if (isVisit && item.veiculo) {
    car = `<small><i class="fa-solid fa-car" aria-hidden="true"></i> ${escapeHtml(item.veiculo.tipo)} ${escapeHtml(item.veiculo.modelo)} · ${escapeHtml(item.veiculo.cor)} · ${escapeHtml(item.veiculo.ano)} · <b>${escapeHtml(item.veiculo.placa)}</b></small>`;
  } else if (isVisit && item.placa) {
    car = `<small><i class="fa-solid fa-car" aria-hidden="true"></i> Placa <b>${escapeHtml(item.placa)}</b></small>`;
  }
  const badge = isVisit ? `Visita · ${escapeHtml(STATUS[item.status] ?? item.status ?? '')}` : 'Outra ocasião';

  return `<article class="notification-item">
    <div class="notification-avatar">${isVisit && item.visitante ? escapeHtml(initials(item.visitante.nome)) : '<i class="fa-solid fa-calendar-day" aria-hidden="true"></i>'}</div>
    <div class="notification-content">
      <div><b>Reservar a vaga ${escapeHtml(vagaLabel(item))}</b> <span class="time">${escapeHtml(item.horaEntrada)} – ${escapeHtml(item.horaSaida)}</span></div>
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

  // diz exatamente qual rota foi negada ou falhou, em vez de esconder tudo atrás de um erro genérico
  const warning = problems.length
    ? `<p class="form-text text-danger mb-2">Não foi possível ler: ${problems.map((p) => escapeHtml(`${p.path} (${p.message})`)).join('; ')}</p>`
    : '';

  if (!items.length) {
    list.innerHTML = warning + (loadError
      ? `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHtml(loadError)}</p></div>`
      : '<div class="empty-state"><i class="fa-solid fa-check-double"></i><p>Nenhuma vaga reservada para hoje.</p></div>');
    updateMetrics();
    return;
  }

  list.innerHTML = warning + items.map(itemHtml).join('');

  list.onclick = (event) => {
    const button = event.target.closest('[data-reserva-action="reservar"]');
    if (!button) return;
    const item = items.find((entry) => String(entry.id) === button.dataset.id);
    if (!item || markedOnMap.has(item.id)) return;
    if (item.numeroVaga == null) {
      context.showToast('Número da vaga indisponível: a rota /vagas foi negada.');
      return;
    }

    const vacancy = vacancies.find((entry) => Number(entry.number) === Number(item.numeroVaga));
    if (!vacancy) {
      context.showToast(`A vaga ${pad(item.numeroVaga)} não está no mapa.`);
      return;
    }
    vacancy.status = 'reserved';
    vacancy.plate = item.placa || '';
    markedOnMap.set(item.id, { numero: item.numeroVaga, placa: item.placa || '' });
    saveMarked();

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
    const result = await loadTodayReservations();
    items = result.items;
    problems = result.problems;
    loadError = null;
    const fresh = items.filter((item) => !knownIds.has(item.id));
    if (!firstLoad && fresh.length) {
      context.showToast(`Nova reserva para hoje: vaga ${vagaLabel(fresh[0])}.`);
    }
    items.forEach((item) => knownIds.add(item.id));
    firstLoad = false;
    syncMap(true);
  } catch (error) {
    items = [];
    problems = [];
    loadError = error.message || 'Não foi possível carregar as reservas de hoje.';
    syncMap(false); // falha de rede: mantém o que já estava marcado, sem liberar nada
  }
  renderVacancies(context);
  renderNotifications(context);
}