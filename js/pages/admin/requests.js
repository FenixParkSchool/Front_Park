import { requestsRepo } from '../../services/repositories.js';
import { escapeHtml } from '../../shared/utils.js';

const roleLabel = (profile) => ({ operador: 'Patrimônio', supervisor: 'Vigilante' }[profile] || 'Funcionário');

export function initAdminRequests({ upsertEmployee, refreshEmployees }) {
  const list = document.getElementById('lista-solicitacoes');
  if (!list) return;

  const render = () => {
    const requests = requestsRepo.list();
    if (!requests.length) {
      list.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma solicitação pendente.</p>';
      return;
    }
    list.innerHTML = requests.map((item) => `<article class="solicitacao-item">
      <div><p>${escapeHtml(item.nome)}</p><p>${escapeHtml(item.email)}</p><span class="badge text-bg-light border text-secondary">${roleLabel(item.perfil)}</span></div>
      <div class="d-flex gap-2"><button class="btn btn-sm btn-success" data-action="aprovar" data-id="${escapeHtml(item.id)}">Aprovar</button>
      <button class="btn btn-sm btn-outline-danger" data-action="rejeitar" data-id="${escapeHtml(item.id)}">Recusar</button></div>
    </article>`).join('');
  };

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="aprovar"], [data-action="rejeitar"]');
    if (!button) return;
    const requests = requestsRepo.list();
    const request = requests.find((item) => String(item.id) === button.dataset.id);
    if (!request) return;
    if (button.dataset.action === 'aprovar') {
      const existing = refreshEmployees().find((employee) => (employee.email || '').toLowerCase() === (request.email || '').toLowerCase());
      upsertEmployee({
        id: existing?.id ?? Date.now(), nome: request.nome, cargo: roleLabel(request.perfil),
        telefone: request.telefone || '(11) 00000-0000', email: request.email, pcd: 'nao', status: 'ativo',
      });
      window.alert(`${request.nome} foi aprovado no sistema.`);
    }
    requestsRepo.save(requests.filter((item) => String(item.id) !== button.dataset.id));
    render();
  });

  // Botão "Atualizar": relê os dados e redesenha a lista, sem precisar do F5
  const refreshBtn = document.getElementById('btn-atualizar-solicitacoes');
  refreshBtn?.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('i');
    icon?.classList.add('girando');
    render();
    setTimeout(() => icon?.classList.remove('girando'), 600);
  });

  // Atualiza sozinho quando outra aba alterar os dados (localStorage)
  window.addEventListener('storage', render);

  render();
}