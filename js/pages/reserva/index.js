//Arquivo: Front_Park/js/pages/reserva/index.js
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', RECUSADA: 'Recusada' };
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (value) => String(value ?? '').slice(0, 5);
const formatDate = (iso) => {
  const [year, month, day] = String(iso).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
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
  let editingId = null; // id da reserva em edição

  const today = new Date();
  const todayString = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  date.min = todayString;

  const say = (text = '', isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('text-danger', isError);
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

  // só dá para editar reservas que ainda não terminaram
  const canEdit = (r) => {
    const day = String(r.dataReserva).slice(0, 10);
    if (day > todayString) return true;
    if (day < todayString) return false;
    const now = new Date();
    return hhmm(r.horaSaida) > `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const renderOptions = () => {
    visitorSelect.innerHTML = '<option value="">Selecione o visitante</option>' + visitantes.map((v) =>
      `<option value="${v.idVisitante}">${escapeHtml(v.nomeVisitante)}</option>`).join('');
    vagaSelect.innerHTML = '<option value="">Selecione a vaga</option>' + vagas
      .slice().sort((a, b) => a.numeroVaga - b.numeroVaga)
      .map((v) => `<option value="${v.idVaga}">Vaga ${escapeHtml(v.numeroVaga)}${v.tipoVaga ? ` · ${escapeHtml(v.tipoVaga)}` : ''}</option>`).join('');
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

  const renderList = () => {
    if (!list) return;
    if (!reservas.length) {
      list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma reserva cadastrada.</p>';
      return;
    }
    list.innerHTML = reservas.map((r) => {
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
  };

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
    setEditUi(false);
  };

  const startEdit = (id) => {
    const r = reservas.find((item) => String(item.idReservaVaga) === String(id));
    if (!r) return;
    const isVisit = r.tipoReserva === 'VISITA';
    editingId = r.idReservaVaga;
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
    date.value = String(r.dataReserva).slice(0, 10);
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
  form.addEventListener('reset', () => setTimeout(() => { exitEdit(); fillVehicles(); applyMode(); }, 0));
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
    if (!date.value || date.value < todayString) return say('Selecione uma data a partir de hoje.', true);
    if (!start.value || !end.value) return say('Informe o horário de entrada e de saída.', true);
    if (start.value >= end.value) return say('O horário de saída deve ser maior que o de entrada.', true);

    // Outra ocasião vai sem visitante, veículo e placa.
    const payload = { idVaga, motivoReserva, dataReserva: date.value, horaEntrada: start.value, horaSaida: end.value };
    if (isVisit) Object.assign(payload, { idVisitante, idVeiculoVisitante, placaReserva: plate.value });

    const wasEditing = editingId !== null;
    const url = wasEditing ? `/reserva-vagas/${editingId}` : '/reserva-vagas';
    if (submitBtn) submitBtn.disabled = true;
    try {
      await api(url, { method: wasEditing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const vaga = vagas.find((v) => v.idVaga === idVaga);
      form.reset();
      exitEdit();
      date.min = todayString;
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
  load().catch((error) => say(error.message, true));
}
