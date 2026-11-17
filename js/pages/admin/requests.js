import { requestsRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

const API_URL = 'http://localhost:3000';

export function initAdminRequests({ upsertEmployee, refreshEmployees } = {}) {
  const list = document.getElementById('lista-solicitacoes');
  if (!list) return;

  // 'pendentes' ou 'recusadas'
  let modo = 'pendentes';

  // As abas ficam no admin.html (#abas-solicitacoes).
  // Se não existirem lá, são criadas aqui por segurança.
  let abas = document.getElementById('abas-solicitacoes');
  if (!abas) {
    abas = document.createElement('div');
    abas.id = 'abas-solicitacoes';
    abas.className = 'd-flex gap-2 mb-3';
    abas.innerHTML = `
      <button type="button" class="btn btn-sm" data-modo="pendentes">
        <i class="bi bi-hourglass-split" aria-hidden="true"></i> Pendentes
      </button>
      <button type="button" class="btn btn-sm" data-modo="recusadas">
        <i class="bi bi-x-circle" aria-hidden="true"></i> Recusadas
      </button>`;
    list.insertAdjacentElement('beforebegin', abas);
  }

  const atualizarAbas = () => {
    abas.querySelectorAll('[data-modo]').forEach((btn) => {
      const ativa = btn.dataset.modo === modo;
      btn.classList.toggle('ds-btn-primary', ativa);
      btn.classList.toggle('btn-outline-secondary', !ativa);
      btn.setAttribute('aria-selected', String(ativa));
    });
  };

  const renderVazio = () => {
    const pendentes = modo === 'pendentes';
    list.innerHTML = `
      <div class="card-form admin-form text-center py-5">
        <div class="icon-circle icon-circle-lg icon-circle-primary mx-auto mb-3" aria-hidden="true">
          <i class="bi ${pendentes ? 'bi-envelope-check' : 'bi-inbox'}"></i>
        </div>
        <h3 class="h5 mb-1">${pendentes ? 'Tudo em ordem!' : 'Nenhuma solicitação recusada'}</h3>
        <p class="text-muted mb-0">${pendentes ? 'Nenhuma solicitação pendente no momento.' : 'Não há cadastros recusados para revisar.'}</p>
      </div>`;
  };

  const cardHtml = (item) => {
    const recusada = modo === 'recusadas';

    const botoes = recusada
      ? `
        <button class="btn btn-sm ds-btn-primary d-inline-flex align-items-center gap-1 px-3" data-action="aprovar" data-id="${item.idUsuario}" type="button" style="background-color: #198754; border-color: #198754;">
          <i class="bi bi-check-lg" aria-hidden="true"></i> Aprovar
        </button>`
      : `
        <button class="btn btn-sm ds-btn-primary d-inline-flex align-items-center gap-1 px-3" data-action="aprovar" data-id="${item.idUsuario}" type="button" style="background-color: #198754; border-color: #198754;">
          <i class="bi bi-check-lg" aria-hidden="true"></i> Aprovar
        </button>
        <button class="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 px-3" data-action="rejeitar" data-id="${item.idUsuario}" type="button">
          <i class="bi bi-x-lg" aria-hidden="true"></i> Recusar
        </button>`;

    return `
      <article class="solicitacao-item card-form admin-form p-3 mb-0 d-flex flex-sm-row justify-content-between align-items-sm-center gap-3 shadow-sm border" data-id="${item.idUsuario}">
        <div class="d-flex align-items-center gap-3">
          <div class="icon-circle icon-circle-primary flex-shrink-0 d-flex align-items-center justify-content-center text-white rounded-circle" aria-hidden="true" style="width: 45px; height: 45px; background-color: #1d397d; font-size: 1.2rem;">
            <i class="bi bi-person"></i>
          </div>
          <div>
            <h3 class="h6 mb-1 fw-bold text-dark">${escapeHtml(item.username || item.email)}</h3>
            <p class="mb-1 text-muted small d-flex align-items-center gap-1">
              <i class="bi bi-envelope" aria-hidden="true"></i> ${escapeHtml(item.email)}
            </p>
            <span class="badge bg-light text-secondary border font-monospace">ID: ${escapeHtml(String(item.idUsuario))}</span>
            ${recusada ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle ms-1">Recusada</span>' : ''}
          </div>
        </div>
        <div class="d-flex align-items-center gap-2 justify-content-end flex-shrink-0">
          ${botoes}
        </div>
      </article>`;
  };

  const carregarSolicitacoesDaAPI = async () => {
    const token = localStorage.getItem('token') || '';
    const pendentes = modo === 'pendentes';

    list.innerHTML = `<p class="text-center py-4 mb-0 text-muted">Carregando solicitações ${pendentes ? 'pendentes' : 'recusadas'}...</p>`;

    try {
      const url = pendentes
        ? `${API_URL}/admin/solicitacoes`
        : `${API_URL}/admin/solicitacoes/rejeitadas`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar solicitações');

      const requests = await response.json();

      if (!requests.length) {
        renderVazio();
        return;
      }

      list.innerHTML = requests.map(cardHtml).join('');
    } catch (error) {
      console.error('Erro:', error);
      list.innerHTML = '<p class="text-center py-4 mb-0 text-danger">Erro ao carregar solicitações do servidor.</p>';
    }
  };

  // Troca entre Pendentes e Recusadas
  abas.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-modo]');
    if (!btn || btn.dataset.modo === modo) return;

    modo = btn.dataset.modo;
    atualizarAbas();
    carregarSolicitacoesDaAPI();
  });

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="aprovar"], [data-action="rejeitar"]');
    if (!button) return;

    const idUsuario = button.dataset.id;
    const acao = button.dataset.action; // 'aprovar' ou 'rejeitar'
    const token = localStorage.getItem('token') || '';

    // Sempre a mesma rota, mudando só o status no corpo
    const endpoint = `${API_URL}/admin/solicitacoes/${idUsuario}`;
    const status = acao === 'aprovar' ? 'APPROVED' : 'REJECTED';

    const cardItem = button.closest('.solicitacao-item');
    const actionButtons = cardItem?.querySelectorAll('button');
    actionButtons?.forEach(btn => btn.disabled = true);

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        if (cardItem) {
          cardItem.style.transition = 'all 0.3s ease';
          cardItem.style.opacity = '0';
          cardItem.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            cardItem.remove();

            if (!list.querySelector('.solicitacao-item')) {
              renderVazio();
            }
          }, 300);
        }

        if (acao === 'aprovar' && typeof refreshEmployees === 'function') {
          refreshEmployees();
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        window.alert('Erro ao processar: ' + (errData.error || 'Erro desconhecido'));
        actionButtons?.forEach(btn => btn.disabled = false);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      window.alert('Erro de conexão com o servidor.');
      actionButtons?.forEach(btn => btn.disabled = false);
    }
  });

  const refreshBtn = document.getElementById('btn-atualizar-solicitacoes');
  refreshBtn?.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('i');
    icon?.classList.add('girando');
    refreshBtn.disabled = true;

    carregarSolicitacoesDaAPI().finally(() => {
      setTimeout(() => {
        icon?.classList.remove('girando');
        refreshBtn.disabled = false;
      }, 500);
    });
  });

  atualizarAbas();
  carregarSolicitacoesDaAPI();
}