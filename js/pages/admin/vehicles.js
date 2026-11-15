import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';

let formSequence = 0;
let funcionarioSelecionadoId = null;

function setFeedback(message, type = 'sucesso') {
  const element = document.getElementById('veiculos-feedback');
  if (!element) {
    if (message) window.alert(message);
    return;
  }
  element.textContent = message;
  element.classList.toggle('text-danger', type === 'erro');
  element.classList.toggle('text-success', type === 'sucesso');
}

function addForm() {
  const container = document.getElementById('lista-forms-veiculo');
  if (!container) return;
  const id = ++formSequence;
  const number = container.querySelectorAll('[data-form-veiculo]').length + 1;

  container.insertAdjacentHTML(
    'beforeend',
    `<section class="card-form admin-form position-relative mb-3" data-form-veiculo="${id}">
      ${number > 1 ? '<button type="button" class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3" data-action="remover-form-veiculo" aria-label="Remover este veículo"><i class="bi bi-trash3" aria-hidden="true"></i></button>' : ''}
      <p class="veiculo-numero">Veículo ${number}</p>
      <div class="row g-3">
        <div class="col-md-7">
          <label class="form-label" for="modelo-${id}">Modelo</label>
          <input id="modelo-${id}" class="form-control campo-modelo" placeholder="Ex.: Onix, Fazer 250" required>
        </div>
        <fieldset class="col-md-5">
          <legend class="form-label">Tipo</legend>
          <div class="form-choice-row">
            <label class="form-check">
              <input class="form-check-input campo-tipo" type="radio" name="tipo-${id}" value="Carro" checked> Carro
            </label>
            <label class="form-check">
              <input class="form-check-input campo-tipo" type="radio" name="tipo-${id}" value="Moto"> Moto
            </label>
          </div>
        </fieldset>
        <div class="col-md-4">
          <label class="form-label" for="placa-${id}">Placa</label>
          <input id="placa-${id}" class="form-control campo-placa text-uppercase" maxlength="8" placeholder="ABC1D23" required>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="cor-${id}">Cor do veículo</label>
          <input id="cor-${id}" class="form-control campo-cor" placeholder="Ex.: Prata" required>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="ano-${id}">Ano</label>
          <input id="ano-${id}" type="number" class="form-control campo-ano" min="1950" max="2030" placeholder="Ex.: 2022" required>
        </div>
      </div>
    </section>`
  );
}

function renumberForms() {
  document.querySelectorAll('[data-form-veiculo] .veiculo-numero').forEach((element, index) => {
    element.textContent = `Veículo ${index + 1}`;
  });
}

function setupEmployeeSearch(getEmployees) {
  const inputBusca = document.getElementById('busca-funcionario-veiculo');
  const selectResultados = document.getElementById('select-funcionario');
  const badgeSelecionado = document.getElementById('funcionario-selecionado-badge');

  if (!inputBusca || !selectResultados) return;

  inputBusca.addEventListener('input', (e) => {
    const termo = e.target.value.trim().toLowerCase();
    const employees = getEmployees() || [];

    if (!termo) {
      selectResultados.style.display = 'none';
      return;
    }

    const filtrados = employees.filter(
      (emp) =>
        (emp.nome || '').toLowerCase().includes(termo) ||
        String(emp.identificacao || emp.id || '').toLowerCase().includes(termo)
    );

    if (filtrados.length > 0) {
      selectResultados.style.display = 'block';
      selectResultados.innerHTML = filtrados
        .map(
          (emp) =>
            `<option value="${escapeHtml(emp.id)}">${escapeHtml(emp.nome)} (ID: ${escapeHtml(emp.identificacao || emp.id)})</option>`
        )
        .join('');
    } else {
      selectResultados.style.display = 'block';
      selectResultados.innerHTML = '<option value="">Nenhum funcionário encontrado</option>';
    }
  });

  selectResultados.addEventListener('change', (e) => {
    const idSelecionado = e.target.value;
    if (!idSelecionado) return;

    const employees = getEmployees() || [];
    const emp = employees.find((item) => String(item.id) === String(idSelecionado));

    if (emp) {
      funcionarioSelecionadoId = Number(emp.id);
      inputBusca.value = emp.nome;
      inputBusca.classList.remove('is-invalid');
      selectResultados.style.display = 'none';

      if (badgeSelecionado) {
        badgeSelecionado.style.display = 'block';
        badgeSelecionado.textContent = `Funcionário selecionado: ${emp.nome} (ID: ${emp.identificacao || emp.id})`;
      }
    }
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
  const veiculosParaCriar = [];

  for (const form of forms) {
    const inputModelo = form.querySelector('.campo-modelo');
    const inputPlaca = form.querySelector('.campo-placa');
    const inputCor = form.querySelector('.campo-cor');
    const inputAno = form.querySelector('.campo-ano');

    [inputModelo, inputPlaca, inputCor, inputAno].forEach((el) => el?.classList.remove('is-invalid'));

    const modelo = inputModelo.value.trim();
    const placa = inputPlaca.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cor = inputCor.value.trim();
    const ano = Number(inputAno.value.trim());
    const tipo = form.querySelector('.campo-tipo:checked')?.value || 'Carro';

    if (!modelo) {
      setFeedback('Informe o modelo do veículo.', 'erro');
      inputModelo.classList.add('is-invalid');
      inputModelo.focus();
      return;
    }

    if (placa.length < 7) {
      setFeedback('Informe uma placa válida (ex: ABC1D23).', 'erro');
      inputPlaca.classList.add('is-invalid');
      inputPlaca.focus();
      return;
    }

    if (!cor) {
      setFeedback('Informe a cor do veículo.', 'erro');
      inputCor.classList.add('is-invalid');
      inputCor.focus();
      return;
    }

    if (!ano || ano < 1950 || ano > 2030) {
      setFeedback('Informe um ano válido para o veículo (ex: 2022).', 'erro');
      inputAno.classList.add('is-invalid');
      inputAno.focus();
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

    // Limpa formulários e reseta a seleção de funcionário
    document.getElementById('lista-forms-veiculo').innerHTML = '';
    formSequence = 0;
    addForm();

    funcionarioSelecionadoId = null;
    if (inputBusca) inputBusca.value = '';

    const badgeSelecionado = document.getElementById('funcionario-selecionado-badge');
    if (badgeSelecionado) badgeSelecionado.style.display = 'none';

    const selectResultados = document.getElementById('select-funcionario');
    if (selectResultados) selectResultados.style.display = 'none';
  } catch (error) {
    setFeedback(error.message || 'Erro ao cadastrar o(s) veículo(s).', 'erro');
  } finally {
    if (btnSalvar) btnSalvar.disabled = false;
  }
}

export function initAdminVehicles(getEmployees) {
  funcionarioSelecionadoId = null;

  const inputBusca = document.getElementById('busca-funcionario-veiculo');
  if (inputBusca) inputBusca.value = '';

  const badgeSelecionado = document.getElementById('funcionario-selecionado-badge');
  if (badgeSelecionado) badgeSelecionado.style.display = 'none';

  const selectResultados = document.getElementById('select-funcionario');
  if (selectResultados) selectResultados.style.display = 'none';

  setFeedback('');
  setupEmployeeSearch(getEmployees);

  document.getElementById('btnAdicionarFormVeiculo')?.addEventListener('click', addForm);
  document.getElementById('btnSalvarVeiculosAdmin')?.addEventListener('click', saveVehicles);

  document.getElementById('lista-forms-veiculo')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remover-form-veiculo"]')) {
      event.target.closest('[data-form-veiculo]')?.remove();
      renumberForms();
    }
  });

  if (!document.querySelector('[data-form-veiculo]')) addForm();
}