import { api } from '../services/auth.js';

let initialized = false;
let currentEmail = '';
let currentVehicles = [];

const MATRICULA_REGEX = /^\d{5}-\d{1}$/;

const byId = (id) => document.getElementById(id);

function formatMatricula(rawValue) {
  const numbers = String(rawValue || '').replace(/\D/g, '').slice(0, 6);
  if (!numbers) return '';
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 6)}`;
}

function formatTelefone(rawValue) {
  const numbers = String(rawValue || '').replace(/\D/g, '').slice(0, 11);
  if (!numbers) return '';
  
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    // Formato com 8 dígitos no número: (12) 3456-7890
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else {
    // Formato com 9 dígitos no número (celular): (12) 99999-9999
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
}

function setFeedback(message = '', tone = 'info') {
  const feedback = byId('perfil-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.tone = tone;
  feedback.hidden = !message;
}

function setLoading(loading) {
  const form = byId('form-funcionario');
  const submit = form?.querySelector('button[type="submit"]');
  if (submit) submit.disabled = loading;
}

function getFormData() {
  return {
    nomeFuncionario: byId('nomeFuncionario').value.trim(),
    telefoneFuncionario: byId('telefoneFuncionario').value.trim(),
    emailFuncionario: currentEmail,
    identificaOFuncionario: byId('identificaOFuncionario').value.trim(),
    pcdFuncionario: byId('pcdFuncionario').checked,
  };
}

function fillForm(funcionario = {}) {
  byId('nomeFuncionario').value = funcionario.nomeFuncionario || '';
  byId('telefoneFuncionario').value = formatTelefone(funcionario.telefoneFuncionario);
  byId('identificaOFuncionario').value = formatMatricula(funcionario.identificaOFuncionario);
  byId('pcdFuncionario').checked = funcionario.pcdFuncionario === true;
  byId('form-funcionario').dataset.idFuncionario = funcionario.idFuncionario || '';
}

const VEHICLE_FIELDS = [
  { key: 'tipoVeiculo', label: 'Tipo' },
  { key: 'modeloVeiculo', label: 'Modelo' },
  { key: 'corVeiculo', label: 'Cor' },
  { key: 'anoVeiculo', label: 'Ano' },
  { key: 'placaVeiculo', label: 'Placa' }
];

function createVehicleElement(tag, className, text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderVehicles(vehicles) {
  const list = byId('lista-meus-veiculos');
  const empty = byId('veiculos-vazio');

  if (!list || !empty) return;

  list.replaceChildren();

  if (!vehicles.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  vehicles.forEach((vehicle) => {
    const card = createVehicleElement(
      'article',
      'perfil-vehicle-card col-12 col-md-6'
    );

    card.dataset.idVeiculo = vehicle.idVeiculo;

    const content = createVehicleElement('div', 'p-3');

    const title = createVehicleElement(
      'h3',
      'h6 mb-2',
      `${vehicle.modeloVeiculo || 'Veículo'} · ${vehicle.placaVeiculo || 'Sem placa'}`
    );

    const details = createVehicleElement(
      'p',
      'mb-3 ds-text-secondary small',
      [
        vehicle.tipoVeiculo,
        vehicle.corVeiculo,
        vehicle.anoVeiculo
      ].filter(Boolean).join(' · ')
    );

    const actions = createVehicleElement(
      'div',
      'd-flex flex-wrap gap-2'
    );

    const editButton = createVehicleElement(
      'button',
      'btn ds-btn-outline',
      'Editar'
    );

    editButton.type = 'button';
    editButton.addEventListener('click', () => {
      renderVehicleEditor(card, vehicle);
    });

    const deleteButton = createVehicleElement(
      'button',
      'btn btn-outline-danger',
      'Remover'
    );

    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => {
      removeVehicle(vehicle.idVeiculo, deleteButton);
    });

    actions.append(editButton, deleteButton);
    content.append(title, details, actions);
    card.append(content);

    list.append(card);
  });
}

function renderVehicleEditor(card, vehicle) {
  if (!vehicle.idVeiculo) {
    setFeedback('Não foi possível identificar o veículo.', 'error');
    return;
  }

  if (card.querySelector('.vehicle-editor')) return;

  const editor = createVehicleElement(
    'form',
    'vehicle-editor mt-3'
  );

  const fieldsContainer = createVehicleElement(
    'div',
    'row g-3 mb-3'
  );

  VEHICLE_FIELDS.forEach(({ key, label }) => {
    const column = createVehicleElement('div', 'col-12 col-md-6');

    const inputId = `veiculo-${vehicle.idVeiculo}-${key}`;

    const fieldLabel = createVehicleElement(
      'label',
      'form-label',
      label
    );

    fieldLabel.htmlFor = inputId;

    const input = document.createElement('input');
    input.className = 'form-control';
    input.id = inputId;
    input.name = key;
    input.type = 'text';
    input.value = vehicle[key] ?? '';
    input.maxLength = 100;
    input.required = true;

    column.append(fieldLabel, input);
    fieldsContainer.append(column);
  });

  const buttons = createVehicleElement(
    'div',
    'd-flex flex-wrap gap-2'
  );

  const saveButton = createVehicleElement(
    'button',
    'btn ds-btn-primary',
    'Salvar alterações'
  );

  saveButton.type = 'submit';

  const cancelButton = createVehicleElement(
    'button',
    'btn ds-btn-outline',
    'Cancelar'
  );

  cancelButton.type = 'button';

  cancelButton.addEventListener('click', () => {
    editor.remove();
  });

  buttons.append(saveButton, cancelButton);
  editor.append(fieldsContainer, buttons);
  card.append(editor);

  editor.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!editor.reportValidity()) return;

    const plateInput = editor.elements.namedItem('placaVeiculo');

    const normalizedPlate = plateInput.value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    const duplicatePlate = currentVehicles.some((item) => {
      if (String(item.idVeiculo) === String(vehicle.idVeiculo)) {
        return false;
      }

      const existingPlate = String(item.placaVeiculo || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

      return existingPlate === normalizedPlate;
    });

    if (duplicatePlate) {
      window.alert(
        'Esta placa já está cadastrada em outro veículo. Informe uma placa diferente.'
      );

      plateInput.focus();
      return;
    }

    const changes = {};

    VEHICLE_FIELDS.forEach(({ key }) => {
      const input = editor.elements.namedItem(key);
      const newValue = input.value.trim();
      const oldValue = String(vehicle[key] ?? '');

      if (newValue !== oldValue) {
        changes[key] = newValue;
      }
    });

    if (Object.keys(changes).length === 0) {
      setFeedback('Nenhuma alteração foi realizada.', 'info');
      return;
    }

    saveButton.disabled = true;
    cancelButton.disabled = true;

    try {
      await api(`/veiculos/${encodeURIComponent(vehicle.idVeiculo)}`, {
        method: 'PUT',
        body: JSON.stringify(changes)
      });

      setFeedback('Veículo atualizado com sucesso.', 'success');

      await loadVehicles();

    } catch (error) {
      if (error.status === 409) {
        window.alert(
          'Esta placa já está cadastrada em outro veículo. Informe uma placa diferente.'
        );
      } else {
        setFeedback(
          `Não foi possível atualizar o veículo: ${error.message}`,
          'error'
        );
      }

      saveButton.disabled = false;
      cancelButton.disabled = false;
    }
  });
}

async function removeVehicle(idVeiculo, button) {
  if (!idVeiculo) {
    setFeedback('Não foi possível identificar o veículo.', 'error');
    return;
  }

  const confirmed = window.confirm(
    'Tem certeza de que deseja remover este veículo? Esta ação não poderá ser desfeita.'
  );

  if (!confirmed) return;

  button.disabled = true;

  try {
    await api(`/veiculos/${encodeURIComponent(idVeiculo)}`, {
      method: 'DELETE'
    });

    setFeedback('Veículo removido com sucesso.', 'success');
    await loadVehicles();
  } catch (error) {
    button.disabled = false;

    if (error.status === 409) {
      setFeedback(
        'Não foi possível remover este veículo porque existem registros associados a ele.',
        'error'
      );
      return;
    }

    if (error.status === 403) {
      setFeedback(
        'Você não tem autorização para remover este veículo.',
        'error'
      );
      return;
    }

    setFeedback(
      `Não foi possível remover o veículo: ${error.message}`,
      'error'
    );
  }
}

async function loadVehicles() {
  try {
    const vehicles = await api('/veiculos');

    currentVehicles = Array.isArray(vehicles) ? vehicles : [];

    renderVehicles(currentVehicles);
  } catch (error) {
    currentVehicles = [];
    renderVehicles([]);

    setFeedback(
      `Não foi possível carregar seus veículos: ${error.message}`,
      'error'
    );
  }
}

async function loadProfile() {
  const session = await api('/me');
  const user = session?.user || session;
  currentEmail = user?.email || '';
  byId('conta-nome').textContent = user?.username || 'Funcionário';
  byId('conta-email').textContent = currentEmail || 'E-mail não informado';
  byId('emailFuncionario').value = currentEmail;

  if (!user?.idFuncionario) {
    fillForm();
    byId('orientacao-ficha').hidden = false;
    byId('secao-veiculos').hidden = true;
    setFeedback('Complete sua ficha para liberar o cadastro e a visualização dos veículos.', 'info');
    return;
  }

  const funcionario = await api(`/funcionarios/${encodeURIComponent(user.idFuncionario)}`);
  fillForm(funcionario);
  byId('orientacao-ficha').hidden = true;
  byId('secao-veiculos').hidden = false;
  await loadVehicles();
}

function bindForm() {
  const form = byId('form-funcionario');
  if (!form || initialized) return;
  initialized = true;

  // --- MÁSCARA DE MATRÍCULA (12345-6) ---
  const inputIdentificacao = byId('identificaOFuncionario');
  if (inputIdentificacao) {
    inputIdentificacao.setAttribute('maxlength', '7');
    inputIdentificacao.setAttribute('placeholder', '12345-6');
    inputIdentificacao.setAttribute('inputmode', 'numeric');

    inputIdentificacao.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const allowedKeys = ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'];
      if (allowedKeys.includes(e.key)) return;
      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    });

    inputIdentificacao.addEventListener('beforeinput', (e) => {
      if (e.data && /\D/.test(e.data)) e.preventDefault();
    });

    inputIdentificacao.addEventListener('input', (e) => {
      e.target.value = formatMatricula(e.target.value);
    });

    inputIdentificacao.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      inputIdentificacao.value = formatMatricula(pasteData);
    });
  }

  // --- MÁSCARA DE TELEFONE ((12) 99999-9999) ---
  const inputTelefone = byId('telefoneFuncionario');
  if (inputTelefone) {
    inputTelefone.setAttribute('maxlength', '15');
    inputTelefone.setAttribute('placeholder', '(12) 99999-9999');
    inputTelefone.setAttribute('inputmode', 'numeric');

    inputTelefone.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const allowedKeys = ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'];
      if (allowedKeys.includes(e.key)) return;
      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    });

    inputTelefone.addEventListener('beforeinput', (e) => {
      if (e.data && /\D/.test(e.data)) e.preventDefault();
    });

    inputTelefone.addEventListener('input', (e) => {
      e.target.value = formatTelefone(e.target.value);
    });

    inputTelefone.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      inputTelefone.value = formatTelefone(pasteData);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = getFormData();
    if (!MATRICULA_REGEX.test(data.identificaOFuncionario)) {
      setFeedback('Informe a matrícula no formato 12345-6 (apenas números).', 'error');
      inputIdentificacao?.focus();
      return;
    }

    setLoading(true);
    setFeedback('Salvando sua ficha…', 'info');
    try {
      const idFuncionario = form.dataset.idFuncionario;
      const method = idFuncionario ? 'PUT' : 'POST';
      const path = idFuncionario ? `/funcionarios/${encodeURIComponent(idFuncionario)}` : '/funcionarios';
      await api(path, { method, body: JSON.stringify(data) });
      setFeedback('Ficha salva com sucesso.', 'success');
      await loadProfile();
    } catch (error) {
      setFeedback(error.message, 'error');
    } finally {
      setLoading(false);
    }
  });
}

export async function init() {
  bindForm();
  setFeedback('Carregando sua conta…', 'info');
  try {
    await loadProfile();
  } catch (error) {
    setFeedback(error.message, 'error');
  }
}