//Arquivo:Front_Park/js/pages/admin/employees.js
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

/* ===== Contrato com a API de /funcionarios =====*/
const FIELD = {
  id: 'idFuncionario',
  nome: 'nomeFuncionario',
  telefone: 'telefoneFuncionario',
  email: 'emailFuncionario',
  pcd: 'pcdFuncionario',
  status: 'statusFuncionario',
};
const PCD_BOOLEANO = true;     // true: a API guarda PCD como true/false; false: como 'sim'/'nao'
const STATUS_BOOLEANO = false; // true: a API guarda ativo como true/false; false: como 'ativo'/'inativo'

const fromApi = (row) => ({
  id: row[FIELD.id],
  nome: row[FIELD.nome] ?? '',
  telefone: row[FIELD.telefone] ?? '',
  email: row[FIELD.email] ?? '',
  pcd: [true, 'sim', 'SIM', 1].includes(row[FIELD.pcd]) ? 'sim' : 'nao',
  status: row[FIELD.status] === undefined || [true, 'ativo', 'ATIVO'].includes(row[FIELD.status]) ? 'ativo' : 'inativo',
});

// Só envia o que foi informado (serve para criar e para editar parcialmente).
function toApi(data) {
  const body = {};
  if (data.id !== undefined) body[FIELD.id] = data.id;
  if (data.nome !== undefined) body[FIELD.nome] = data.nome;
  if (data.telefone !== undefined) body[FIELD.telefone] = data.telefone;
  if (data.email !== undefined) body[FIELD.email] = data.email;
  if (data.pcd !== undefined) body[FIELD.pcd] = PCD_BOOLEANO ? data.pcd === 'sim' : data.pcd;
  if (data.status !== undefined) body[FIELD.status] = STATUS_BOOLEANO ? data.status === 'ativo' : data.status;
  return body;
}

let employees = [];
let currentFilter = 'todos';
let editingId = null;

const $ = (id) => document.getElementById(id);

export const getEmployees = () => employees;

async function loadEmployees() {
  const rows = await api('/funcionarios');
  employees = rows.map(fromApi);
  renderEmployees();
  // avisa outros módulos (ex.: lista de funcionários no cadastro de veículos)
  document.dispatchEvent(new CustomEvent('funcionarios-atualizados'));
  return employees;
}

// Mantém a assinatura antiga (usada em requests.js): devolve a lista que já está em memória
// e atualiza em segundo plano.
export function refreshEmployees() {
  loadEmployees().catch(() => {});
  return employees;
}

async function saveEmployee(data, { creating }) {
  if (creating) {
    await api('/funcionarios', { method: 'POST', body: JSON.stringify(toApi(data)) });
  } else {
    const { id, ...changes } = data;
    await api(`/funcionarios/${id}`, { method: 'PUT', body: JSON.stringify(toApi(changes)) });
  }
  await loadEmployees();
}

// Mantém a assinatura antiga (usada em requests.js). Nunca rejeita: mostra o erro num alerta.
export async function upsertEmployee(employee) {
  try {
    const exists = employees.some((item) => String(item.id) === String(employee.id));
    const { cargo, ...data } = employee;
    const idValido = Number.isInteger(Number(data.id)) && Number(data.id) >= 1 && Number(data.id) <= 2147483647;
    if (!exists && !idValido) delete data.id; // ids antigos (Date.now()) não cabem: o banco gera um
    await saveEmployee(data, { creating: !exists });
  } catch (error) {
    window.alert(error.message);
  }
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

async function changeEmployeeStatus(id) {
  const employee = employees.find((item) => String(item.id) === String(id));
  if (!employee) return;
  try {
    await saveEmployee({ id: employee.id, status: employee.status === 'ativo' ? 'inativo' : 'ativo' }, { creating: false });
  } catch (error) {
    window.alert(error.message);
  }
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

async function handleCreateEmployee(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = {
    nome: $('novo-func-nome')?.value.trim() || '',
    telefone: $('novo-func-telefone')?.value.trim() || '',
    email: $('novo-func-email')?.value.trim() || '',
    pcd: document.querySelector('input[name="novo-func-pcd"]:checked')?.value || 'nao',
  };

  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    if (editingId !== null) {
      await saveEmployee({ id: editingId, ...data }, { creating: false });
      exitEditMode();
    } else {
      const id = Number($('novo-func-id')?.value.trim());
      if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
        window.alert('Informe um ID numérico válido (inteiro positivo).');
        return;
      }
      if (employees.some((employee) => Number(employee.id) === id)) {
        window.alert('Já existe um funcionário cadastrado com este ID.');
        return;
      }
      await saveEmployee({ id, ...data, status: 'ativo' }, { creating: true });
      form.reset();
    }
    document.querySelector('#sidebar [data-nav="funcionarios"]')?.click();
  } catch (error) {
    window.alert(error.message); // ex.: 409 (ID repetido) ou 400 (dado inválido), vindos da API
  } finally {
    if (submit) submit.disabled = false;
  }
}

/* ---------- Inicialização ---------- */

export function initAdminEmployees() {
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
  loadEmployees().catch((error) => {
    const list = $('lista-funcionarios');
    if (list) list.innerHTML = `<p class="text-center py-4 mb-0 empty-state">${escapeHtml(error.message)}</p>`;
  });
}