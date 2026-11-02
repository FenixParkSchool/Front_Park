import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

const STATUS = { PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', RECUSADA: 'Recusada' };
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

  let vagas = [];
  let visitantes = [];
  let veiculos = [];
  let reservas = [];

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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
      return `<article class="visita-item"><div>
        <p>Vaga ${escapeHtml(vaga?.numeroVaga ?? r.idVaga)} · ${escapeHtml(formatDate(r.dataReserva))} · ${escapeHtml(r.horaEntrada)} – ${escapeHtml(r.horaSaida)}</p>
        <p>${quem}</p>
        <span class="badge text-bg-light border text-secondary">${badge}</span>
      </div></article>`;
    }).join('');
  };

  const load = async () => {
    [vagas, visitantes, veiculos, reservas] = await Promise.all([
      api('/vagas'), api('/visitantes'), api('/veiculoVisitantes'), api('/reserva-vagas'),
    ]);
    renderOptions();
    renderList();
  };

    document.addEventListener('admin-tela', (event) => {
    if (event.detail === 'reserva') load().catch((error) => say(error.message, true));
  });

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
  form.addEventListener('reset', () => setTimeout(() => { fillVehicles(); applyMode(); }, 0));

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

    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const created = await api('/reserva-vagas', { method: 'POST', body: JSON.stringify(payload) });
      const vaga = vagas.find((v) => v.idVaga === created.idVaga);
      form.reset();
      date.min = todayString;
      await load(); // atualiza a lista com o que ficou salvo no banco
      setTimeout(() => window.alert(`${isVisit ? 'Reserva de visita' : 'Reserva'} cadastrada com sucesso!\n\nVaga: ${vaga?.numeroVaga ?? created.idVaga}\nData: ${formatDate(created.dataReserva)}\nHorário: ${created.horaEntrada} às ${created.horaSaida}`), 0);
    } catch (error) {
      say(error.message, true); // 409 = conflito de horário, 400 = dado inválido
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  applyMode();
  load().catch((error) => say(error.message, true));
}