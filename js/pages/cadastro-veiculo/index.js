//Arquivo:Front_Park/js/pages/cadastro-veiculo/index.js
import { api } from '../../services/auth.js';
import { localStore, sessionStore } from '../../shared/storage.js';
import { isValidPlate, normalizePlate } from '../../shared/utils.js';
import { isValidPlate, normalizePlate, maskPlate } from '../../shared/utils.js';


function createVehicleCard(index) {
  const card = document.createElement('section');
  card.className = 'card-vehicle';
  card.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2">
    <div class="vehicle-number">Veículo ${index + 1}</div>
    ${index > 0 ? '<button type="button" class="btn btn-sm btn-outline-danger remover-veiculo" aria-label="Remover veículo"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' : ''}
  <div class="col-md-6"><label class="form-label fw-semibold" for="modelo-${index}">Modelo</label><input id="modelo-${index}" type="text" class="form-control campo-modelo" placeholder="Ex.: Corolla, CG 160" minlength="2" maxlength="50" required></div>
<div class="col-md-3"><label class="form-label fw-semibold" for="tipo-${index}">Tipo</label><select id="tipo-${index}" class="form-select campo-tipo" required><option value="carro" selected>Carro</option><option value="moto">Moto</option></select></div>
<div class="col-md-3"><label class="form-label fw-semibold" for="ano-${index}">Ano</label><input id="ano-${index}" type="text" inputmode="numeric" class="form-control campo-ano" maxlength="4" placeholder="2024" required></div>
<div class="col-md-6"><label class="form-label fw-semibold" for="cor-${index}">Cor</label><input id="cor-${index}" type="text" class="form-control campo-cor" placeholder="Ex.: Prata" minlength="2" maxlength="30" required></div>
<div class="col-md-6"><label class="form-label fw-semibold" for="placa-${index}">Placa</label><input id="placa-${index}" type="text" class="form-control campo-placa text-uppercase" placeholder="ABC1D23" maxlength="7" autocomplete="off" required></div>`;
  return card;
}

export function init() {
  const container = document.getElementById('listaVeiculos');
  const form = document.getElementById('formVeiculos');
  if (!container || !form) return;

  const addForm = () => container.appendChild(createVehicleCard(container.querySelectorAll('.card-vehicle').length));
  const renumber = () => [...container.querySelectorAll('.card-vehicle')].forEach((card, index) => {
    card.querySelector('.vehicle-number').textContent = `Veículo ${index + 1}`;
    const button = card.querySelector('.remover-veiculo');
    if (index === 0) button?.remove();
    else if (!button) {
      const header = card.querySelector('.d-flex');
      header.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm btn-outline-danger remover-veiculo" aria-label="Remover veículo"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>');
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
  addForm();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const created = [];
    for (const card of container.querySelectorAll('.card-vehicle')) {
      const model = card.querySelector('.campo-modelo').value.trim();
      const type = card.querySelector('.campo-tipo').value;
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
      created.push({ modeloVeiculo: model, tipoVeiculo: type, anoVeiculo: year, corVeiculo: color, placaVeiculo: plate });
    }
    try {
      for (const vehicle of created) await api('/veiculos', { method: 'POST', body: JSON.stringify(vehicle) });
    } catch (error) { window.alert(error.message); return; }
    window.alert('Veículos cadastrados com sucesso!');
    form.reset();
  });
}
