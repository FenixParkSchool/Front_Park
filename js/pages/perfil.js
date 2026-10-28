import { api } from '../services/auth.js';

let initialized = false;
let currentEmail = '';

const byId = (id) => document.getElementById(id);

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
  byId('telefoneFuncionario').value = funcionario.telefoneFuncionario || '';
  byId('identificaOFuncionario').value = funcionario.identificaOFuncionario || '';
  byId('pcdFuncionario').checked = funcionario.pcdFuncionario === true;
  byId('form-funcionario').dataset.idFuncionario = funcionario.idFuncionario || '';
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
    const card = document.createElement('article');
    card.className = 'perfil-vehicle-card';
    const title = document.createElement('h3');
    title.className = 'h6 mb-2';
    title.textContent = `${vehicle.modeloVeiculo} · ${vehicle.placaVeiculo}`;
    const details = document.createElement('p');
    details.className = 'mb-0 ds-text-secondary small';
    details.textContent = [vehicle.tipoVeiculo, vehicle.corVeiculo, vehicle.anoVeiculo]
      .filter(Boolean)
      .join(' · ');
    card.append(title, details);
    list.append(card);
  });
}

async function loadVehicles() {
  try {
    const vehicles = await api('/veiculos');
    renderVehicles(Array.isArray(vehicles) ? vehicles : []);
  } catch (error) {
    renderVehicles([]);
    setFeedback(`Não foi possível carregar seus veículos: ${error.message}`, 'error');
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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    setLoading(true);
    setFeedback('Salvando sua ficha…', 'info');
    try {
      const idFuncionario = form.dataset.idFuncionario;
      const method = idFuncionario ? 'PUT' : 'POST';
      const path = idFuncionario ? `/funcionarios/${encodeURIComponent(idFuncionario)}` : '/funcionarios';
      await api(path, { method, body: JSON.stringify(getFormData()) });
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
