
import { visitsRepo } from '../../services/repositories.js';
import {
  escapeHtml,
  isValidPlate,
  normalizePlate
} from '../../shared/utils.js';

export function initAdminVisits(getVacancies) {
  const list = document.getElementById('lista-visitas-admin');
  const select = document.getElementById('visita-vaga');
  const form = document.getElementById('formNovaVisitaAdmin');

  if (!form) {
    console.error('Formulário de visitas não encontrado.');
    return;
  }

  function carregarVagas() {
    if (!select) return;

    const vagas = getVacancies();

    select.innerHTML = vagas.length
      ? vagas.map(vaga => `
          <option value="${vaga.number}">
            Vaga ${vaga.number}
          </option>
        `).join('')
      : '<option value="">Nenhuma vaga disponível</option>';
  }

  function render() {
    if (!list) return;

    const visitas = visitsRepo.list();

    list.innerHTML = visitas.length
      ? visitas.map(visit => `
          <article class="visita-item">
            <div>
              <p>${escapeHtml(visit.nome)}</p>
              <p>
                ${escapeHtml(visit.motivo)}
                · Vaga ${escapeHtml(visit.vaga)}
                · ${escapeHtml(visit.placa)}
              </p>
              <span class="badge text-bg-light border text-secondary">
                ${escapeHtml(visit.entrada)} – ${escapeHtml(visit.saida)}
              </span>
            </div>

            <span class="badge ${
              visit.status === 'confirmed'
                ? 'text-bg-success'
                : 'text-bg-warning'
            }">
              ${visit.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
            </span>
          </article>
        `).join('')
      : '<p class="text-center py-4 mb-0 empty-state">Nenhuma visita cadastrada.</p>';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      const obterValor = id =>
        document.getElementById(id)?.value?.trim() || '';

      const nome = obterValor('visita-nome');
      const motivo = obterValor('visita-motivo');
      const vaga = obterValor('visita-vaga');
      const placaOriginal = obterValor('visita-placa');
      const entrada = obterValor('visita-entrada');
      const saida = obterValor('visita-saida');

      const placa = normalizePlate(placaOriginal);

      if (!nome || !motivo || !vaga || !placaOriginal || !entrada || !saida) {
        alert('Preencha todos os campos.');
        return;
      }

      if (!isValidPlate(placa)) {
        alert('Informe uma placa válida.');
        return;
      }

      if (entrada >= saida) {
        alert('O horário de saída deve ser maior que o horário de entrada.');
        return;
      }

      const visitasAtuais = visitsRepo.list();

      const novaVisita = {
        id: Date.now(),
        nome,
        motivo,
        vaga: Number(vaga),
        placa,
        entrada,
        saida,
        status: 'pending',
        data: new Date().toISOString().slice(0, 10)
      };

      visitsRepo.save([...visitasAtuais, novaVisita]);

      render();
      form.reset();
      carregarVagas();

      alert('Visitante cadastrado com sucesso!');

    } catch (error) {
      console.error('Erro ao cadastrar visita:', error);
      alert('Erro ao cadastrar visitante. Verifique o console.');
    }
  });

  carregarVagas();
  render();
}
