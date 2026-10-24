import { vehiclesRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

let formSequence = 0;
let vehicles = [];

function renderVehicleList(getEmployees) {
  const container = document.getElementById('lista-veiculos-cadastrados');
  if (!container) return;
  if (!vehicles.length) {
    container.innerHTML = '<p class="empty-state">Nenhum veículo cadastrado ainda.</p>';
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
    <div class="col-md-7"><label class="form-label" for="modelo-${id}">Modelo</label><input id="modelo-${id}" class="form-control campo-modelo" placeholder="Ex.: Onix, Fazer 250" required></div>
    <fieldset class="col-md-5"><legend class="form-label">Tipo</legend><div class="form-choice-row"><label class="form-check"><input class="form-check-input campo-tipo" type="radio" name="tipo-${id}" value="carro" checked> Carro</label><label class="form-check"><input class="form-check-input campo-tipo" type="radio" name="tipo-${id}" value="moto"> Moto</label></div></fieldset>
    <div class="col-md-6"><label class="form-label" for="placa-${id}">Placa</label><input id="placa-${id}" class="form-control campo-placa text-uppercase" maxlength="8" placeholder="ABC1D23" required></div>
    <div class="col-md-6"><label class="form-label" for="cor-${id}">Cor do veículo</label><input id="cor-${id}" class="form-control campo-cor" placeholder="Ex.: Prata" required></div></div>
  </section>`);
}

function renumberForms() {
  document.querySelectorAll('[data-form-veiculo] .veiculo-numero').forEach((element, index) => { element.textContent = `Veículo ${index + 1}`; });
}

function saveVehicles(getEmployees) {
  const select = document.getElementById('select-funcionario');
  if (!select?.value) {
    window.alert('Selecione um funcionário válido.');
    return;
  }
  const forms = [...document.querySelectorAll('[data-form-veiculo]')];
  const created = [];
  for (const form of forms) {
    const modelo = form.querySelector('.campo-modelo').value.trim();
    const placa = form.querySelector('.campo-placa').value.trim().toUpperCase();
    const cor = form.querySelector('.campo-cor').value.trim();
    const tipo = form.querySelector('.campo-tipo:checked')?.value || 'carro';
    if (!modelo || !placa || !cor) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.querySelector(':invalid')?.focus();
      return;
    }
    created.push({ id: Date.now() + created.length, funcionarioId: Number(select.value), modelo, tipo, placa, cor });
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
  vehicles = vehiclesRepo.list();
  populateEmployees(getEmployees);
  renderVehicleList(getEmployees);
  document.getElementById('btnAdicionarFormVeiculo')?.addEventListener('click', addForm);
  document.getElementById('btnSalvarVeiculosAdmin')?.addEventListener('click', () => saveVehicles(getEmployees));
  document.getElementById('lista-forms-veiculo')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remover-form-veiculo"]')) {
      event.target.closest('[data-form-veiculo]')?.remove();
      renumberForms();
    }
  });
  if (!document.querySelector('[data-form-veiculo]')) addForm();
}
