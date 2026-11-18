// Arquivo: Front_Park/js/pages/cadastro-veiculo/index.js
import { api } from "/js/services/auth.js";
import { isValidPlate, normalizePlate, maskPlate } from "/js/shared/utils.js";

// Estilos da tela
function injectStyles() {
  if (document.getElementById('vehicle-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'vehicle-card-styles';
  style.textContent = `
    .vehicle-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--park-border, #dfe7f5);
    }
    .vehicle-card-header .vehicle-number { margin-bottom: 0; font-size: 1.05rem; }

    .vehicle-type-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .vehicle-type-option { position: relative; }
    .vehicle-type-option input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .vehicle-type-option label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      margin: 0;
      padding: 16px 12px;
      border: 1.5px solid #d5dfef;
      border-radius: 12px;
      background: #fff;
      color: var(--park-muted, #64748b);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .vehicle-type-option label i { font-size: 1.6rem; }
    .vehicle-type-option label:hover {
      border-color: var(--park-primary, #1d397d);
      color: var(--park-primary, #1d397d);
    }
    .vehicle-type-option input:checked + label {
      border-color: var(--park-primary, #1d397d);
      background: #eef4ff;
      color: var(--park-primary, #1d397d);
      box-shadow: 0 0 0 3px rgba(29, 57, 125, 0.12);
    }
    .vehicle-type-option input:focus-visible + label {
      outline: 2px solid var(--park-primary, #1d397d);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

let vehicleSeq = 0;

const removeButtonHtml =
  '<button type="button" class="btn btn-sm btn-outline-danger remover-veiculo" aria-label="Remover veículo"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>';

function createVehicleCard(index) {
  const uid = vehicleSeq++;
  const card = document.createElement('section');
  card.className = 'card-vehicle';
  card.innerHTML = `
    <div class="vehicle-card-header">
      <div class="vehicle-number">Veículo ${index + 1}</div>
      ${index > 0 ? removeButtonHtml : ''}
    </div>

    <div class="row g-3">
      <div class="col-12">
        <span class="form-label d-block">Tipo do veículo</span>
        <div class="vehicle-type-options" role="radiogroup" aria-label="Tipo do veículo">
          <div class="vehicle-type-option">
            <input type="radio" class="campo-tipo" name="tipo-${uid}" id="tipo-carro-${uid}" value="carro" checked>
            <label for="tipo-carro-${uid}"><i class="fa-solid fa-car-side" aria-hidden="true"></i> Carro</label>
          </div>
          <div class="vehicle-type-option">
            <input type="radio" class="campo-tipo" name="tipo-${uid}" id="tipo-moto-${uid}" value="moto">
            <label for="tipo-moto-${uid}"><i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Moto</label>
          </div>
        </div>
      </div>

      <div class="col-md-8">
        <label class="form-label" for="modelo-${uid}">Modelo</label>
        <input id="modelo-${uid}" type="text" class="form-control campo-modelo" placeholder="Ex.: Corolla, CG 160" minlength="2" maxlength="50" required>
      </div>
      <div class="col-md-4">
        <label class="form-label" for="ano-${uid}">Ano</label>
        <input id="ano-${uid}" type="text" inputmode="numeric" class="form-control campo-ano" maxlength="4" placeholder="2024" required>
      </div>
      <div class="col-md-6">
        <label class="form-label" for="cor-${uid}">Cor</label>
        <input id="cor-${uid}" type="text" class="form-control campo-cor" placeholder="Ex.: Prata" minlength="2" maxlength="30" required>
      </div>
      <div class="col-md-6">
        <label class="form-label" for="placa-${uid}">Placa</label>
        <input id="placa-${uid}" type="text" class="form-control campo-placa text-uppercase" placeholder="ABC1D23" maxlength="7" autocomplete="off" required>
      </div>
    </div>`;
  return card;
}

export function init() {
  console.log('Inicializando tela de cadastro de veículos...');
  const container = document.getElementById('listaVeiculos');
  const form = document.getElementById('formVeiculos');
  
  if (!container || !form) {
    console.error('Elementos principais do formulário de veículos não encontrados no DOM.');
    return;
  }

  injectStyles();

  const addForm = () => container.appendChild(createVehicleCard(container.querySelectorAll('.card-vehicle').length));
  const renumber = () => [...container.querySelectorAll('.card-vehicle')].forEach((card, index) => {
    card.querySelector('.vehicle-number').textContent = `Veículo ${index + 1}`;
    const button = card.querySelector('.remover-veiculo');
    if (index === 0) button?.remove();
    else if (!button) {
      card.querySelector('.vehicle-card-header').insertAdjacentHTML('beforeend', removeButtonHtml);
    }
  });

  document.getElementById('btnAdicionarVeiculo')?.addEventListener('click', addForm);
  
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.remover-veiculo');
    if (!button) return;
    button.closest('.card-vehicle')?.remove();
    renumber();
  });

  container.addEventListener('input', (event) => {
    const el = event.target;
    if (el.matches('.campo-placa')) el.value = maskPlate(el.value);
    if (el.matches('.campo-ano')) el.value = el.value.replace(/\D/g, '').slice(0, 4);
    if (el.matches('.campo-cor')) el.value = el.value.replace(/[^A-Za-zÀ-ÿ\s]/g, '');
    if (el.matches('.campo-modelo')) el.value = el.value.replace(/[^A-Za-zÀ-ÿ0-9\s.\-]/g, '');
  });

  if (container.querySelectorAll('.card-vehicle').length === 0) {
    addForm();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    console.log('Botão de salvar veículos acionado.');

    // Tenta detetar o ID do funcionário logado nas várias chaves possíveis do storage
    let idFuncionarioLogado = null;

    const rawUser = window.sessionStorage.getItem('usuario') || window.localStorage.getItem('usuario') ||
                    window.sessionStorage.getItem('user') || window.localStorage.getItem('user');
    
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        idFuncionarioLogado = parsed.id || parsed.idFuncionario || parsed.userId || parsed.sub;
      } catch (e) {
        idFuncionarioLogado = rawUser;
      }
    }

    if (!idFuncionarioLogado) {
      idFuncionarioLogado = 
        window.sessionStorage.getItem('idFuncionario') || 
        window.localStorage.getItem('idFuncionario') ||
        window.sessionStorage.getItem('userId') ||
        window.localStorage.getItem('userId') ||
        window.sessionStorage.getItem('id') ||
        window.localStorage.getItem('id');
    }

    console.log('ID do funcionário detetado no storage:', idFuncionarioLogado);

    const created = [];
    const cards = container.querySelectorAll('.card-vehicle');

    for (const card of cards) {
      const model = card.querySelector('.campo-modelo').value.trim();
      const type = card.querySelector('.campo-tipo:checked')?.value ?? '';
      const year = card.querySelector('.campo-ano').value.trim();
      const color = card.querySelector('.campo-cor').value.trim();
      const plate = normalizePlate(card.querySelector('.campo-placa').value);
      const maxYear = new Date().getFullYear() + 1;
      
      const fail = (msg, selector) => {
        window.alert(msg);
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.querySelector(selector)?.focus();
      };

      if (model.length < 2) return fail('Informe o modelo do veículo (mínimo 2 caracteres).', '.campo-modelo');
      if (!['carro', 'moto'].includes(type)) return fail('Selecione um tipo válido: carro ou moto.', '.campo-tipo');
      if (!/^\d{4}$/.test(year) || Number(year) < 1950 || Number(year) > maxYear)
        return fail(`Informe um ano válido entre 1950 e ${maxYear}.`, '.campo-ano');
      if (color.length < 2 || !/^[A-Za-zÀ-ÿ\s]+$/.test(color)) return fail('Informe uma cor válida (apenas letras).', '.campo-cor');
      if (!isValidPlate(plate)) return fail(`A placa ${plate || '(vazia)'} não é válida. Use o formato ABC1D23 ou ABC1234.`, '.campo-placa');
      
      const vehiclePayload = {
        modeloVeiculo: model, 
        tipoVeiculo: type, 
        anoVeiculo: Number(year), 
        corVeiculo: color, 
        placaVeiculo: plate 
      };

      // Só inclui o idFuncionario se ele foi encontrado com segurança no storage
      if (idFuncionarioLogado) {
        vehiclePayload.idFuncionario = Number(idFuncionarioLogado);
      }

      created.push(vehiclePayload);
    }

    try {
      for (const vehicle of created) {
        console.log('A enviar veículo para a API:', vehicle);
        const resposta = await api('/veiculos', { 
          method: 'POST', 
          body: JSON.stringify(vehicle) 
        });
        console.log('Resposta da API com sucesso:', resposta);
      }

      window.alert('Veículos cadastrados com sucesso!');
      form.reset();
    } catch (error) { 
      console.error('Erro detalhado ao salvar veículo:', error);
      window.alert(error.message || 'Erro ao cadastrar veículo. Verifique os dados.'); 
    }
  });
}