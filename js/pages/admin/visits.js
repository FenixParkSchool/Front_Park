import { escapeHtml, isValidPlate, normalizePlate } from '../../shared/utils.js';
 
// Troque esta linha pela constante/serviço de URL da API que o projeto já usa.
const API_URL = (window.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
 
function errorMessage(data, status) {
  if (data?.errors?.[0]?.message) return data.errors[0].message;
  if (data?.error) return data.error;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}
 
async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(data, response.status));
  return data;
}
 
const FIELDS = [
  'visita-nome', 'visita-telefone', 'visita-evento',
  'visita-tipo', 'visita-modelo', 'visita-cor', 'visita-ano', 'visita-placa',
];
 
// getVacancies não é mais usado: a vaga é reservada depois do cadastro. Mantido para não quebrar o main.js.
export function initAdminVisits() {
  const list = document.getElementById('lista-visitas-admin');
  const form = document.getElementById('formNovaVisitaAdmin');
  if (!form) return;
 
  const renderMessage = (text) => {
    if (list) list.innerHTML = `<p class="text-center py-4 mb-0 empty-state">${escapeHtml(text)}</p>`;
  };
 
  const render = async () => {
    if (!list) return;
    try {
      const [visitantes, veiculos] = await Promise.all([api('/visitantes'), api('/veiculoVisitantes')]);
      if (!visitantes.length) {
        renderMessage('Nenhuma visita cadastrada.');
        return;
      }
      const porVisitante = new Map();
      for (const veiculo of veiculos) {
        if (!porVisitante.has(veiculo.idVisitante)) porVisitante.set(veiculo.idVisitante, []);
        porVisitante.get(veiculo.idVisitante).push(veiculo);
      }
      list.innerHTML = visitantes.map((visitante) => {
        const veiculosDoVisitante = porVisitante.get(visitante.idVisitante) ?? [];
        const veiculosHtml = veiculosDoVisitante.length
          ? veiculosDoVisitante.map((v) => `<span class="badge text-bg-light border text-secondary">${escapeHtml(v.tipoVeiculoVisitante)} ${escapeHtml(v.modeloVeiculoVisitante)} · ${escapeHtml(v.corVeiculoVisitante)} · ${escapeHtml(v.anoVeiculoVisitante)} · ${escapeHtml(v.placaVeiculoVisitante)}</span>`).join(' ')
          : '<span class="badge text-bg-light border text-secondary">Sem veículo</span>';
        return `<article class="visita-item">
          <div>
            <p>${escapeHtml(visitante.nomeVisitante)}</p>
            <p>${escapeHtml(visitante.evento)} · ${escapeHtml(visitante.telefoneVisitante)}</p>
            ${veiculosHtml}
          </div>
        </article>`;
      }).join('');
    } catch (error) {
      renderMessage(error.message);
    }
  };
 
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(FIELDS.map((id) => [id, document.getElementById(id)?.value.trim() || '']));
    const telefone = values['visita-telefone'].replace(/\D/g, '');
    const placa = normalizePlate(values['visita-placa']);
 
    if (!Object.values(values).every(Boolean)) {
      window.alert('Preencha todos os campos.');
      return;
    }
    if (!/^\d{10,11}$/.test(telefone)) {
      window.alert('Informe o telefone com DDD (10 ou 11 dígitos).');
      return;
    }
    if (!/^(19|20)\d{2}$/.test(values['visita-ano'])) {
      window.alert('Informe o ano do veículo com 4 dígitos.');
      return;
    }
    if (!isValidPlate(placa)) {
      window.alert('Informe uma placa válida.');
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      // 1) cadastra o visitante e pega o id devolvido pela API
      const visitante = await api('/visitantes', {
        method: 'POST',
        body: {
          nomeVisitante: values['visita-nome'],
          telefoneVisitante: telefone,
          evento: values['visita-evento'],
        },
      });
 
      // 2) cadastra o veículo usando o idVisitante retornado
      try {
        await api('/veiculoVisitantes', {
          method: 'POST',
          body: {
            idVisitante: Number(visitante.idVisitante),
            tipoVeiculoVisitante: values['visita-tipo'],
            modeloVeiculoVisitante: values['visita-modelo'],
            corVeiculoVisitante: values['visita-cor'],
            anoVeiculoVisitante: values['visita-ano'],
            placaVeiculoVisitante: placa,
          },
        });
      } catch (vehicleError) {
        // evita deixar um visitante sem veículo se o segundo passo falhar
        await api(`/visitantes/${visitante.idVisitante}`, { method: 'DELETE' }).catch(() => {});
        throw vehicleError;
      }
 
      form.reset();
      await render();
      window.alert('Visitante e veículo cadastrados com sucesso.');
    } catch (error) {
      window.alert(error.message);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
 
  render();
}