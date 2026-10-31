import { employeesRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

let employees = [];
let currentFilter = 'todos';
let editingId = null;

const $ = (id) => document.getElementById(id);

export const getEmployees = () => employees;

export function refreshEmployees() {
  employees = employeesRepo.list();
  renderEmployees();
  return employees;
}

export function upsertEmployee(employee) {
  employees = employeesRepo.upsert(employee);
  renderEmployees();
  return employees;
}

function renderEmployees() {
  const list = $('lista-funcionarios');
  if (!list) return;
  const search = $('busca-input')?.value.trim().toLocaleLowerCase('pt-BR') || '';
  const activeCount = employees.filter((employee) => employee.status === 'ativo').length;
  const setText = (id, value) => { const element = $(id); if (element) element.textContent = String(value); };
  setText('cont-todos', employees.length);
  setText('cont-ativos', activeCount);
  setText('cont-inativos', employees.length - activeCount);
  const filtered = employees.filter((employee) => {
    const matchesSearch = (employee.nome || '').toLocaleLowerCase('pt-BR').includes(search);
    return matchesSearch && (currentFilter === 'todos' || employee.status === currentFilter);
  });

  if (!filtered.length) {
    list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhum funcionário encontrado para essa busca.</p>';
    return;
  }

  list.innerHTML = filtered.map((employee) => {
    const id = escapeHtml(employee.id);
    const name = escapeHtml(employee.nome || '');
    const email = escapeHtml(employee.email || '');
    const phone = escapeHtml(employee.telefone || '');
    const isActive = employee.status === 'ativo';
    return `<article class="func-item">
      <div><p>${name} ${employee.pcd === 'sim' ? '<span class="badge text-bg-info ms-1">PCD</span>' : ''}</p>
      <p><i class="bi bi-envelope me-1" aria-hidden="true"></i>${email} · <i class="bi bi-telephone me-1" aria-hidden="true"></i>${phone}</p></div>
      <div class="d-flex align-items-center gap-3"><span class="badge ${isActive ? 'text-bg-success' : 'text-bg-danger'}">${isActive ? 'Ativo' : 'Inativo'}</span>
      <button class="btn ds-btn-outline btn-sm" type="button" data-action="editar-funcionario" data-id="${id}"><i class="bi bi-pencil-square" aria-hidden="true"></i> Editar</button>
      <button class="btn ds-btn-outline btn-sm" type="button" data-action="alternar-funcionario" data-id="${id}"><i class="bi ${isActive ? 'bi-person-dash' : 'bi-person-check'}" aria-hidden="true"></i> ${isActive ? 'Desativar' : 'Ativar'}</button></div>
    </article>`;
  }).join('');
}

function changeEmployeeStatus(id) {
  const employee = employees.find((item) => String(item.id) === String(id));
  if (!employee) return;
  employees = employeesRepo.upsert({ ...employee, status: employee.status === 'ativo' ? 'inativo' : 'ativo' });
  renderEmployees();
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('[data-filtro]').forEach((button) => {
    button.classList.toggle('active', button.dataset.filtro === filter);
  });
  renderEmployees();
}

/* ---------- Modo edição ---------- */

function setEditMode(on) {
  const title = $('titulo-novo-funcionario');
  const desc = $('desc-novo-funcionario');
  const saveText = $('btn-salvar-func-texto');
  const cancelBtn = $('btn-cancelar-edicao');
  const idInput = $('novo-func-id');

  if (title) title.textContent = on ? 'Editar funcionário' : 'Cadastrar funcionário';
  if (desc) {
    desc.textContent = on
      ? 'Altere os dados necessários e salve para atualizar o cadastro.'
      : 'Preencha os dados abaixo para cadastrar manualmente um novo funcionário no sistema.';
  }
  if (saveText) saveText.textContent = on ? 'Salvar alterações' : 'Salvar funcionário';
  if (cancelBtn) cancelBtn.hidden = !on;
  if (idInput) idInput.readOnly = on;
}

function exitEditMode() {
  if (editingId === null) return;
  editingId = null;
  $('formNovoFuncionarioAdmin')?.reset();
  setEditMode(false);
}

function startEdit(id) {
  const employee = employees.find((item) => String(item.id) === String(id));
  if (!employee) return;

  // Navega primeiro (o clique na navegação reseta o modo edição) e só depois preenche
  document.querySelector('#sidebar [data-nav="novo-funcionario"]')?.click();

  editingId = employee.id;
  $('novo-func-id').value = employee.id;
  $('novo-func-nome').value = employee.nome || '';
  $('novo-func-telefone').value = employee.telefone || '';
  $('novo-func-email').value = employee.email || '';
  const pcdInput = $(employee.pcd === 'sim' ? 'pcd-sim' : 'pcd-nao');
  if (pcdInput) pcdInput.checked = true;
  setEditMode(true);
}

/* ---------- Criar / salvar ---------- */

function handleCreateEmployee(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = {
    nome: $('novo-func-nome')?.value.trim() || '',
    telefone: $('novo-func-telefone')?.value.trim() || '',
    email: $('novo-func-email')?.value.trim() || '',
    pcd: document.querySelector('input[name="novo-func-pcd"]:checked')?.value || 'nao',
  };

  if (editingId !== null) {
    const current = employees.find((item) => String(item.id) === String(editingId));
    if (!current) return;
    employees = employeesRepo.upsert({ ...current, ...data });
    exitEditMode();
  } else {
    const id = Number($('novo-func-id')?.value.trim());
    if (employees.some((employee) => Number(employee.id) === id)) {
      window.alert('Já existe um funcionário cadastrado com este ID.');
      return;
    }
    employees = employeesRepo.upsert({ id, ...data, cargo: 'Funcionário', status: 'ativo' });
    form.reset();
  }

  renderEmployees();
  document.querySelector('#sidebar [data-nav="funcionarios"]')?.click();
}

/* ---------- Inicialização ---------- */

export function initAdminEmployees() {
  employees = employeesRepo.list();

  $('busca-input')?.addEventListener('input', renderEmployees);

  document.querySelectorAll('[data-filtro]').forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filtro));
  });

  $('formNovoFuncionarioAdmin')?.addEventListener('submit', handleCreateEmployee);

  $('lista-funcionarios')?.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-action="editar-funcionario"]');
    if (editBtn) {
      startEdit(editBtn.dataset.id);
      return;
    }
    const toggleBtn = event.target.closest('[data-action="alternar-funcionario"]');
    if (toggleBtn) changeEmployeeStatus(toggleBtn.dataset.id);
  });

  // Qualquer clique na navegação lateral (ou no botão "Novo funcionário") sai do modo edição
  document.querySelectorAll('#sidebar [data-nav], [data-action="ir-para-tela"]').forEach((btn) => {
    btn.addEventListener('click', exitEditMode);
  });

  $('btn-cancelar-edicao')?.addEventListener('click', () => {
    exitEditMode();
    document.querySelector('#sidebar [data-nav="funcionarios"]')?.click();
  });

  renderEmployees();
}