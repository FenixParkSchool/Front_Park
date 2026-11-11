
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

/* ===== Contrato com a API de /funcionarios ===== */
const FIELD = {
  id: 'idFuncionario',
  idUsuario: 'idUsuario',
  identificacao: 'identificaOFuncionario',
  nome: 'nomeFuncionario',
  telefone: 'telefoneFuncionario',
  email: 'emailFuncionario',
  pcd: 'pcdFuncionario',
};

const fromApi = (row) => ({
  id: row[FIELD.id],
  idUsuario: row[FIELD.idUsuario] ?? null,
  identificacao: row[FIELD.identificacao] ?? '',
  nome: row[FIELD.nome] ?? '',
  telefone: row[FIELD.telefone] ?? '',
  email: row[FIELD.email] ?? '',
  pcd: row[FIELD.pcd] === true ? 'sim' : 'nao',
});

function toApi(data) {
  const body = {};

  if (data.idUsuario !== undefined) body[FIELD.idUsuario] = data.idUsuario;
  if (data.identificacao !== undefined) body[FIELD.identificacao] = data.identificacao;
  if (data.nome !== undefined) body[FIELD.nome] = data.nome;
  if (data.telefone !== undefined) body[FIELD.telefone] = data.telefone;
  if (data.email !== undefined) body[FIELD.email] = data.email;
  if (data.pcd !== undefined) body[FIELD.pcd] = data.pcd === 'sim';

  return body;
}

let employees = [];
let accounts = []; // Contas FUNCIONARIO sem ficha
let editingId = null;

const $ = (id) => document.getElementById(id);

export const getEmployees = () => employees;

async function loadEmployees() {
  const rows = await api('/funcionarios');

  employees = rows.map(fromApi);
  renderEmployees();

  loadAccounts().catch(() => {});

  document.dispatchEvent(new CustomEvent('funcionarios-atualizados'));

  return employees;
}

async function loadAccounts() {
  const users = await api('/admin/users');

  accounts = users.filter(
    (user) => user.role === 'FUNCIONARIO' && !user.idFuncionario
  );

  renderAccountSelect();
}

function renderAccountSelect() {
  const select = $('novo-func-conta');

  if (!select) return;

  select.replaceChildren(
    new Option(
      accounts.length
        ? 'Selecione a conta'
        : 'Nenhuma conta sem ficha disponível',
      ''
    )
  );

  for (const account of accounts) {
    select.add(
      new Option(
        `${account.username} (${account.email})`,
        account.idUsuario
      )
    );
  }
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

// Atualiza a lista e permite que outras telas solicitem a atualização.
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
    window.alert(error.message);
  }

  return employees;
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
      const linked = employee.idUsuario !== null;

      return `<article class="func-item">
        <div>
          <p>
            ${name}
            ${employee.pcd === 'sim'
              ? '<span class="badge text-bg-info ms-1">PCD</span>'
              : ''}
          </p>
          <p>
            <i class="bi bi-envelope me-1" aria-hidden="true"></i>${email}
            ·
            <i class="bi bi-telephone me-1" aria-hidden="true"></i>${phone}
          </p>
          <p><small>ID: ${ident}</small></p>
        </div>
        <div class="d-flex align-items-center gap-3">
          <span class="badge ${linked ? 'text-bg-success' : 'text-bg-secondary'}">
            ${linked ? 'Conta vinculada' : 'Sem conta'}
          </span>
          <button
            class="btn ds-btn-outline btn-sm"
            type="button"
            data-action="editar-funcionario"
            data-id="${id}"
          >
            <i class="bi bi-pencil-square" aria-hidden="true"></i> Editar
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
  const accountGroup = $('novo-func-conta-grupo');

  if (accountGroup) accountGroup.hidden = on;

  const accountSelect = $('novo-func-conta');

  if (accountSelect) accountSelect.required = !on;

  if (title) {
    title.textContent = on
      ? 'Editar funcionário'
      : 'Cadastrar funcionário';
  }

  if (desc) {
    desc.textContent = on
      ? 'Altere os dados necessários e salve para atualizar o cadastro.'
      : 'Preencha os dados abaixo para cadastrar manualmente um novo funcionário no sistema.';
  }

  if (saveText) {
    saveText.textContent = on
      ? 'Salvar alterações'
      : 'Salvar funcionário';
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
  const employee = employees.find(
    (item) => String(item.id) === String(id)
  );

  if (!employee) return;

  document
    .querySelector('#sidebar [data-nav="novo-funcionario"]')
    ?.click();

  editingId = employee.id;

  $('novo-func-id').value = employee.identificacao || '';
  $('novo-func-nome').value = employee.nome || '';
  $('novo-func-telefone').value = employee.telefone || '';
  $('novo-func-email').value = employee.email || '';

  const pcdInput = $(
    employee.pcd === 'sim' ? 'pcd-sim' : 'pcd-nao'
  );

  if (pcdInput) pcdInput.checked = true;

  setEditMode(true);
}

async function handleCreateEmployee(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const data = {
    identificacao: $('novo-func-id')?.value.trim() || '',
    nome: $('novo-func-nome')?.value.trim() || '',
    telefone: $('novo-func-telefone')?.value.trim() || '',
    email: $('novo-func-email')?.value.trim() || '',
    pcd:
      document.querySelector(
        'input[name="novo-func-pcd"]:checked'
      )?.value || 'nao',
  };

  const fail = (message) =>
    setFeedback('novo-func-feedback', message, 'erro');

  setFeedback('novo-func-feedback', '');

  if (!data.identificacao) {
    return fail('Informe o ID do funcionário.');
  }

  if (data.telefone.length > 15) {
    return fail('O telefone deve ter no máximo 15 caracteres.');
  }

  let idUsuario;

  if (editingId === null) {
    idUsuario = Number($('novo-func-conta')?.value);

    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
      return fail('Selecione a conta que será vinculada à ficha.');
    }
  }

  const submit = form.querySelector('[type="submit"]');

  if (submit) submit.disabled = true;

  try {
    let message;

    if (editingId !== null) {
      await saveEmployee(
        { id: editingId, ...data },
        { creating: false }
      );

      exitEditMode();
      message = 'Ficha atualizada com sucesso.';
    } else {
      await saveEmployee(
        { ...data, idUsuario },
        { creating: true }
      );

      form.reset();
      message = 'Ficha criada e vinculada à conta com sucesso.';
    }

    document
      .querySelector('#sidebar [data-nav="funcionarios"]')
      ?.click();

    setFeedback('funcionarios-feedback', message);
  } catch (error) {
    // Exibe erros da API, incluindo 409 (conta já vinculada).
    fail(error.message);
  } finally {
    if (submit) submit.disabled = false;
  }
}

export function initAdminEmployees() {
  $('busca-input')?.addEventListener('input', renderEmployees);

  $('formNovoFuncionarioAdmin')?.addEventListener(
    'submit',
    handleCreateEmployee
  );

  $('lista-funcionarios')?.addEventListener('click', (event) => {
    const editBtn = event.target.closest(
      '[data-action="editar-funcionario"]'
    );

    if (editBtn) {
      startEdit(editBtn.dataset.id);
      return;
    }
  });

  document
    .querySelectorAll('#sidebar [data-nav], [data-action="ir-para-tela"]')
    .forEach((btn) => {
      btn.addEventListener('click', exitEditMode);
    });

  $('btn-cancelar-edicao')?.addEventListener('click', () => {
    exitEditMode();

    document
      .querySelector('#sidebar [data-nav="funcionarios"]')
      ?.click();
  });

  renderEmployees();

  loadEmployees().catch((error) => {
    const list = $('lista-funcionarios');

    if (list) {
      list.innerHTML = `<p class="text-center py-4 mb-0 empty-state">${escapeHtml(error.message)}</p>`;
    }
  });
}
//
