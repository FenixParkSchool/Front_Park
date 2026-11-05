//Arquivo: Front_Park/js/pages/admin/visits.js
import { escapeHtml, isValidPlate } from '../../shared/utils.js';

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

/* ---------- Telefone: máscara e validação ---------- */

// Só números, no máximo 11: (12) 3456-7890 (fixo) ou (12) 91234-5678 (celular).
function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function phoneError(digits) {
  if (!/^\d{10,11}$/.test(digits)) return 'Informe o telefone com DDD: celular (11 dígitos) ou fixo (10 dígitos).';
  if (Number(digits.slice(0, 2)) < 11) return 'DDD inválido.';
  if (digits.length === 11 && digits[2] !== '9') return 'Celular deve começar com 9 depois do DDD.';
  if (digits.length === 10 && !/[2-5]/.test(digits[2])) return 'Telefone fixo deve começar com 2 a 5 depois do DDD.';
  return '';
}

/* ---------- Placa: só letras e números, no máximo 7 caracteres ---------- */

const cleanPlate = (value) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

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
  form.noValidate = true; // as mensagens de validação vêm do código abaixo

  const list = $('lista-visitas-admin');
  const visitorSelect = $('visita-visitante-select');
  const vehicleSelect = $('visita-veiculo-select');
  const status = $('visita-status');
  const title = $('titulo-visitas');
  const phoneInput = $('visita-telefone');
  const plateInput = $('visita-placa');
  const submit = form.querySelector('[type="submit"]');
  const submitDefault = submit ? submit.innerHTML : '';

  if (phoneInput) {
    phoneInput.maxLength = 15; // "(12) 91234-5678"
    phoneInput.inputMode = 'tel';
    phoneInput.addEventListener('input', () => { phoneInput.value = maskPhone(phoneInput.value); });
  }
  if (plateInput) {
    plateInput.maxLength = 7;
    plateInput.addEventListener('input', () => { plateInput.value = cleanPlate(plateInput.value); });
  }

  // botão "Cancelar edição" (criado aqui, só aparece ao editar)
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.id = 'btn-cancelar-visita';
  cancelBtn.className = 'btn ds-btn-outline ms-2';
  cancelBtn.textContent = 'Cancelar edição';
  cancelBtn.hidden = true;
  form.querySelector('.form-actions')?.append(cancelBtn);

  let visitantes = [];
  let veiculos = [];
  let visitorLocked = false;
  let vehicleLocked = false;
  let editing = null; // { visitorId } quando estiver editando uma visita

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
      setLocked(VEHICLE_FIELDS, !editing); // ao editar, os campos ficam liberados
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
      setField('visita-telefone', maskPhone(visitante.telefoneVisitante));
      setField('visita-evento', visitante.evento);
      setLocked(VISITOR_FIELDS, !editing);
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
      `<option value="${v.idVisitante}">${escapeHtml(v.nomeVisitante)} · ${escapeHtml(maskPhone(v.telefoneVisitante))}</option>`).join('');
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
        <p>${escapeHtml(visitante.evento)} · ${escapeHtml(maskPhone(visitante.telefoneVisitante))}</p>
        ${veiculosHtml}
      </div>
      <div><button type="button" class="btn ds-btn-outline btn-sm" data-action="editar-visita" data-id="${visitante.idVisitante}"><i class="bi bi-pencil-square" aria-hidden="true"></i> Editar</button></div>
      </article>`;
    }).join('');
  };

  const refresh = async (selectedVisitorId = '', selectedVehicleId = '') => {
    await loadData();
    renderSelectors(selectedVisitorId, selectedVehicleId);
    renderList();
  };

  // ---- modo edição ---------------------------------------------------------
  const setEditUi = (on) => {
    if (title) title.textContent = on ? 'Editar visita' : 'Registrar visita';
    if (submit) submit.innerHTML = on ? '<i class="bi bi-check2" aria-hidden="true"></i> Salvar alterações' : submitDefault;
    cancelBtn.hidden = !on;
    visitorSelect.disabled = on; // na edição o visitante é o escolhido na lista
  };

  const exitEdit = () => {
    if (!editing) return;
    editing = null;
    setEditUi(false);
    form.reset();
    setLocked(VISITOR_FIELDS, false);
    setLocked(VEHICLE_FIELDS, false);
    visitorLocked = false;
    vehicleLocked = false;
    renderSelectors('', '');
    say();
  };

  const startEdit = (id) => {
    const visitante = visitantes.find((v) => String(v.idVisitante) === String(id));
    if (!visitante) return;
    editing = { visitorId: visitante.idVisitante };
    form.reset();
    setLocked(VISITOR_FIELDS, false);
    setLocked(VEHICLE_FIELDS, false);
    setEditUi(true);

    visitorSelect.value = String(visitante.idVisitante);
    setField('visita-nome', visitante.nomeVisitante);
    setField('visita-telefone', maskPhone(visitante.telefoneVisitante));
    setField('visita-evento', visitante.evento);
    visitorLocked = false;

    const doVisitante = veiculos.filter((v) => v.idVisitante === visitante.idVisitante);
    vehicleSelect.innerHTML = '<option value="">Novo veículo</option>' + doVisitante.map((v) =>
      `<option value="${v.idVeiculoVisitante}">${escapeHtml(v.modeloVeiculoVisitante)} · ${escapeHtml(v.placaVeiculoVisitante)}</option>`).join('');
    vehicleSelect.value = doVisitante[0] ? String(doVisitante[0].idVeiculoVisitante) : '';
    vehicleLocked = false;
    applyVehicle();

    say(`Editando a visita de ${visitante.nomeVisitante}. Para trocar o veículo, escolha outro na lista ou "Novo veículo".`);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const get = (id) => $(id)?.value.trim() || '';

  const saveEdit = async () => {
    const nome = get('visita-nome');
    const evento = get('visita-evento');
    const telefone = onlyDigits(get('visita-telefone'));
    if (nome.length < 2 || evento.length < 2) return say('Preencha o nome e o evento / motivo do visitante.', true);
    const erroTelefone = phoneError(telefone);
    if (erroTelefone) return say(erroTelefone, true);

    // veículo: se houver um selecionado ou algum campo preenchido, todos precisam estar válidos
    const vehicleId = Number(vehicleSelect.value) || null;
    let vehicleBody = null;
    if (vehicleId || VEHICLE_FIELDS.some((id) => get(id))) {
      if (!VEHICLE_FIELDS.every((id) => get(id))) return say('Preencha todos os dados do veículo ou deixe todos em branco.', true);
      if (!/^(19|20)\d{2}$/.test(get('visita-ano'))) return say('Informe o ano do veículo com 4 dígitos.', true);
      const placa = cleanPlate(get('visita-placa'));
      if (!isValidPlate(placa)) return say('Informe uma placa válida.', true);
      vehicleBody = {
        tipoVeiculoVisitante: get('visita-tipo'),
        modeloVeiculoVisitante: get('visita-modelo'),
        corVeiculoVisitante: get('visita-cor'),
        anoVeiculoVisitante: get('visita-ano'),
        placaVeiculoVisitante: placa,
      };
    }

    if (submit) submit.disabled = true;
    try {
      await api(`/visitantes/${editing.visitorId}`, {
        method: 'PUT',
        body: { nomeVisitante: nome, telefoneVisitante: telefone, evento },
      });

      if (vehicleBody) {
        try {
          if (vehicleId) await api(`/veiculoVisitantes/${vehicleId}`, { method: 'PUT', body: vehicleBody });
          else await api('/veiculoVisitantes', { method: 'POST', body: { idVisitante: editing.visitorId, ...vehicleBody } });
        } catch (error) {
          await loadData().catch(() => {});
          renderList();
          say(`Visitante atualizado, mas o veículo não foi salvo: ${error.message}`, true);
          return;
        }
      }

      exitEdit();
      await refresh('', '');
      say('Visita atualizada com sucesso.');
      popup('Visita atualizada com sucesso!');
    } catch (error) {
      say(error.message, true); // ex.: 409 (telefone ou placa já cadastrados)
    } finally {
      if (submit) submit.disabled = false;
    }
  };

  // ---- eventos -------------------------------------------------------------
  visitorSelect.addEventListener('change', () => { say(); applyVisitor(); });
  vehicleSelect.addEventListener('change', () => { say(); applyVehicle(); });
  cancelBtn.addEventListener('click', exitEdit);
  list?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="editar-visita"]');
    if (button) startEdit(button.dataset.id);
  });
  // ao sair desta tela, abandona a edição
  document.addEventListener('admin-tela', (event) => { if (event.detail !== 'visitas') exitEdit(); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    say();
    if (editing) return saveEdit();

    let visitorId = Number(visitorSelect.value) || null;
    const existingVehicleId = Number(vehicleSelect.value) || null;

    // visitante e veículo já cadastrados: nada a criar, só fica selecionado para a reserva
    if (visitorId && existingVehicleId) {
      document.dispatchEvent(new CustomEvent('visita-selecionada', { detail: { idVisitante: visitorId, idVeiculoVisitante: existingVehicleId } }));
      say('Visitante e veículo já cadastrados. Registro selecionado.');
      return;
    }

    const telefone = onlyDigits(get('visita-telefone'));
    const placa = cleanPlate(get('visita-placa'));

    if (!visitorId) {
      if (!get('visita-nome') || !get('visita-evento') || !telefone) return say('Preencha os dados do visitante.', true);
      const erroTelefone = phoneError(telefone);
      if (erroTelefone) return say(erroTelefone, true);
    }
    if (!VEHICLE_FIELDS.every((id) => get(id))) return say('Preencha todos os dados do veículo.', true);
    if (!/^(19|20)\d{2}$/.test(get('visita-ano'))) return say('Informe o ano do veículo com 4 dígitos.', true);
    if (!isValidPlate(placa)) return say('Informe uma placa válida.', true);

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
      say('Cadastro de visitante e veículo concluído.');
      popup('Cadastro de visitante e veículo concluído.');
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
