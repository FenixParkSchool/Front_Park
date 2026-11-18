//Arquivo: Front_Park/js/pages/admin/vehicles.js
import { vehiclesRepo } from '../../services/repositories.js';
import { escapeHtml, isValidPlate, normalizePlate, maskPlate } from '../../shared/utils.js';
 
let formSequence = 0;
let funcionarioSelecionadoId = null;
let getEmployeesProvider = () => [];

function setFeedback(message, type = 'sucesso') {
  const element = document.getElementById('veiculos-feedback');
  if (!element) {
    if (message) window.alert(message);
    return;
  }
  const employees = getEmployees();
  container.innerHTML = vehicles.map((vehicle) => {
    const employee = employees.find((item) => String(item.id) === String(vehicle.funcionarioId));
    const icon = vehicle.tipo === 'moto' ? 'bi-bicycle' : 'bi-car-front-fill';
    return `<article class="veiculo-registrado">
      <div class="d-flex align-items-center gap-3"><span class="icon-circle icon-circle-md icon-circle-primary"><i class="bi ${icon}" aria-hidden="true"></i></span>
      <div><p>${escapeHtml(vehicle.modelo)} <span class="badge text-bg-light border text-secondary text-capitalize fw-normal">${escapeHtml(vehicle.tipo)}</span></p>
      <p><i class="bi bi-person me-1" aria-hidden="true"></i>${escapeHtml(employee?.nome || 'Funcionário não encontrado')}</p></div></div>
      <div class="text-end"><p class="fw-bold">${escapeHtml(vehicle.placa)}</p><p class="d-flex align-items-center justify-content-end gap-1 mt-1"><span class="rounded-circle" style="width:12px;height:12px;background:${escapeHtml(vehicle.cor)};border:1px solid var(--border-color)"></span>${escapeHtml(vehicle.cor)}</p></div>
    </article>`;
  }).join('');
}
 
function populateEmployees(getEmployees) {
  const select = document.getElementById('select-funcionario');
  if (!select) return;
  const employees = getEmployees();
  select.innerHTML = employees.length
    ? employees.map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.nome)} (ID: ${escapeHtml(employee.id)})</option>`).join('')
    : '<option value="">Nenhum funcionário cadastrado</option>';
}
 
function addForm() {
  const container = document.getElementById('lista-forms-veiculo');
  if (!container) return;
  const id = ++formSequence;
  const number = container.querySelectorAll('[data-form-veiculo]').length + 1;
  container.insertAdjacentHTML('beforeend', `<section class="card-form admin-form position-relative" data-form-veiculo="${id}">
    ${number > 1 ? '<button type="button" class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3" data-action="remover-form-veiculo" aria-label="Remover este veículo"><i class="bi bi-trash3" aria-hidden="true"></i></button>' : ''}
    <p class="veiculo-numero">Veículo ${number}</p><div class="row g-3">
    <div class="col-md-7"><label class="form-label" for="modelo-${id}">Modelo</label><input id="modelo-${id}" class="form-control campo-modelo" placeholder="Ex.: Onix, Fazer 250" minlength="2" maxlength="50" required></div>
    <fieldset class="col-md-5"><legend class="form-label">Tipo</legend><div class="form-choice-row"><label class="form-check"><input class="form-check-input campo-tipo" type="radio" name="tipo-${id}" value="carro" checked> Carro</label><label class="form-check"><input class="form-check-input campo-tipo" type="radio" name="tipo-${id}" value="moto"> Moto</label></div></fieldset>
    <div class="col-md-6"><label class="form-label" for="placa-${id}">Placa</label><input id="placa-${id}" class="form-control campo-placa text-uppercase" maxlength="7" placeholder="ABC1D23" autocomplete="off" required></div>
    <div class="col-md-6"><label class="form-label" for="cor-${id}">Cor do veículo</label><input id="cor-${id}" class="form-control campo-cor" placeholder="Ex.: Prata" minlength="2" maxlength="30" required></div></div>
  </section>`);
}
 
function renumberForms() {
  document.querySelectorAll('[data-form-veiculo] .veiculo-numero').forEach((element, index) => { element.textContent = `Veículo ${index + 1}`; });
}

function getVehicleRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.veiculos)) return response.veiculos;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
}

function renderRegisteredVehicles(vehicles, getEmployees) {
  const list = document.getElementById('listaVeiculosCadastrados');
  if (!list) return;

  if (!vehicles.length) {
    list.innerHTML = '<p class="empty-state mb-0">Nenhum veículo cadastrado.</p>';
    return;
  }

  const employees = getEmployees() || [];
  list.innerHTML = vehicles.map((vehicle) => {
    const model = vehicle.modeloVeiculo ?? vehicle.modelo_veiculo ?? vehicle.modelo ?? 'Modelo não informado';
    const type = vehicle.tipoVeiculo ?? vehicle.tipo_veiculo ?? vehicle.tipo ?? '';
    const plate = vehicle.placaVeiculo ?? vehicle.placa_veiculo ?? vehicle.placa ?? '';
    const color = vehicle.corVeiculo ?? vehicle.cor_veiculo ?? vehicle.cor ?? '';
    const year = vehicle.anoVeiculo ?? vehicle.ano_veiculo ?? vehicle.ano ?? '';
    const employeeId = vehicle.idFuncionario ?? vehicle.id_funcionario ?? vehicle.funcionarioId ?? vehicle.employeeId;
    const employee = vehicle.funcionario?.nome
      ?? employees.find((item) => String(item.id) === String(employeeId))?.nome
      ?? '';
    const details = [type, plate, color, year].filter((value) => value !== '' && value !== null && value !== undefined);

    return `<article class="veiculo-registrado">
      <div class="d-flex align-items-center gap-3">
        <span class="stat-icon icone-veiculo" aria-hidden="true"><i class="bi bi-car-front"></i></span>
        <div>
          <h3 class="h6 mb-1 fw-semibold">${escapeHtml(model)}</h3>
          <p class="mb-1 text-secondary small">${details.map(escapeHtml).join(' · ') || 'Dados do veículo não informados'}</p>
          ${employee ? `<p class="mb-0 text-muted small">Funcionário: ${escapeHtml(employee)}</p>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}

async function loadRegisteredVehicles(getEmployees) {
  const list = document.getElementById('listaVeiculosCadastrados');
  if (!list) return;

  list.innerHTML = '<p class="empty-state mb-0">Carregando veículos...</p>';
  try {
    const response = await api('/veiculos');
    renderRegisteredVehicles(getVehicleRows(response), getEmployees);
  } catch (error) {
    list.innerHTML = `<p class="empty-state mb-0 text-danger">${escapeHtml(error.message || 'Não foi possível carregar os veículos.')}</p>`;
  }
}

function setupRegisteredVehiclesToggle(getEmployees) {
  const button = document.getElementById('btnAlternarVeiculosCadastrados');
  const panel = document.getElementById('listaVeiculosCadastrados');
  const icon = document.getElementById('iconeVeiculosCadastrados');
  if (!button || !panel) return;

  button.addEventListener('click', async () => {
    const isOpening = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(isOpening));
    panel.hidden = !isOpening;
    if (icon) icon.className = `bi ${isOpening ? 'bi-chevron-up' : 'bi-chevron-down'}`;

    if (isOpening) await loadRegisteredVehicles(getEmployees);
  });
}

async function saveVehicles() {
  const inputBusca = document.getElementById('busca-funcionario-veiculo');
  const btnSalvar = document.getElementById('btnSalvarVeiculosAdmin');

  setFeedback('');
  inputBusca?.classList.remove('is-invalid');

  if (!funcionarioSelecionadoId) {
    setFeedback('Por favor, pesquise e selecione um funcionário antes de cadastrar o veículo.', 'erro');
    if (inputBusca) {
      inputBusca.classList.add('is-invalid');
      inputBusca.focus();
    }
    return;
  }
  const forms = [...document.querySelectorAll('[data-form-veiculo]')];
  const created = [];
  for (const form of forms) {
    const modelo = form.querySelector('.campo-modelo').value.trim();
    const placa = normalizePlate(form.querySelector('.campo-placa').value);
    const cor = form.querySelector('.campo-cor').value.trim();
    const tipo = form.querySelector('.campo-tipo:checked')?.value || 'carro';
 
    let erro = '';
    let campo = '';
    if (modelo.length < 2) {
      erro = 'Informe o modelo do veículo (mínimo 2 caracteres).';
      campo = '.campo-modelo';
    } else if (!['carro', 'moto'].includes(tipo)) {
      erro = 'Tipo inválido. Selecione carro ou moto.';
      campo = '.campo-tipo';
    } else if (!isValidPlate(placa)) {
      erro = `A placa ${placa || '(vazia)'} não é válida. Use o formato ABC1D23 ou ABC1234.`;
      campo = '.campo-placa';
    } else if (cor.length < 2 || !/^[A-Za-zÀ-ÿ\s]+$/.test(cor)) {
      erro = 'Informe uma cor válida (apenas letras).';
      campo = '.campo-cor';
    }
 
    if (erro) {
      window.alert(erro);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.querySelector(campo)?.focus();
      return;
    }

    veiculosParaCriar.push({
      idFuncionario: funcionarioSelecionadoId,
      tipoVeiculo: tipo,
      modeloVeiculo: modelo,
      corVeiculo: cor,
      anoVeiculo: ano,
      placaVeiculo: placa,
    });
  }

  if (!veiculosParaCriar.length) return;

  if (btnSalvar) btnSalvar.disabled = true;

  try {
    for (const payload of veiculosParaCriar) {
      await api('/veiculos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    setFeedback('Veículo(s) cadastrado(s) com sucesso!');

    document.getElementById('lista-forms-veiculo').innerHTML = '';
    formSequence = 0;
    addForm();

    funcionarioSelecionadoId = null;
    if (inputBusca) inputBusca.value = '';

    const badgeSelecionado = document.getElementById('funcionario-selecionado-badge');
    if (badgeSelecionado) badgeSelecionado.style.display = 'none';

    const selectResultados = document.getElementById('select-funcionario');
    if (selectResultados) selectResultados.style.display = 'none';

    const panel = document.getElementById('listaVeiculosCadastrados');
    if (panel && !panel.hidden) await loadRegisteredVehicles(getEmployeesProvider);
  } catch (error) {
    setFeedback(error.message || 'Erro ao cadastrar o(s) veículo(s).', 'erro');
  } finally {
    if (btnSalvar) btnSalvar.disabled = false;
  }
  if (!created.length) return;
  vehicles = [...vehicles, ...created];
  vehiclesRepo.save(vehicles);
  renderVehicleList(getEmployees);
  document.getElementById('lista-forms-veiculo').innerHTML = '';
  formSequence = 0;
  addForm();
}
 
export function initAdminVehicles(getEmployees) {
  getEmployeesProvider = getEmployees;
  funcionarioSelecionadoId = null;

  const inputBusca = document.getElementById('busca-funcionario-veiculo');
  if (inputBusca) inputBusca.value = '';

  const badgeSelecionado = document.getElementById('funcionario-selecionado-badge');
  if (badgeSelecionado) badgeSelecionado.style.display = 'none';

  const selectResultados = document.getElementById('select-funcionario');
  if (selectResultados) selectResultados.style.display = 'none';

  setFeedback('');
  setupEmployeeSearch(getEmployees);
  setupRegisteredVehiclesToggle(getEmployees);

  document.getElementById('btnAdicionarFormVeiculo')?.addEventListener('click', addForm);
  document.getElementById('btnSalvarVeiculosAdmin')?.addEventListener('click', () => saveVehicles(getEmployees));
 
  const formsContainer = document.getElementById('lista-forms-veiculo');
 
  formsContainer?.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remover-form-veiculo"]')) {
      event.target.closest('[data-form-veiculo]')?.remove();
      renumberForms();
    }
  });
 
  formsContainer?.addEventListener('input', (event) => {
    const el = event.target;
    if (el.matches('.campo-placa')) el.value = maskPlate(el.value);
    if (el.matches('.campo-cor')) el.value = el.value.replace(/[^A-Za-zÀ-ÿ\s]/g, '');
    if (el.matches('.campo-modelo')) el.value = el.value.replace(/[^A-Za-zÀ-ÿ0-9\s.\-]/g, '');
  });
 
  if (!document.querySelector('[data-form-veiculo]')) addForm();
}
