import { escapeHtml, isValidPlate, normalizePlate } from '../../shared/utils.js';
 
// URL da API que o projeto usa.
const API_URL = (window.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
 
function errorMessage(data, status) {
  if (data?.errors?.[0]?.message) return data.errors[0].message;
  if (data?.error) return data.error;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}
 
async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(errorMessage(data, response.status));
    error.status = response.status;
    throw error;
  }
  return data;
}
 
const $ = (id) => document.getElementById(id);
const VISITOR_FIELDS = ['visita-nome', 'visita-telefone', 'visita-evento'];
const VEHICLE_FIELDS = ['visita-tipo', 'visita-modelo', 'visita-cor', 'visita-ano', 'visita-placa'];
const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');
 
// Popup de confirmação (adiado para o navegador atualizar a lista antes de abrir)
const popup = (text) => setTimeout(() => window.alert(text), 0);
 
function setField(id, value) {
  const el = $(id);
  if (!el) return;
  if (el.tagName === 'SELECT' && value && ![...el.options].some((o) => o.value === value)) {
    el.append(new Option(value, value));
  }
  el.value = value ?? '';
}
 
function setLocked(ids, locked) {
  ids.forEach((id) => { const el = $(id); if (el) el.disabled = locked; });
}
 
// getVacancies não é mais usado: a vaga é reservada depois do cadastro. Mantido para não quebrar o main.js.
export function initAdminVisits() {
  const form = $('formNovaVisitaAdmin');
  if (!form) return;
  const list = $('lista-visitas-admin');
  const visitorSelect = $('visita-visitante-select');
  const vehicleSelect = $('visita-veiculo-select');
  const status = $('visita-status');
 
  let visitantes = [];
  let veiculos = [];
  let visitorLocked = false;
  let vehicleLocked = false;
 
  const say = (text = '', isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('text-danger', isError);
  };
 
  const loadData = async () => {
    [visitantes, veiculos] = await Promise.all([api('/visitantes'), api('/veiculoVisitantes')]);
  };
 
  // ---- seletores -----------------------------------------------------------
  const applyVehicle = () => {
    const veiculo = veiculos.find((v) => String(v.idVeiculoVisitante) === vehicleSelect.value);
    if (veiculo) {
      setField('visita-tipo', veiculo.tipoVeiculoVisitante);
      setField('visita-modelo', veiculo.modeloVeiculoVisitante);
      setField('visita-cor', veiculo.corVeiculoVisitante);
      setField('visita-ano', veiculo.anoVeiculoVisitante);
      setField('visita-placa', veiculo.placaVeiculoVisitante);
      setLocked(VEHICLE_FIELDS, true);
      vehicleLocked = true;
    } else {
      // só limpa se os campos estavam preenchidos por um veículo existente (preserva o que o usuário digitou)
      if (vehicleLocked) VEHICLE_FIELDS.forEach((id) => setField(id, ''));
      setLocked(VEHICLE_FIELDS, false);
      vehicleLocked = false;
    }
  };
 
  const applyVisitor = (selectedVehicleId = '') => {
    const visitante = visitantes.find((v) => String(v.idVisitante) === visitorSelect.value);
    if (visitante) {
      setField('visita-nome', visitante.nomeVisitante);
      setField('visita-telefone', visitante.telefoneVisitante);
      setField('visita-evento', visitante.evento);
      setLocked(VISITOR_FIELDS, true);
      visitorLocked = true;
    } else {
      if (visitorLocked) VISITOR_FIELDS.forEach((id) => setField(id, ''));
      setLocked(VISITOR_FIELDS, false);
      visitorLocked = false;
    }
    // veículos filtrados pelo visitante selecionado
    const doVisitante = visitante ? veiculos.filter((v) => v.idVisitante === visitante.idVisitante) : [];
    vehicleSelect.innerHTML = '<option value="">Novo veículo</option>' + doVisitante.map((v) =>
      `<option value="${v.idVeiculoVisitante}">${escapeHtml(v.modeloVeiculoVisitante)} · ${escapeHtml(v.placaVeiculoVisitante)}</option>`).join('');
    vehicleSelect.value = String(selectedVehicleId || '');
    applyVehicle();
  };
 
  const renderSelectors = (selectedVisitorId = '', selectedVehicleId = '') => {
    visitorSelect.innerHTML = '<option value="">Novo visitante</option>' + visitantes.map((v) =>
      `<option value="${v.idVisitante}">${escapeHtml(v.nomeVisitante)} · ${escapeHtml(v.telefoneVisitante)}</option>`).join('');
    visitorSelect.value = String(selectedVisitorId || '');
    applyVisitor(selectedVehicleId);
  };
 
  // ---- lista ---------------------------------------------------------------
  const renderList = () => {
    if (!list) return;
    if (!visitantes.length) {
      list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma visita cadastrada.</p>';
      return;
    }
    list.innerHTML = visitantes.map((visitante) => {
      const doVisitante = veiculos.filter((v) => v.idVisitante === visitante.idVisitante);
      const veiculosHtml = doVisitante.length
        ? doVisitante.map((v) => `<span class="badge text-bg-light border text-secondary">${escapeHtml(v.tipoVeiculoVisitante)} ${escapeHtml(v.modeloVeiculoVisitante)} · ${escapeHtml(v.corVeiculoVisitante)} · ${escapeHtml(v.anoVeiculoVisitante)} · ${escapeHtml(v.placaVeiculoVisitante)}</span>`).join(' ')
        : '<span class="badge text-bg-light border text-secondary">Sem veículo</span>';
      return `<article class="visita-item"><div>
        <p>${escapeHtml(visitante.nomeVisitante)}</p>
        <p>${escapeHtml(visitante.evento)} · ${escapeHtml(visitante.telefoneVisitante)}</p>
        ${veiculosHtml}
      </div></article>`;
    }).join('');
  };
 
  const refresh = async (selectedVisitorId = '', selectedVehicleId = '') => {
    await loadData();
    renderSelectors(selectedVisitorId, selectedVehicleId);
    renderList();
  };
 
  // ---- eventos -------------------------------------------------------------
  visitorSelect.addEventListener('change', () => { say(); applyVisitor(); });
  vehicleSelect.addEventListener('change', () => { say(); applyVehicle(); });
 
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    say();
    const get = (id) => $(id)?.value.trim() || '';
    let visitorId = Number(visitorSelect.value) || null;
    const existingVehicleId = Number(vehicleSelect.value) || null;
 
    // visitante e veículo já cadastrados: nada a criar, só fica selecionado para a reserva
    if (visitorId && existingVehicleId) {
      document.dispatchEvent(new CustomEvent('visita-selecionada', { detail: { idVisitante: visitorId, idVeiculoVisitante: existingVehicleId } }));
      say('Visitante e veículo já cadastrados. Registro selecionado.');
      return;
    }
 
    const telefone = onlyDigits(get('visita-telefone'));
    const placa = normalizePlate(get('visita-placa'));
 
    if (!visitorId) {
      if (!get('visita-nome') || !get('visita-evento') || !telefone) return say('Preencha os dados do visitante.', true);
      if (!/^\d{10,11}$/.test(telefone)) return say('Informe o telefone com DDD (10 ou 11 dígitos).', true);
    }
    if (!VEHICLE_FIELDS.every((id) => get(id))) return say('Preencha todos os dados do veículo.', true);
    if (!/^(19|20)\d{2}$/.test(get('visita-ano'))) return say('Informe o ano do veículo com 4 dígitos.', true);
    if (!isValidPlate(placa)) return say('Informe uma placa válida.', true);
 
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    let createdVisitorNow = false;
    try {
      // 1) visitante (só se for novo)
      if (!visitorId) {
        try {
          const visitante = await api('/visitantes', {
            method: 'POST',
            body: { nomeVisitante: get('visita-nome'), telefoneVisitante: telefone, evento: get('visita-evento') },
          });
          visitorId = Number(visitante.idVisitante);
          createdVisitorNow = true;
          // mantém o visitante selecionado: se o veículo falhar, o reenvio usa este mesmo visitante
          await refresh(visitorId, '');
        } catch (error) {
          if (error.status !== 409) throw error;
          await loadData();
          const existing = visitantes.find((v) => onlyDigits(v.telefoneVisitante) === telefone);
          renderSelectors(existing?.idVisitante ?? '', '');
          renderList();
          say(existing ? `${error.message} Visitante existente selecionado: informe o veículo e salve novamente.` : error.message, true);
          return;
        }
      }
 
      // 2) veículo
      try {
        await api('/veiculoVisitantes', {
          method: 'POST',
          body: {
            idVisitante: visitorId,
            tipoVeiculoVisitante: get('visita-tipo'),
            modeloVeiculoVisitante: get('visita-modelo'),
            corVeiculoVisitante: get('visita-cor'),
            anoVeiculoVisitante: get('visita-ano'),
            placaVeiculoVisitante: placa,
          },
        });
      } catch (error) {
        if (error.status === 409) {
          await loadData();
          const existing = veiculos.find((v) => v.placaVeiculoVisitante === placa);
          renderSelectors(existing?.idVisitante ?? visitorId, existing?.idVeiculoVisitante ?? '');
          renderList();
          say(existing ? `${error.message} Registro existente selecionado.` : error.message, true);
        } else {
          say(`${createdVisitorNow ? `Visitante cadastrado (ID ${visitorId}), mas o` : 'O'} veículo não foi salvo: ${error.message} Corrija os dados do veículo e salve novamente: só o veículo será reenviado.`, true);
        }
        return;
      }
 
      form.reset();
      await refresh('', '');
      say('Visitante e veículo cadastrados com sucesso.');
      popup('Visitante e veículo cadastrados com sucesso!');
    } catch (error) {
      say(error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
 
  refresh().catch((error) => {
    if (list) list.innerHTML = `<p class="text-center py-4 mb-0 empty-state">${escapeHtml(error.message)}</p>`;
  });
}