import { employeesRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

let employees = [];
let currentFilter = 'todos';

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
  const list = document.getElementById('lista-funcionarios');
  if (!list) return;
  const search = document.getElementById('busca-input')?.value.trim().toLocaleLowerCase('pt-BR') || '';
  const activeCount = employees.filter((employee) => employee.status === 'ativo').length;
  const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = String(value); };
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

function handleCreateEmployee(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = Number(document.getElementById('novo-func-id')?.value.trim());
  if (employees.some((employee) => Number(employee.id) === id)) {
    window.alert('Já existe um funcionário cadastrado com este ID.');
    return;
  }
  const employee = {
    id,
    nome: document.getElementById('novo-func-nome')?.value.trim() || '',
    telefone: document.getElementById('novo-func-telefone')?.value.trim() || '',
    email: document.getElementById('novo-func-email')?.value.trim() || '',
    pcd: document.querySelector('input[name="novo-func-pcd"]:checked')?.value || 'nao',
    cargo: 'Funcionário',
    status: 'ativo',
  };
  employees = employeesRepo.upsert(employee);
  form.reset();
  renderEmployees();
  document.querySelector('#sidebar [data-nav="funcionarios"]')?.click();
}

export function initAdminEmployees() {
  employees = employeesRepo.list();
  document.getElementById('busca-input')?.addEventListener('input', renderEmployees);
  document.querySelectorAll('[data-filtro]').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.filtro)));
  document.getElementById('formNovoFuncionarioAdmin')?.addEventListener('submit', handleCreateEmployee);
  document.getElementById('lista-funcionarios')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="alternar-funcionario"]');
    if (button) changeEmployeeStatus(button.dataset.id);
  });
  renderEmployees();
}
