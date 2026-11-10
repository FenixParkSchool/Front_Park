import { requestsRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

const API_URL = 'http://localhost:3000';

export function initAdminRequests({ upsertEmployee, refreshEmployees } = {}) {
  const list = document.getElementById('lista-solicitacoes');
  if (!list) return;

  const carregarSolicitacoesDaAPI = async () => {
    const token = localStorage.getItem('token') || '';
    try {
      const response = await fetch(`${API_URL}/admin/solicitacoes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar solicitações');

      const requests = await response.json();

      if (!requests.length) {
        list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma solicitação pendente.</p>';
        return;
      }

      list.innerHTML = requests.map((item) => `
        <article class="solicitacao-item d-flex justify-content-between align-items-center p-3 mb-2 bg-white rounded shadow-sm border">
          <div>
            <p class="mb-1 fw-bold">${escapeHtml(item.username || item.email)}</p>
            <p class="mb-1 text-muted small"><i class="bi bi-envelope me-1"></i>${escapeHtml(item.email)}</p>
            <span class="badge text-bg-light border text-secondary">ID: ${item.idUsuario}</span>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" data-action="aprovar" data-id="${item.idUsuario}">Aprovar</button>
            <button class="btn btn-sm btn-outline-danger" data-action="rejeitar" data-id="${item.idUsuario}">Recusar</button>
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

    // Define a rota exata e o método HTTP correspondente no backend
    const endpoint = acao === 'aprovar' 
      ? `${API_URL}/admin/solicitacoes/${idUsuario}/aprovar` 
      : `${API_URL}/admin/solicitacoes/${idUsuario}/rejeitar`;
      
    const metodo = acao === 'aprovar' ? 'PATCH' : 'DELETE';

    try {
      const response = await fetch(endpoint, {
        method: metodo,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        window.alert(`Solicitação ${acao === 'aprovar' ? 'aprovada' : 'recusada'} com sucesso!`);
        
        // Remove o card da tela imediatamente ao aprovar ou recusar
        const solicitacaoItem = button.closest('.solicitacao-item');
        if (solicitacaoItem) {
          solicitacaoItem.remove();
        }

        // Se não restar nenhum card, mostra o estado vazio
        if (!list.querySelector('.solicitacao-item')) {
          list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma solicitação pendente.</p>';
        }

        if (typeof refreshEmployees === 'function') refreshEmployees();
      } else {
        const errData = await response.json().catch(() => ({}));
        window.alert('Erro ao processar: ' + (errData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      window.alert('Erro de conexão com o servidor.');
    }
  });

  const refreshBtn = document.getElementById('btn-atualizar-solicitacoes');
  refreshBtn?.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('i');
    icon?.classList.add('girando');
    carregarSolicitacoesDaAPI();
    setTimeout(() => icon?.classList.remove('girando'), 600);
  });

  carregarSolicitacoesDaAPI();
}