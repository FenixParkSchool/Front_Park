import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

/* ==========================================================================
   1. MÓDULO DE VAGAS (Novo layout otimizado em grid compacto por categoria)
   ========================================================================== */

let vagas = [];

export async function loadVagas() {
  try {
    // Se preferir buscar da API real, descomente abaixo:
    // const rows = await api('/vagas');
    
    // Simulação estruturada baseada nas categorias (PCD, Carga, Comum, Moto, Senac)
    vagas = gerarVagasSimuladas();
    renderVagas();
  } catch (error) {
    console.error('Erro ao carregar vagas:', error);
  }
}

function gerarVagasSimuladas() {
  let lista = [];
  for (let i = 1; i <= 3; i++) lista.push({ id: i, nome: `Vaga ${i}`, categoria: 'PCD', status: 'livre' });
  for (let i = 4; i <= 4; i++) lista.push({ id: i, nome: `Vaga ${i}`, categoria: 'Carga', status: 'livre' });
  for (let i = 5; i <= 23; i++) lista.push({ id: i, nome: `Vaga ${i}`, categoria: 'Comum', status: 'livre' });
  for (let i = 24; i <= 39; i++) lista.push({ id: i, nome: `Vaga ${i}`, categoria: 'Moto', status: 'livre' });
  for (let i = 40; i <= 54; i++) lista.push({ id: i, nome: `Vaga ${i}`, categoria: 'Comum', status: 'livre' });
  for (let i = 55; i <= 57; i++) lista.push({ id: i, nome: `Vaga ${i}`, categoria: 'Senac', status: 'livre' });
  return lista;
}

function renderVagas() {
  const container = document.getElementById('grupos-vagas');
  if (!container) return;

  const totalCountEl = document.getElementById('total-vagas-count');
  if (totalCountEl) totalCountEl.textContent = vagas.length;

  if (!vagas.length) {
    container.innerHTML = '<p class="text-center py-4 mb-0 text-muted">Nenhuma vaga cadastrada.</p>';
    return;
  }

  // Agrupar por categoria
  const agrupadas = vagas.reduce((acc, vaga) => {
    if (!acc[vaga.categoria]) acc[vaga.categoria] = [];
    acc[vaga.categoria].push(vaga);
    return acc;
  }, {});

  container.innerHTML = Object.entries(agrupadas).map(([categoria, items]) => {
    const itemsHtml = items.map(vaga => {
      const id = escapeHtml(vaga.id);
      const nome = escapeHtml(vaga.nome);
      const statusClass = vaga.status === 'ocupada' ? 'ocupada' : 'livre';

      return `
        <div class="vaga-card ${statusClass}" onclick="window.gerenciarVaga('${id}')" title="Clique para gerenciar">
          <span class="fw-bold">${nome}</span>
          <i class="bi bi-car-front icone-vaga"></i>
        </div>
      `;
    }).join('');

    return `
      <div class="vagas-grupo">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h2 class="mb-0 fw-semibold">${escapeHtml(categoria)}</h2>
          <span class="badge bg-secondary-subtle text-secondary border px-2 py-1">${items.length} vagas</span>
        </div>
        <div class="vagas-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');
}

window.gerenciarVaga = function(id) {
  console.log('Gerenciar vaga ID:', id);
  // Conecte aqui a abertura do modal de edição ou exclusão da vaga
};


/* ==========================================================================
   2. MÓDULO DE FUNCIONÁRIOS (Seu código original preservado integralmente)
   ========================================================================== */

const FIELD = {
  id: 'idFuncionario',
  identificacao: 'identificaOFuncionario',
  nome: 'nomeFuncionario',
  telefone: 'telefoneFuncionario',
  email: 'emailFuncionario',
  pcd: 'pcdFuncionario',
  ativo: 'ativoFuncionario',
};

const getRowValue = (row, keys) => {
  for (const key of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return undefined;
};

const getErrorMessage = (error) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado.';
};

const fromApi = (row = {}) => ({
  id: getRowValue(row, [FIELD.id, 'id', 'idFuncionario']),
  identificacao: getRowValue(row, [FIELD.identificacao, 'identificacao', 'identificaOFuncionario']) ?? '',
  nome: getRowValue(row, [FIELD.nome, 'nome', 'nomeFuncionario']) ?? '',
  telefone: getRowValue(row, [FIELD.telefone, 'telefone', 'telefoneFuncionario']) ?? '',
  email: getRowValue(row, [FIELD.email, 'email', 'emailFuncionario']) ?? '',
  pcd: getRowValue(row, [FIELD.pcd, 'pcd', 'pcdFuncionario']) === true || getRowValue(row, [FIELD.pcd, 'pcd', 'pcdFuncionario']) === 'sim' ? 'sim' : 'nao',
  ativo: getRowValue(row, [FIELD.ativo, 'ativo', 'ativoFuncionario']) !== undefined ? getRowValue(row, [FIELD.ativo, 'ativo', 'ativoFuncionario']) : true,
});

function toApi(data) {
  const body = {};

  if (data.identificacao !== undefined) body[FIELD.identificacao] = data.identificacao;
  if (data.nome !== undefined) body[FIELD.nome] = data.nome;
  if (data.telefone !== undefined) body[FIELD.telefone] = data.telefone;
  if (data.email !== undefined) body[FIELD.email] = data.email;
  if (data.pcd !== undefined) body[FIELD.pcd] = data.pcd === 'sim' || data.pcd === true || data.pcd === 'true';
  if (data.ativo !== undefined) body[FIELD.ativo] = data.ativo === true || data.ativo === 'true' || data.ativo === 1;

  return body;
}

let employees = [];
let editingId = null;

const $ = (id) => document.getElementById(id);

export const getEmployees = () => employees;

async function loadEmployees() {
  const rows = await api('/funcionarios');

  employees = rows.map(fromApi);
  renderEmployees();

  document.dispatchEvent(new CustomEvent('funcionarios-atualizados'));

  return employees;
}

function setFeedback(id, message, type = 'sucesso') {
  const element = $(id);

  if (!element) {
    if (message) window.alert(message);
    return;
  }

  element.textContent = message;
  element.classList.toggle('text-danger', type === 'erro');
  element.classList.toggle('text-success', type === 'sucesso');
}

export async function refreshEmployees() {
  try {
    await loadEmployees();
  } catch (error) {
    console.error('Erro ao atualizar funcionários:', error);
  }

  return employees;
}

async function saveEmployee(data, { creating }) {
  if (creating) {
    await api('/funcionarios', {
      method: 'POST',
      body: JSON.stringify(toApi(data)),
    });
  } else {
    const { id, ...changes } = data;

    await api(`/funcionarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApi(changes)),
    });
  }

  await loadEmployees();
}

export async function upsertEmployee(employee) {
  try {
    const exists = employees.some(
      (item) => String(item.id) === String(employee.id)
    );

    const { cargo, ...data } = employee;

    const idValido =
      Number.isInteger(Number(data.id)) &&
      Number(data.id) >= 1 &&
      Number(data.id) <= 2147483647;

    if (!exists && !idValido) {
      delete data.id;
    }

    await saveEmployee(data, { creating: !exists });
  } catch (error) {
    window.alert(getErrorMessage(error));
  }

  return employees;
}

async function toggleEmployeeStatus(id, currentStatus) {
  try {
    const novoStatus = !currentStatus;
    await api(`/admin/funcionarios/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo: novoStatus }),
    });
    
    setFeedback('funcionarios-feedback', `Funcionário ${novoStatus ? 'ativado' : 'desativado'} com sucesso.`);
    await loadEmployees();
  } catch (error) {
    window.alert('Erro ao alterar status: ' + getErrorMessage(error));
  }
}

function renderEmployees() {
  const list = $('lista-funcionarios');

  if (!list) return;

  const search =
    $('busca-input')?.value.trim().toLocaleLowerCase('pt-BR') || '';

  const filtered = employees.filter((employee) =>
    (employee.nome || '').toLocaleLowerCase('pt-BR').includes(search)
  );

  if (!filtered.length) {
    list.innerHTML =
      '<p class="text-center py-4 mb-0 empty-state">Nenhum funcionário encontrado para essa busca.</p>';
    return;
  }

  list.innerHTML = filtered
    .map((employee) => {
      const id = escapeHtml(employee.id);
      const name = escapeHtml(employee.nome || '');
      const email = escapeHtml(employee.email || '');
      const phone = escapeHtml(employee.telefone || '');
      const ident = escapeHtml(employee.identificacao || '');
      const isAtivo = employee.ativo !== false;

      const badgeStatus = isAtivo 
        ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Ativo</span>'
        : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">Inativo</span>';

      const btnToggleText = isAtivo ? 'Desativar' : 'Ativar';
      const btnToggleClass = isAtivo ? 'btn-outline-danger' : 'btn-outline-success';
      const btnToggleIcon = isAtivo ? 'bi-slash-circle' : 'bi-check-circle';

      return `<article class="func-item p-3 mb-3 border rounded shadow-sm bg-white d-flex justify-content-between align-items-center">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <h5 class="mb-0 fw-bold text-dark">${name}</h5>
            ${badgeStatus}
            ${employee.pcd === 'sim' ? '<span class="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">PCD</span>' : ''}
          </div>
          <p class="mb-1 text-muted small">
            <i class="bi bi-envelope me-1" aria-hidden="true"></i>${email || 'Não informado'} &bull; 
            <i class="bi bi-telephone ms-2 me-1" aria-hidden="true"></i>${phone || 'Não informado'}
          </p>
          <p class="mb-0 text-secondary"><small><strong>ID:</strong> ${ident}</small></p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button
            class="btn ds-btn-outline btn-sm d-inline-flex align-items-center gap-1"
            type="button"
            data-action="editar-funcionario"
            data-id="${id}"
          >
            <i class="bi bi-pencil-square" aria-hidden="true"></i> Editar
          </button>
          <button
            class="btn ${btnToggleClass} btn-sm d-inline-flex align-items-center gap-1"
            type="button"
            data-action="toggle-status"
            data-id="${id}"
            data-status="${isAtivo}"
          >
            <i class="bi ${btnToggleIcon}" aria-hidden="true"></i> ${btnToggleText}
          </button>
        </div>
      </article>`;
    })
    .join('');
}

function setEditMode(on) {
  const title = $('titulo-novo-funcionario');
  const desc = $('desc-novo-funcionario');
  const saveText = $('btn-salvar-func-texto');
  const cancelBtn = $('btn-cancelar-edicao');

  if (title) {
    title.textContent = on ? 'Editar funcionário' : 'Cadastrar funcionário';
  }

  if (desc) {
    desc.textContent = on
      ? 'Altere os dados necessários e salve para atualizar o cadastro.'
      : 'Preencha os dados abaixo para cadastrar manualmente um novo funcionário no sistema.';
  }

  if (saveText) {
    saveText.textContent = on ? 'Salvar alterações' : 'Salvar funcionário';
  }

  if (cancelBtn) cancelBtn.hidden = !on;
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

  document.querySelector('#sidebar [data-nav="novo-funcionario"]')?.click();

  editingId = employee.id;

  $('novo-func-id').value = employee.identificacao || '';
  $('novo-func-nome').value = employee.nome || '';
  $('novo-func-telefone').value = employee.telefone || '';
  $('novo-func-email').value = employee.email || '';

  const pcdInput = $(employee.pcd === 'sim' ? 'pcd-sim' : 'pcd-nao');
  if (pcdInput) pcdInput.checked = true;

  setEditMode(true);
}

async function handleCreateEmployee(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const inputId = $('novo-func-id');
  const inputNome = $('novo-func-nome');
  const inputTelefone = $('novo-func-telefone');
  const inputEmail = $('novo-func-email');

  const data = {
    identificacao: inputId?.value.trim() || '',
    nome: inputNome?.value.trim() || '',
    telefone: inputTelefone?.value.trim() || '',
    email: inputEmail?.value.trim() || '',
    pcd: document.querySelector('input[name="novo-func-pcd"]:checked')?.value || 'nao',
  };

  [inputId, inputNome, inputTelefone, inputEmail].forEach((input) => {
    input?.classList.remove('is-invalid');
  });

  const fail = (message, campoComErro) => {
    setFeedback('novo-func-feedback', message, 'erro');
    if (campoComErro) {
      campoComErro.classList.add('is-invalid');
      campoComErro.focus();
    }
  };

  setFeedback('novo-func-feedback', '');

  if (!data.identificacao) {
    return fail('Informe o ID do funcionário.', inputId);
  }

  const partesNome = data.nome.split(' ').filter(Boolean);
  if (partesNome.length < 2) {
    return fail('Por favor, informe o nome completo (nome e sobrenome).', inputNome);
  }

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(data.email)) {
    return fail('Por favor, insira um e-mail válido.', inputEmail);
  }

  const apenasNumerosTelefone = data.telefone.replace(/\D/g, '');
  if (apenasNumerosTelefone.length < 10 || apenasNumerosTelefone.length > 11) {
    return fail('O telefone deve conter DDD + número válido.', inputTelefone);
  }

  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    let message;

    if (editingId !== null) {
      await saveEmployee({ id: editingId, ...data }, { creating: false });
      exitEditMode();
      message = 'Ficha atualizada com sucesso.';
    } else {
      await saveEmployee(data, { creating: true });
      form.reset();
      message = 'Funcionário cadastrado com sucesso.';
    }

    document.querySelector('#sidebar [data-nav="funcionarios"]')?.click();
    setFeedback('funcionarios-feedback', message);
  } catch (error) {
    fail(getErrorMessage(error));
  } finally {
    if (submit) submit.disabled = false;
  }
}

export function initAdminEmployees() {
  $('busca-input')?.addEventListener('input', renderEmployees);

  $('formNovoFuncionarioAdmin')?.addEventListener('submit', handleCreateEmployee);

  $('lista-funcionarios')?.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-action="editar-funcionario"]');
    if (editBtn) {
      startEdit(editBtn.dataset.id);
      return;
    }

    const toggleBtn = event.target.closest('[data-action="toggle-status"]');
    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      const currentStatus = toggleBtn.dataset.status === 'true';
      toggleEmployeeStatus(id, currentStatus);
      return;
    }
  });

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
    if (list) {
      list.innerHTML = `<p class="text-center py-4 mb-0 empty-state">${escapeHtml(error.message)}</p>`;
    }
  });

  // Inicializa também as vagas ao carregar o painel administrativo
  loadVagas();
}