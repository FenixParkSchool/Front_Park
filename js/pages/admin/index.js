//Arquivo: Front_Park/js/pages/admin/index.js
import { api } from '../../services/auth.js';
import { initAdminNavigation } from './navigation.js';
import { getAdminVacancies, initAdminVacancies } from './vacancies.js';
import { getEmployees, initAdminEmployees, refreshEmployees, upsertEmployee } from './employees.js';
import { initAdminVehicles } from './vehicles.js';
import { initAdminRequests } from './requests.js';
import { initAdminVisits } from './visits.js';
import { init as initAdminReservation } from '../reserva/index.js';

const roleLabels = {
  ADMIN: 'Administrador',
  VIGILANTE: 'Vigilante',
  FUNCIONARIO: 'Funcionário',
};

export function init() {
  initRoles();
  initAdminNavigation();
  initAdminVacancies();
  initAdminEmployees();
  initAdminVehicles(getEmployees);
  initAdminRequests({ upsertEmployee, refreshEmployees });
  initAdminVisits(getAdminVacancies);
  initAdminReservation();
}

// Perfis de acesso: usuário, perfil e botão de salvar, com busca por nome ou e-mail.
async function initRoles() {
  const list = document.getElementById('lista-perfis');
  const feedback = document.getElementById('perfis-feedback');
  const searchInput = document.getElementById('busca-perfis');
  if (!list) return;

  try {
    const users = await api('/admin/users');

    list.replaceChildren();
    if (feedback) feedback.textContent = '';

    if (users.length === 0) {
      const row = document.createElement('tr');
      const message = document.createElement('td');
      message.colSpan = 2;
      message.className = 'empty-state';
      message.textContent = 'Nenhuma conta cadastrada.';
      row.append(message);
      list.append(row);
      return;
    }

    for (const user of users) {
      const row = document.createElement('tr');
      row.dataset.busca = `${user.username ?? ''} ${user.email ?? ''}`.toLocaleLowerCase('pt-BR');

      const userCell = document.createElement('td');
      userCell.dataset.label = 'Usuário';
      const userDetails = document.createElement('div');
      userDetails.className = 'admin-profile-user';
      const username = document.createElement('strong');
      username.textContent = user.username || 'Usuário sem nome';
      const email = document.createElement('small');
      email.textContent = user.email || 'E-mail não informado';
      userDetails.append(username, email);
      userCell.append(userDetails);

      const roleCell = document.createElement('td');
      roleCell.dataset.label = 'Perfil de acesso';
      const roleControls = document.createElement('div');
      roleControls.className = 'admin-profile-control';
      const roleSelect = document.createElement('select');
      roleSelect.className = 'form-select form-select-sm';
      roleSelect.setAttribute('aria-label', `Perfil de acesso de ${user.username}`);
      for (const [value, label] of Object.entries(roleLabels)) {
        roleSelect.add(new Option(label, value, false, user.role === value));
      }
      const saveRole = document.createElement('button');
      saveRole.type = 'button';
      saveRole.className = 'btn ds-btn-primary btn-sm';
      saveRole.textContent = 'Salvar perfil';
      saveRole.addEventListener('click', async () => {
        saveRole.disabled = true;
        try {
          await api(`/admin/users/${user.idUsuario}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: roleSelect.value }),
          });
          window.alert('Perfil atualizado.');
        } catch (error) {
          window.alert(error.message);
        } finally {
          saveRole.disabled = false;
        }
      });
      roleControls.append(roleSelect, saveRole);
      roleCell.append(roleControls);

      row.append(userCell, roleCell);
      list.append(row);
    }

    // linha exibida quando a busca não encontra nenhuma conta
    const noResult = document.createElement('tr');
    noResult.hidden = true;
    const noResultCell = document.createElement('td');
    noResultCell.colSpan = 2;
    noResultCell.className = 'empty-state';
    noResultCell.textContent = 'Nenhuma conta encontrada para essa busca.';
    noResult.append(noResultCell);
    list.append(noResult);

    const applyFilter = () => {
      const term = (searchInput?.value ?? '').trim().toLocaleLowerCase('pt-BR');
      let visible = 0;
      for (const row of list.querySelectorAll('tr[data-busca]')) {
        const match = !term || row.dataset.busca.includes(term);
        row.hidden = !match;
        if (match) visible += 1;
      }
      noResult.hidden = visible > 0;
    };
    searchInput?.addEventListener('input', applyFilter);
  } catch (error) {
    if (feedback) {
      feedback.classList.add('is-error');
      feedback.textContent = error.message;
    }
  }
}
