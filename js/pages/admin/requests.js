import { requestsRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

const API_URL = 'http://localhost:3000';

export function initAdminRequests({ upsertEmployee, refreshEmployees } = {}) {
  const list = document.getElementById('lista-solicitacoes');
  if (!list) return;

  const carregarSolicitacoesDaAPI = async () => {
    const token = localStorage.getItem('token') || '';
    
    list.innerHTML = '<p class="text-center py-4 mb-0 text-muted">Carregando solicitações pendentes...</p>';

    try {
      const response = await fetch(`${API_URL}/admin/solicitacoes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar solicitações');

      const requests = await response.json();

      if (!requests.length) {
        list.innerHTML = `
          <div class="card-form admin-form text-center py-5">
            <div class="icon-circle icon-circle-lg icon-circle-primary mx-auto mb-3" aria-hidden="true">
              <i class="bi bi-envelope-check"></i>
            </div>
            <h3 class="h5 mb-1">Tudo em ordem!</h3>
            <p class="text-muted mb-0">Nenhuma solicitação pendente no momento.</p>
          </div>`;
        return;
      }

      list.innerHTML = requests.map((item) => `
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
            </div>
          </div>
          <div class="d-flex align-items-center gap-2 justify-content-end flex-shrink-0">
            <button class="btn btn-sm ds-btn-primary d-inline-flex align-items-center gap-1 px-3" data-action="aprovar" data-id="${item.idUsuario}" type="button" style="background-color: #198754; border-color: #198754;">
              <i class="bi bi-check-lg" aria-hidden="true"></i> Aprovar
            </button>
            <button class="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 px-3" data-action="rejeitar" data-id="${item.idUsuario}" type="button">
              <i class="bi bi-x-lg" aria-hidden="true"></i> Recusar
            </button>
          </div>
        </article>
      `).join('');
    } catch (error) {
      console.error('Erro:', error);
      list.innerHTML = '<p class="text-center py-4 mb-0 text-danger">Erro ao carregar solicitações do servidor.</p>';
    }
  };

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="aprovar"], [data-action="rejeitar"]');
    if (!button) return;

    const idUsuario = button.dataset.id;
    const acao = button.dataset.action; // 'aprovar' ou 'rejeitar'
    const token = localStorage.getItem('token') || '';

    const endpoint = acao === 'aprovar' 
      ? `${API_URL}/admin/solicitacoes/${idUsuario}/aprovar` 
      : `${API_URL}/admin/solicitacoes/${idUsuario}/rejeitar`;
      
    const metodo = acao === 'aprovar' ? 'PATCH' : 'DELETE';

    const cardItem = button.closest('.solicitacao-item');
    const actionButtons = cardItem?.querySelectorAll('button');
    actionButtons?.forEach(btn => btn.disabled = true);

    try {
      const response = await fetch(endpoint, {
        method: metodo,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (cardItem) {
          cardItem.style.transition = 'all 0.3s ease';
          cardItem.style.opacity = '0';
          cardItem.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            cardItem.remove();
            
            if (!list.querySelector('.solicitacao-item')) {
              list.innerHTML = `
                <div class="card-form admin-form text-center py-5">
                  <div class="icon-circle icon-circle-lg icon-circle-primary mx-auto mb-3" aria-hidden="true">
                    <i class="bi bi-envelope-check"></i>
                  </div>
                  <h3 class="h5 mb-1">Tudo em ordem!</h3>
                  <p class="text-muted mb-0">Nenhuma solicitação pendente no momento.</p>
                </div>`;
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

  carregarSolicitacoesDaAPI();
}