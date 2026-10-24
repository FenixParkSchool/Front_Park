import { visitsRepo } from '../../services/repositories.js';
import { escapeHtml, isValidPlate, normalizePlate } from '../../shared/utils.js';

export function initAdminVisits(getVacancies) {
  const list = document.getElementById('lista-visitas-admin');
  const select = document.getElementById('visita-vaga');
  const form = document.getElementById('formNovaVisitaAdmin');
  if (!form) return;

  if (select) select.innerHTML = getVacancies().map((vacancy) => `<option value="${vacancy.number}">Vaga ${vacancy.number}</option>`).join('');
  const render = () => {
    if (!list) return;
    const visits = visitsRepo.list();
    list.innerHTML = visits.length ? visits.map((visit) => `<article class="visita-item">
      <div><p>${escapeHtml(visit.nome)}</p><p>${escapeHtml(visit.motivo)} · Vaga ${escapeHtml(visit.vaga)} · ${escapeHtml(visit.placa)}</p>
      <span class="badge text-bg-light border text-secondary">${escapeHtml(visit.entrada)} – ${escapeHtml(visit.saida)}</span></div>
      <span class="badge ${visit.status === 'confirmed' ? 'text-bg-success' : 'text-bg-warning'}">${visit.status === 'confirmed' ? 'Confirmada' : 'Pendente'}</span>
    </article>`).join('') : '<p class="text-center py-4 mb-0 empty-state">Nenhuma visita cadastrada.</p>';
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(['visita-nome', 'visita-motivo', 'visita-vaga', 'visita-placa', 'visita-entrada', 'visita-saida']
      .map((id) => [id, document.getElementById(id)?.value.trim() || '']));
    const plate = normalizePlate(values['visita-placa']);
    if (!Object.values(values).every(Boolean) || !isValidPlate(plate)) {
      window.alert('Preencha os dados e informe uma placa válida.');
      return;
    }
    if (values['visita-entrada'] >= values['visita-saida']) {
      window.alert('O horário de saída deve ser maior que o horário de entrada.');
      return;
    }
    visitsRepo.save([...visitsRepo.list(), {
      id: Date.now(), nome: values['visita-nome'], motivo: values['visita-motivo'],
      vaga: Number(values['visita-vaga']), placa, entrada: values['visita-entrada'], saida: values['visita-saida'],
      status: 'pending', data: new Date().toISOString().slice(0, 10),
    }]);
    form.reset();
    render();
    window.alert('Visita cadastrada com sucesso.');
  });
  render();
}
