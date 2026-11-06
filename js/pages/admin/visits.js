// Arquivo: Front_Park/js/pages/admin/visits.js
import { escapeHtml, isValidPlate, normalizePlate } from '../../shared/utils.js';

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
const byNewest = (a, b) => b.idVisitante - a.idVisitante;
const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const popup = (text) => setTimeout(() => window.alert(text), 0);

/* ---------- máscaras e validação ---------- */

function formatPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const isValidPhone = (digits) => /^[1-9][1-9](?:9\d{8}|[2-5]\d{7})$/.test(digits);
const PHONE_MESSAGE = 'Telefone inválido. Use (DD) 9XXXX-XXXX (celular) ou (DD) XXXX-XXXX (fixo).';

function maskPlate(value) {
  const raw = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let out = '';
  for (const ch of raw) {
    const i = out.length;
    if (i >= 7) break;
    const ok = i < 3 ? /[A-Z]/.test(ch) : i === 4 ? /[A-Z0-9]/.test(ch) : /[0-9]/.test(ch);
    if (ok) out += ch;
  }
  return out;
}

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

const show = (elements, visible) => elements.forEach((el) => el?.classList.toggle('d-none', !visible));

/* ---------- Inicialização ---------- */

export function initAdminVisits() {
  const form = $('formNovaVisitaAdmin');
  if (!form) return;
  form.noValidate = true;

  const list = $('lista-visitas-admin');
  const visitorSelect = $('visita-visitante-select');
  const vehicleSelect = $('visita-veiculo-select');
  const status = $('visita-status');
  const phoneInput = $('visita-telefone');
  const plateInput = $('visita-placa');
  const submitBtn = form.querySelector('[type="submit"]');
  const actions = form.querySelector('.form-actions');
  const submitDefault = submitBtn ? submitBtn.innerHTML : '';

  if (phoneInput) {
    phoneInput.maxLength = 15;
    phoneInput.addEventListener('input', () => { phoneInput.value = formatPhone(phoneInput.value); });
  }

  if (plateInput) {
    plateInput.maxLength = 7;
    plateInput.addEventListener('input', () => { plateInput.value = maskPlate(plateInput.value); });
  }

  const visitorRow = $('visita-nome')?.closest('.row');
  const vehicleRow = $('visita-tipo')?.closest('.row');
  const visitorTitle = visitorRow?.previousElementSibling;
  const vehicleTitle = vehicleRow?.previousElementSibling;
  const visitorPicker = visitorSelect?.closest('.col-12');
  const vehiclePicker = vehicleSelect?.closest('.col-12');

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn ds-btn-outline d-none';
  cancelBtn.textContent = 'Cancelar edição';
  actions?.append(cancelBtn);

  let visitantes = [];
  let veiculos = [];
  let visitorLocked = false;
  let vehicleLocked = false;
  let edit = null;

  /* ---------- Lista escondida + pesquisa ---------- */

  let panel = null;
  let toggleBtn = null;
  let searchInput = null;
  let countText = null;
  let listOpen = false;

  if (list) {
    panel = document.createElement('div');
    panel.id = 'painel-visitas-admin';
    panel.className = 'd-none';

    const filters = document.createElement('div');
    filters.className = 'mb-3';
    filters.style.maxWidth = '58rem';

    filters.innerHTML = `
      <div class="row g-2 align-items-end">
        <div class="col-12 col-lg-9">
          <label class="visually-hidden" for="busca-visitas-admin">Pesquisar visitas</label>
          <div class="input-group ds-input-group">
            <span class="input-group-text border-end-0">
              <i class="bi bi-search" aria-hidden="true"></i>
            </span>
            <input
              id="busca-visitas-admin"
              type="search"
              class="form-control border-start-0 ps-0"
              placeholder="Pesquisar por visitante, telefone, evento, veículo ou placa..."
            >
          </div>
        </div>
        <div class="col-12 col-lg-3">
          <button
            type="button"
            id="limpar-filtros-visitas"
            class="btn ds-btn-outline w-100"
          >Limpar filtros</button>
        </div>
      </div>
      <p id="contagem-visitas-admin" class="form-text mt-2 mb-0" aria-live="polite"></p>
    `;

    list.before(panel);
    panel.append(filters, list);

    searchInput = filters.querySelector('#busca-visitas-admin');
    countText = filters.querySelector('#contagem-visitas-admin');

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn ds-btn-outline d-inline-flex align-items-center gap-2';
    toggleBtn.setAttribute('aria-controls', 'painel-visitas-admin');

    const heading = panel.previousElementSibling;

    if (heading?.classList.contains('section-heading')) {
      heading.append(toggleBtn);
    } else {
      panel.before(toggleBtn);
    }

    toggleBtn.addEventListener('click', () => {
      listOpen = !listOpen;
      updateToggle();
    });

    searchInput.addEventListener('input', () => renderList());

    filters.querySelector('#limpar-filtros-visitas').addEventListener('click', () => {
      searchInput.value = '';
      renderList();
    });
  }

  function updateToggle() {
    if (!toggleBtn || !panel) return;

    panel.classList.toggle('d-none', !listOpen);
    toggleBtn.setAttribute('aria-expanded', String(listOpen));

    toggleBtn.innerHTML = listOpen
      ? '<i class="bi bi-eye-slash" aria-hidden="true"></i> Ocultar visitas'
      : `<i class="bi bi-list-ul" aria-hidden="true"></i> Ver visitas (${visitantes.length})`;
  }

  const say = (text = '', isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('text-danger', isError);
  };

  const loadData = async () => {
    [visitantes, veiculos] = await Promise.all([
      api('/visitantes'),
      api('/veiculoVisitantes'),
    ]);
  };

  /* ---------- Seletores ---------- */

  const applyVehicle = () => {
    const veiculo = veiculos.find((v) => String(v.idVeiculoVisitante) === vehicleSelect.value);

    if (veiculo) {
      setField('visita-tipo', veiculo.tipoVeiculoVisitante);
      setField('visita-modelo', veiculo.modeloVeiculoVisitante);
      setField('visita-cor', veiculo.corVeiculoVisitante);
      setField('visita-ano', veiculo.anoVeiculoVisitante);
      setField('visita-placa', maskPlate(veiculo.placaVeiculoVisitante));
      setLocked(VEHICLE_FIELDS, true);
      vehicleLocked = true;
    } else {
      if (vehicleLocked) VEHICLE_FIELDS.forEach((id) => setField(id, ''));
      setLocked(VEHICLE_FIELDS, false);
      vehicleLocked = false;
    }
  };

  const applyVisitor = (selectedVehicleId = '') => {
    const visitante = visitantes.find((v) => String(v.idVisitante) === visitorSelect.value);

    if (visitante) {
      setField('visita-nome', visitante.nomeVisitante);
      setField('visita-telefone', formatPhone(visitante.telefoneVisitante));
      setField('visita-evento', visitante.evento);
      setLocked(VISITOR_FIELDS, true);
      visitorLocked = true;
    } else {
      if (visitorLocked) VISITOR_FIELDS.forEach((id) => setField(id, ''));
      setLocked(VISITOR_FIELDS, false);
      visitorLocked = false;
    }

    const doVisitante = visitante
      ? veiculos.filter((v) => v.idVisitante === visitante.idVisitante)
      : [];

    vehicleSelect.innerHTML = '<option value="">Novo veículo</option>' + doVisitante.map((v) =>
      `<option value="${v.idVeiculoVisitante}">${escapeHtml(v.modeloVeiculoVisitante)} · ${escapeHtml(v.placaVeiculoVisitante)}</option>`
    ).join('');

    vehicleSelect.value = String(selectedVehicleId || '');
    applyVehicle();
  };

  const renderSelectors = (selectedVisitorId = '', selectedVehicleId = '') => {
    visitorSelect.innerHTML = '<option value="">Novo visitante</option>' + visitantes.slice().sort(byNewest).map((v) =>
      `<option value="${v.idVisitante}">${escapeHtml(v.nomeVisitante)} · ${escapeHtml(formatPhone(v.telefoneVisitante))}</option>`
    ).join('');

    visitorSelect.value = String(selectedVisitorId || '');
    applyVisitor(selectedVehicleId);
  };

  /* ---------- Pesquisa e listagem ---------- */

  const matchesSearch = (visitante) => {
    const term = normalize(searchInput?.value.trim());

    if (!term) return true;

    const doVisitante = veiculos.filter(
      (v) => v.idVisitante === visitante.idVisitante
    );

    const haystack = normalize([
      visitante.nomeVisitante,
      visitante.telefoneVisitante,
      formatPhone(visitante.telefoneVisitante),
      visitante.evento,
      ...doVisitante.flatMap((v) => [
        v.tipoVeiculoVisitante,
        v.modeloVeiculoVisitante,
        v.corVeiculoVisitante,
        v.anoVeiculoVisitante,
        v.placaVeiculoVisitante,
      ]),
    ].join(' '));

    return haystack.includes(term);
  };

  function renderList() {
    updateToggle();

    if (!list) return;

    if (!visitantes.length) {
      if (countText) countText.textContent = '';

      list.innerHTML = `
        <p class="text-center py-4 mb-0 empty-state">
          Nenhuma visita cadastrada.
        </p>
      `;
      return;
    }

    const shown = visitantes
      .slice()
      .sort(byNewest)
      .filter(matchesSearch);

    if (countText) {
      countText.textContent = `${shown.length} de ${visitantes.length} visitante(s)`;
    }

    if (!shown.length) {
      list.innerHTML = `
        <p class="text-center py-4 mb-0 empty-state">
          Nenhuma visita encontrada com essa pesquisa.
        </p>
      `;
      return;
    }

    list.innerHTML = shown.map((visitante) => {
      const doVisitante = veiculos
        .filter((v) => v.idVisitante === visitante.idVisitante)
        .sort((a, b) => b.idVeiculoVisitante - a.idVeiculoVisitante);

      const veiculosHtml = doVisitante.length
        ? doVisitante.map((v) => `
            <span class="badge text-bg-light border text-secondary">
              ${escapeHtml(v.tipoVeiculoVisitante)}
              ${escapeHtml(v.modeloVeiculoVisitante)}
              · ${escapeHtml(v.corVeiculoVisitante)}
              · ${escapeHtml(v.anoVeiculoVisitante)}
              · ${escapeHtml(v.placaVeiculoVisitante)}
              <button
                type="button"
                class="btn btn-link btn-sm p-0 ms-1 align-baseline"
                data-action="editar-veiculo"
                data-id="${v.idVeiculoVisitante}"
                aria-label="Editar veículo ${escapeHtml(v.placaVeiculoVisitante)}"
              >
                <i class="bi bi-pencil-square" aria-hidden="true"></i>
              </button>
            </span>
          `).join(' ')
        : '<span class="badge text-bg-light border text-secondary">Sem veículo</span>';

      return `
        <article class="visita-item">
          <div>
            <p>${escapeHtml(visitante.nomeVisitante)}</p>
            <p>
              ${escapeHtml(visitante.evento)}
              · ${escapeHtml(formatPhone(visitante.telefoneVisitante))}
            </p>
            ${veiculosHtml}
          </div>
          <div>
            <button
              type="button"
              class="btn ds-btn-outline btn-sm"
              data-action="editar-visitante"
              data-id="${visitante.idVisitante}"
            >
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              Editar
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  const refresh = async (selectedVisitorId = '', selectedVehicleId = '') => {
    await loadData();
    renderSelectors(selectedVisitorId, selectedVehicleId);
    renderList();
  };

  /* ---------- Edição ---------- */

  const setEditUi = (on) => {
    if (submitBtn) {
      submitBtn.innerHTML = on
        ? '<i class="bi bi-check2" aria-hidden="true"></i> Salvar alterações'
        : submitDefault;
    }

    cancelBtn.classList.toggle('d-none', !on);
  };

  const exitEdit = () => {
    edit = null;

    show([
      visitorTitle,
      visitorRow,
      vehicleTitle,
      vehicleRow,
      visitorPicker,
      vehiclePicker,
    ], true);

    setLocked(VISITOR_FIELDS, false);
    setLocked(VEHICLE_FIELDS, false);

    visitorLocked = false;
    vehicleLocked = false;

    form.reset();
    setEditUi(false);
    renderSelectors('', '');
  };

  const startEditVisitor = (id) => {
    const visitante = visitantes.find((v) => v.idVisitante === id);
    if (!visitante) return;

    exitEdit();
    edit = { type: 'visitante', id };

    show([vehicleTitle, vehicleRow, visitorPicker], false);

    setField('visita-nome', visitante.nomeVisitante);
    setField('visita-telefone', formatPhone(visitante.telefoneVisitante));
    setField('visita-evento', visitante.evento);

    setEditUi(true);
    say(`Editando o visitante ${visitante.nomeVisitante}.`);

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startEditVehicle = (id) => {
    const veiculo = veiculos.find((v) => v.idVeiculoVisitante === id);
    if (!veiculo) return;

    const visitante = visitantes.find((v) => v.idVisitante === veiculo.idVisitante);

    exitEdit();
    edit = { type: 'veiculo', id };

    show([visitorTitle, visitorRow, vehiclePicker], false);

    setField('visita-tipo', veiculo.tipoVeiculoVisitante);
    setField('visita-modelo', veiculo.modeloVeiculoVisitante);
    setField('visita-cor', veiculo.corVeiculoVisitante);
    setField('visita-ano', veiculo.anoVeiculoVisitante);
    setField('visita-placa', maskPlate(veiculo.placaVeiculoVisitante));

    setEditUi(true);

    say(`Editando o veículo ${veiculo.placaVeiculoVisitante}${visitante ? ` de ${visitante.nomeVisitante}` : ''}.`);

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const get = (id) => $(id)?.value.trim() || '';

  const validateVehicle = () => {
    if (!VEHICLE_FIELDS.every((id) => get(id))) {
      return 'Preencha todos os dados do veículo.';
    }

    if (!/^(19|20)\d{2}$/.test(get('visita-ano'))) {
      return 'Informe o ano do veículo com 4 dígitos.';
    }

    if (!isValidPlate(normalizePlate(get('visita-placa')))) {
      return 'Informe uma placa válida.';
    }

    return null;
  };

  const vehicleBody = () => ({
    tipoVeiculoVisitante: get('visita-tipo'),
    modeloVeiculoVisitante: get('visita-modelo'),
    corVeiculoVisitante: get('visita-cor'),
    anoVeiculoVisitante: get('visita-ano'),
    placaVeiculoVisitante: normalizePlate(get('visita-placa')),
  });

  async function saveEdit() {
    let path;
    let body;
    let success;
    let duplicate;

    if (edit.type === 'visitante') {
      const telefone = onlyDigits(get('visita-telefone'));

      if (get('visita-nome').length < 2 || get('visita-evento').length < 2) {
        return say('Preencha o nome e o evento (mínimo de 2 caracteres).', true);
      }

      if (!isValidPhone(telefone)) return say(PHONE_MESSAGE, true);

      path = `/visitantes/${edit.id}`;
      body = {
        nomeVisitante: get('visita-nome'),
        telefoneVisitante: telefone,
        evento: get('visita-evento'),
      };

      success = 'Visitante atualizado com sucesso.';
      duplicate = 'Já existe outro visitante com este telefone.';
    } else {
      const problem = validateVehicle();
      if (problem) return say(problem, true);

      path = `/veiculoVisitantes/${edit.id}`;
      body = vehicleBody();

      success = 'Veículo atualizado com sucesso.';
      duplicate = 'Já existe outro veículo com esta placa.';
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await api(path, { method: 'PUT', body });

      exitEdit();
      await refresh('', '');

      say(success);
      popup(success);
    } catch (error) {
      say(error.status === 409 ? duplicate : error.message, true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  /* ---------- Eventos ---------- */

  visitorSelect.addEventListener('change', () => {
    say();
    applyVisitor();
  });

  vehicleSelect.addEventListener('change', () => {
    say();
    applyVehicle();
  });

  cancelBtn.addEventListener('click', () => {
    exitEdit();
    say();
  });

  list?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.action === 'editar-visitante') {
      startEditVisitor(id);
    }

    if (button.dataset.action === 'editar-veiculo') {
      startEditVehicle(id);
    }
  });

  /* ---------- Cadastro ---------- */

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    say();

    if (edit) {
      await saveEdit();
      return;
    }

    let visitorId = Number(visitorSelect.value) || null;
    const existingVehicleId = Number(vehicleSelect.value) || null;

    if (visitorId && existingVehicleId) {
      document.dispatchEvent(new CustomEvent('visita-selecionada', {
        detail: {
          idVisitante: visitorId,
          idVeiculoVisitante: existingVehicleId,
        },
      }));

      say('Visitante e veículo já cadastrados. Registro selecionado.');
      return;
    }

    const telefone = onlyDigits(get('visita-telefone'));
    const placa = normalizePlate(get('visita-placa'));

    if (!visitorId) {
      if (!get('visita-nome') || !get('visita-evento') || !telefone) {
        return say('Preencha os dados do visitante.', true);
      }

      if (!isValidPhone(telefone)) return say(PHONE_MESSAGE, true);
    }

    const vehicleProblem = validateVehicle();
    if (vehicleProblem) return say(vehicleProblem, true);

    if (submitBtn) submitBtn.disabled = true;

    let createdVisitorNow = false;

    try {
      // 1. Visitante
      if (!visitorId) {
        try {
          const visitante = await api('/visitantes', {
            method: 'POST',
            body: {
              nomeVisitante: get('visita-nome'),
              telefoneVisitante: telefone,
              evento: get('visita-evento'),
            },
          });

          visitorId = Number(visitante.idVisitante);
          createdVisitorNow = true;

          await refresh(visitorId, '');
        } catch (error) {
          if (error.status !== 409) throw error;

          await loadData();

          const existing = visitantes.find(
            (v) => onlyDigits(v.telefoneVisitante) === telefone
          );

          renderSelectors(existing?.idVisitante ?? '', '');
          renderList();

          say(
            existing
              ? `${error.message} Visitante existente selecionado: informe o veículo e salve novamente.`
              : error.message,
            true
          );

          return;
        }
      }

      // 2. Veículo
      try {
        await api('/veiculoVisitantes', {
          method: 'POST',
          body: {
            idVisitante: visitorId,
            ...vehicleBody(),
          },
        });
      } catch (error) {
        if (error.status === 409) {
          await loadData();

          const existing = veiculos.find(
            (v) => v.placaVeiculoVisitante === placa
          );

          renderSelectors(
            existing?.idVisitante ?? visitorId,
            existing?.idVeiculoVisitante ?? ''
          );

          renderList();

          say(
            existing
              ? `${error.message} Registro existente selecionado.`
              : error.message,
            true
          );
        } else {
          say(
            `${createdVisitorNow ? `Visitante cadastrado (ID ${visitorId}), mas o` : 'O'} veículo não foi salvo: ${error.message} Corrija os dados do veículo e salve novamente: só o veículo será reenviado.`,
            true
          );
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
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  /* ---------- Inicialização da lista ---------- */

  updateToggle();

  refresh().catch((error) => {
    if (list) {
      list.innerHTML = `
        <p class="text-center py-4 mb-0 empty-state">
          ${escapeHtml(error.message)}
        </p>
      `;
    }
  });
}
