//Arquivo: Front_Park/js/pages/reserva/index.js
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', RECUSADA: 'Recusada' };
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (value) => String(value ?? '').slice(0, 5);
const dayOf = (value) => String(value ?? '').slice(0, 10);
const formatDate = (iso) => {
  const [year, month, day] = dayOf(iso).split('-');
  return `${day}/${month}/${year}`;
};
// texto sem acento e em minúsculas, para a pesquisa
const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// data e hora de agora (relógio do computador), sempre recalculadas na hora de conferir
const nowParts = () => {
  const d = new Date();
  return {
    day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

export function init() {
  const $ = (id) => document.getElementById(id);
  const form = $('formReserva');
  const visitFields = $('campos-visita');
  const visitorSelect = $('reserva-visitante');
  const vehicleSelect = $('reserva-veiculo');
  const vagaSelect = $('reserva-vaga');
  const plate = $('reserva-placa');
  const reason = $('motivo_vaga');
  const reasonLabel = $('rotulo-motivo');
  const date = $('data_vaga');
  const start = $('hora_entrada');
  const end = $('hora_saida');
  const status = $('reserva-status');
  const list = $('lista-reservas');
  if (!form || !visitFields || !visitorSelect || !vehicleSelect || !vagaSelect || !plate || !reason || !date || !start || !end) return;

  const title = $('titulo-reserva');
  const submitBtn = form.querySelector('[type="submit"]');
  const resetBtn = $('btnLimpar_reserva');
  const submitDefault = submitBtn ? submitBtn.innerHTML : '';
  const resetDefault = resetBtn ? resetBtn.textContent : 'Limpar';
  const radios = [...document.querySelectorAll('input[name="reserva-tipo"]')];

  let vagas = [];
  let visitantes = [];
  let veiculos = [];
  let reservas = [];
  let editingId = null;       // id da reserva em edição
  let editingOriginal = null; // { date, start } da reserva em edição
  let listOpen = false;

  date.min = nowParts().day;

  /* ---------- Lista escondida + pesquisa e filtros ---------- */

  let panel = null;
  let toggleBtn = null;
  let searchInput = null;
  let dateFilter = null;
  let vagaFilter = null;
  let countText = null;

  if (list) {
    panel = document.createElement('div');
    panel.id = 'painel-reservas';
    panel.className = 'd-none';

    const filters = document.createElement('div');
    filters.className = 'mb-3';
    filters.style.maxWidth = '58rem';
    filters.innerHTML = `
      <div class="row g-2 align-items-end">
        <div class="col-12 col-lg-5">
          <label class="visually-hidden" for="busca-reservas">Pesquisar reservas</label>
          <div class="input-group ds-input-group">
            <span class="input-group-text border-end-0"><i class="bi bi-search" aria-hidden="true"></i></span>
            <input id="busca-reservas" type="search" class="form-control border-start-0 ps-0" placeholder="Pesquisar por vaga, visitante, placa ou motivo...">
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <label class="form-label small mb-1" for="filtro-data-reserva">Data</label>
          <input id="filtro-data-reserva" type="date" class="form-control">
        </div>
        <div class="col-6 col-lg-2">
          <label class="form-label small mb-1" for="filtro-vaga-reserva">Vaga</label>
          <select id="filtro-vaga-reserva" class="form-select"><option value="">Todas</option></select>
        </div>
        <div class="col-12 col-lg-2">
          <button type="button" id="limpar-filtros-reservas" class="btn ds-btn-outline w-100">Limpar filtros</button>
        </div>
      </div>
      <p id="contagem-reservas" class="form-text mt-2 mb-0" aria-live="polite"></p>`;

    list.before(panel);
    panel.append(filters, list);

    searchInput = filters.querySelector('#busca-reservas');
    dateFilter = filters.querySelector('#filtro-data-reserva');
    vagaFilter = filters.querySelector('#filtro-vaga-reserva');
    countText = filters.querySelector('#contagem-reservas');

    // botão "Ver reservas" no cabeçalho da seção
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn ds-btn-outline d-inline-flex align-items-center gap-2';
    toggleBtn.setAttribute('aria-controls', 'painel-reservas');
    const heading = panel.previousElementSibling;
    if (heading?.classList.contains('section-heading')) heading.append(toggleBtn);
    else panel.before(toggleBtn);
    toggleBtn.addEventListener('click', () => { listOpen = !listOpen; updateToggle(); });

    searchInput.addEventListener('input', () => renderList());
    dateFilter.addEventListener('change', () => renderList());
    vagaFilter.addEventListener('change', () => renderList());
    filters.querySelector('#limpar-filtros-reservas').addEventListener('click', () => {
      searchInput.value = '';
      dateFilter.value = '';
      vagaFilter.value = '';
      renderList();
    });
  }

  function updateToggle() {
    if (!toggleBtn || !panel) return;
    panel.classList.toggle('d-none', !listOpen);
    toggleBtn.setAttribute('aria-expanded', String(listOpen));
    toggleBtn.innerHTML = listOpen
      ? '<i class="bi bi-eye-slash" aria-hidden="true"></i> Ocultar reservas'
      : `<i class="bi bi-list-ul" aria-hidden="true"></i> Ver reservas (${reservas.length})`;
  }

  const say = (text = '', isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('text-danger', isError);
    status.dataset.past = '';
  };

  const mode = () => document.querySelector('input[name="reserva-tipo"]:checked')?.value ?? 'VISITA';

  // Visita mostra visitante/veículo; outra ocasião esconde e desativa esses campos.
  const applyMode = () => {
    const isVisit = mode() === 'VISITA';
    visitFields.classList.toggle('d-none', !isVisit);
    visitorSelect.disabled = !isVisit;
    vehicleSelect.disabled = !isVisit;
    reasonLabel.textContent = isVisit ? 'Motivo da visita' : 'Motivo / ocasião';
    reason.placeholder = isVisit ? 'Ex.: Reunião' : 'Ex.: Manutenção, evento, reforma...';
    say();
  };

  /* ---------- Conferência de data e horário ---------- */

  // Avisa quando a data ou o horário escolhido já passou.
  const pastError = () => {
    const { day, time } = nowParts();
    if (date.value && date.value < day) {
      return `A data ${formatDate(date.value)} já passou. Escolha hoje ou uma data futura.`;
    }
    if (date.value === day) {
      if (end.value && end.value <= time) {
        return `O horário de saída (${end.value}) já passou. Agora são ${time}.`;
      }
      // ao editar uma reserva em andamento, a entrada original pode continuar no passado
      const entradaInalterada = editingOriginal && editingOriginal.date === date.value && editingOriginal.start === start.value;
      if (start.value && start.value < time && !entradaInalterada) {
        return `O horário de entrada (${start.value}) já passou. Agora são ${time}; escolha um horário a partir de agora.`;
      }
    }
    return '';
  };

  const scheduleError = () => {
    if (!date.value) return 'Selecione a data da reserva.';
    if (!start.value || !end.value) return 'Informe o horário de entrada e de saída.';
    if (start.value >= end.value) return 'O horário de saída deve ser maior que o de entrada.';
    return pastError();
  };

  // aviso na hora em que o usuário escolhe a data ou o horário
  const liveCheck = () => {
    const message = pastError();
    if (message) {
      say(message, true);
      status.dataset.past = '1';
    } else if (status?.dataset.past === '1') {
      say();
    }
  };
  [date, start, end].forEach((input) => {
    input.addEventListener('change', liveCheck);
    input.addEventListener('input', liveCheck);
  });

  // só dá para editar reservas que ainda não terminaram
  const canEdit = (r) => {
    const { day, time } = nowParts();
    const reservaDia = dayOf(r.dataReserva);
    if (reservaDia > day) return true;
    if (reservaDia < day) return false;
    return hhmm(r.horaSaida) > time;
  };

  /* ---------- Opções e listas ---------- */

  const renderOptions = () => {
    visitorSelect.innerHTML = '<option value="">Selecione o visitante</option>' + visitantes.map((v) =>
      `<option value="${v.idVisitante}">${escapeHtml(v.nomeVisitante)}</option>`).join('');

    const ordenadas = vagas.slice().sort((a, b) => a.numeroVaga - b.numeroVaga);
    const optionsVagas = ordenadas
      .map((v) => `<option value="${v.idVaga}">Vaga ${escapeHtml(v.numeroVaga)}${v.tipoVaga ? ` · ${escapeHtml(v.tipoVaga)}` : ''}</option>`).join('');
    vagaSelect.innerHTML = '<option value="">Selecione a vaga</option>' + optionsVagas;

    if (vagaFilter) {
      const previous = vagaFilter.value;
      vagaFilter.innerHTML = '<option value="">Todas</option>' + ordenadas
        .map((v) => `<option value="${v.idVaga}">Vaga ${escapeHtml(v.numeroVaga)}</option>`).join('');
      vagaFilter.value = previous;
    }
    fillVehicles();
  };

  // veículos filtrados pelo visitante selecionado
  const fillVehicles = () => {
    const visitorId = Number(visitorSelect.value);
    const doVisitante = visitorId ? veiculos.filter((v) => v.idVisitante === visitorId) : [];
    vehicleSelect.innerHTML = (visitorId
      ? (doVisitante.length ? '<option value="">Selecione o veículo</option>' : '<option value="">Este visitante não tem veículo cadastrado</option>')
      : '<option value="">Selecione o visitante primeiro</option>')
      + doVisitante.map((v) => `<option value="${v.idVeiculoVisitante}">${escapeHtml(v.modeloVeiculoVisitante)} · ${escapeHtml(v.placaVeiculoVisitante)}</option>`).join('');
    plate.value = '';
  };

  // reservas com as datas mais recentes primeiro (e, no mesmo dia, o horário mais tarde primeiro)
  const sortedReservas = () => reservas.slice().sort((a, b) => {
    const keyA = `${dayOf(a.dataReserva)} ${hhmm(a.horaEntrada)}`;
    const keyB = `${dayOf(b.dataReserva)} ${hhmm(b.horaEntrada)}`;
    return keyB.localeCompare(keyA);
  });

  const matchesFilters = (r) => {
    if (dateFilter?.value && dayOf(r.dataReserva) !== dateFilter.value) return false;
    if (vagaFilter?.value && String(r.idVaga) !== vagaFilter.value) return false;
    const term = normalize(searchInput?.value.trim());
    if (term) {
      const vaga = vagas.find((v) => v.idVaga === r.idVaga);
      const visitante = visitantes.find((v) => v.idVisitante === r.idVisitante);
      const haystack = normalize([
        `vaga ${vaga?.numeroVaga ?? r.idVaga}`,
        visitante?.nomeVisitante,
        r.placaReserva,
        r.motivoReserva,
        formatDate(r.dataReserva),
      ].join(' '));
      if (!haystack.includes(term)) return false;
    }
    return true;
  };

  function renderList() {
    updateToggle();
    if (!list) return;
    if (!reservas.length) {
      if (countText) countText.textContent = '';
      list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma reserva cadastrada.</p>';
      return;
    }
    const shown = sortedReservas().filter(matchesFilters);
    if (countText) countText.textContent = `${shown.length} de ${reservas.length} reserva(s)`;
    if (!shown.length) {
      list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma reserva encontrada com esses filtros.</p>';
      return;
    }
    list.innerHTML = shown.map((r) => {
      const vaga = vagas.find((v) => v.idVaga === r.idVaga);
      const isVisit = r.tipoReserva === 'VISITA';
      const visitante = isVisit ? visitantes.find((v) => v.idVisitante === r.idVisitante) : null;
      const quem = isVisit
        ? `${escapeHtml(visitante?.nomeVisitante ?? `Visitante ${r.idVisitante}`)} · ${escapeHtml(r.placaReserva ?? '')} · ${escapeHtml(r.motivoReserva)}`
        : escapeHtml(r.motivoReserva);
      const badge = isVisit
        ? `Visita · ${escapeHtml(STATUS[r.statusVisita] ?? r.statusVisita)}`
        : 'Outra ocasião';
      const editar = canEdit(r)
        ? `<div><button type="button" class="btn ds-btn-outline btn-sm" data-action="editar-reserva" data-id="${r.idReservaVaga}"><i class="bi bi-pencil-square" aria-hidden="true"></i> Editar</button></div>`
        : '';
      return `<article class="visita-item"><div>
        <p>Vaga ${escapeHtml(vaga?.numeroVaga ?? r.idVaga)} · ${escapeHtml(formatDate(r.dataReserva))} · ${escapeHtml(hhmm(r.horaEntrada))} – ${escapeHtml(hhmm(r.horaSaida))}</p>
        <p>${quem}</p>
        <span class="badge text-bg-light border text-secondary">${badge}</span>
      </div>${editar}</article>`;
    }).join('');
  }

  const load = async () => {
    [vagas, visitantes, veiculos, reservas] = await Promise.all([
      api('/vagas'), api('/visitantes'), api('/veiculoVisitantes'), api('/reserva-vagas'),
    ]);
    renderOptions();
    renderList();
  };

  /* ---------- Modo edição ---------- */

  const setEditUi = (on) => {
    if (title) title.textContent = on ? 'Editar reserva' : 'Reservar vaga';
    if (submitBtn) submitBtn.innerHTML = on ? '<i class="bi bi-check2" aria-hidden="true"></i> Salvar alterações' : submitDefault;
    if (resetBtn) resetBtn.textContent = on ? 'Cancelar edição' : resetDefault;
    radios.forEach((radio) => { radio.disabled = on; }); // o tipo da reserva não muda na edição
  };

  const exitEdit = () => {
    editingId = null;
    editingOriginal = null;
    setEditUi(false);
  };

  const startEdit = (id) => {
    const r = reservas.find((item) => String(item.idReservaVaga) === String(id));
    if (!r) return;
    const isVisit = r.tipoReserva === 'VISITA';
    editingId = r.idReservaVaga;
    editingOriginal = { date: dayOf(r.dataReserva), start: hhmm(r.horaEntrada) };
    setEditUi(true);

    const radio = $(isVisit ? 'tipo-visita' : 'tipo-outro');
    if (radio) radio.checked = true;
    applyMode();
    if (isVisit) {
      visitorSelect.value = String(r.idVisitante);
      fillVehicles();
      vehicleSelect.value = String(r.idVeiculoVisitante);
      plate.value = r.placaReserva ?? '';
    }
    vagaSelect.value = String(r.idVaga);
    reason.value = r.motivoReserva ?? '';
    date.value = dayOf(r.dataReserva);
    start.value = hhmm(r.horaEntrada);
    end.value = hhmm(r.horaSaida);

    const vaga = vagas.find((v) => v.idVaga === r.idVaga);
    say(`Editando a reserva da vaga ${vaga?.numeroVaga ?? r.idVaga}.`);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  document.querySelectorAll('input[name="reserva-tipo"]').forEach((radio) => radio.addEventListener('change', applyMode));
  visitorSelect.addEventListener('change', () => {
    say();
    fillVehicles();
    const visitante = visitantes.find((v) => String(v.idVisitante) === visitorSelect.value);
    if (visitante && !reason.value.trim()) reason.value = visitante.evento ?? '';
  });
  vehicleSelect.addEventListener('change', () => {
    const veiculo = veiculos.find((v) => String(v.idVeiculoVisitante) === vehicleSelect.value);
    plate.value = veiculo?.placaVeiculoVisitante ?? '';
  });
  // "Limpar" / "Cancelar edição"
  form.addEventListener('reset', () => setTimeout(() => { exitEdit(); fillVehicles(); applyMode(); date.min = nowParts().day; }, 0));
  list?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="editar-reserva"]');
    if (button) startEdit(button.dataset.id);
  });

  // dados podem ter mudado em outra seção do painel (ex.: novo visitante); não recarrega no meio de uma edição
  document.addEventListener('admin-tela', (event) => {
    if (event.detail === 'reserva' && editingId === null) load().catch((error) => say(error.message, true));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    say();
    const isVisit = mode() === 'VISITA';
    const idVisitante = Number(visitorSelect.value);
    const idVeiculoVisitante = Number(vehicleSelect.value);
    const idVaga = Number(vagaSelect.value);
    const motivoReserva = reason.value.trim();

    if (isVisit && !idVisitante) return say('Selecione o visitante.', true);
    if (isVisit && !idVeiculoVisitante) return say('Selecione o veículo do visitante.', true);
    if (!idVaga) return say('Selecione a vaga.', true);
    if (!motivoReserva) return say(isVisit ? 'Informe o motivo da visita.' : 'Informe o motivo / ocasião da reserva.', true);

    const scheduleProblem = scheduleError(); // data e horário que já passaram
    if (scheduleProblem) {
      say(scheduleProblem, true);
      window.alert(scheduleProblem);
      return;
    }

    // Outra ocasião vai sem visitante, veículo e placa.
    const payload = { idVaga, motivoReserva, dataReserva: date.value, horaEntrada: start.value, horaSaida: end.value };
    if (isVisit) {
      Object.assign(payload, { idVisitante, idVeiculoVisitante });
      if (plate.value) payload.placaReserva = plate.value; // só envia quando houver placa
    }

    const wasEditing = editingId !== null;
    const url = wasEditing ? `/reserva-vagas/${editingId}` : '/reserva-vagas';
    if (submitBtn) submitBtn.disabled = true;
    try {
      await api(url, { method: wasEditing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const vaga = vagas.find((v) => v.idVaga === idVaga);
      form.reset();
      exitEdit();
      date.min = nowParts().day;
      await load(); // atualiza a lista com o que ficou salvo no banco
      const titulo = wasEditing ? 'Reserva atualizada com sucesso!' : (isVisit ? 'Reserva de visita cadastrada com sucesso!' : 'Reserva cadastrada com sucesso!');
      setTimeout(() => window.alert(`${titulo}\n\nVaga: ${vaga?.numeroVaga ?? idVaga}\nData: ${formatDate(payload.dataReserva)}\nHorário: ${payload.horaEntrada} às ${payload.horaSaida}`), 0);
    } catch (error) {
      say(error.message, true); // 409 = conflito de horário, 400 = dado inválido
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  applyMode();
  updateToggle();
  load().catch((error) => say(error.message, true));
}