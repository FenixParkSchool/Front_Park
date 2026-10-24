import { localStore, sessionStore } from '../../shared/storage.js';
import { isValidPlate, normalizePlate } from '../../shared/utils.js';

function createVehicleCard(index) {
  const card = document.createElement('section');
  card.className = 'card-vehicle';
  card.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2">
    <div class="vehicle-number">Veículo ${index + 1}</div>
    ${index > 0 ? '<button type="button" class="btn btn-sm btn-outline-danger remover-veiculo" aria-label="Remover veículo"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' : ''}
  </div><div class="row g-3">
    <div class="col-md-6"><label class="form-label fw-semibold" for="modelo-${index}">Modelo</label><input id="modelo-${index}" type="text" class="form-control campo-modelo" placeholder="Ex.: Corolla, CG 160" required></div>
    <div class="col-md-3"><label class="form-label fw-semibold" for="tipo-${index}">Tipo</label><select id="tipo-${index}" class="form-select campo-tipo" required><option value="carro" selected>Carro</option><option value="moto">Moto</option></select></div>
    <div class="col-md-3"><label class="form-label fw-semibold" for="ano-${index}">Ano</label><input id="ano-${index}" type="number" class="form-control campo-ano" min="2000" max="2100" placeholder="2024" required></div>
    <div class="col-md-6"><label class="form-label fw-semibold" for="cor-${index}">Cor</label><input id="cor-${index}" type="text" class="form-control campo-cor" placeholder="Ex.: Prata" required></div>
    <div class="col-md-6"><label class="form-label fw-semibold" for="placa-${index}">Placa</label><input id="placa-${index}" type="text" class="form-control campo-placa" placeholder="ABC1D23" maxlength="8" required></div>
  </div>`;
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
    if (event.target.matches('.campo-placa')) event.target.value = normalizePlate(event.target.value).slice(0, 7);
  });
  addForm();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const recent = sessionStore.get('cadastroRecente');
    if (!recent) {
      window.alert('Nenhum cadastro recente foi encontrado. Volte para a etapa anterior.');
      return;
    }
    const created = [];
    for (const card of container.querySelectorAll('.card-vehicle')) {
      const model = card.querySelector('.campo-modelo').value.trim();
      const type = card.querySelector('.campo-tipo').value;
      const year = card.querySelector('.campo-ano').value.trim();
      const color = card.querySelector('.campo-cor').value.trim();
      const plate = normalizePlate(card.querySelector('.campo-placa').value);
      if (!model || !year || !color || !plate) {
        window.alert('Preencha todos os campos do veículo antes de continuar.');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!isValidPlate(plate)) {
        window.alert(`A placa ${plate} não é válida. Use o formato ABC1D23 ou ABC1234.`);
        card.querySelector('.campo-placa').focus();
        return;
      }
      created.push({ id: Date.now() + created.length, usuario: recent.email || 'usuario@empresa.com', nomeUsuario: recent.nome || 'Usuário', perfil: recent.perfil || 'funcionario', modelo: model, tipo: type, ano: Number(year), cor: color, placa: plate });
    }
    const stored = localStore.get('park_veiculos', []);
    localStore.set('park_veiculos', [...(Array.isArray(stored) ? stored : []), ...created]);
    sessionStore.remove('cadastroRecente');
    window.alert('Veículos cadastrados com sucesso!');
    window.location.href = 'login.html';
  });
}
