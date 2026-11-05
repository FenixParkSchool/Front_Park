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

// texto sem acento e em minúsculas, para a busca
const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function messageRow(text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 2;
  cell.className = 'empty-state';
  cell.textContent = text;
  row.append(cell);
  return row;
}

async function initRoles() {
  const list = document.getElementById('lista-perfis');
  const feedback = document.getElementById('perfis-feedback');
  const search = document.getElementById('busca-perfis');
  if (!list) return;

  try {
    const users = await api('/admin/users');

    list.replaceChildren();
    if (feedback) feedback.textContent = '';

    if (users.length === 0) {
      list.append(messageRow('Nenhuma conta cadastrada.'));
      return;
    }

    const rows = [];

    for (const user of users) {
      const row = document.createElement('tr');
      row.dataset.search = normalize(`${user.username} ${user.email}`);

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
      rows.push(row);
    }

    // linha exibida quando a busca não encontra ninguém
    const emptyRow = messageRow('Nenhum usuário encontrado para essa busca.');
    emptyRow.style.display = 'none';
    list.append(emptyRow);

    // a busca só esconde as linhas: o que foi alterado e ainda não salvo continua nos campos
    search?.addEventListener('input', () => {
      const term = normalize(search.value.trim());
      let visible = 0;
      for (const row of rows) {
        const show = !term || row.dataset.search.includes(term);
        row.style.display = show ? '' : 'none';
        if (show) visible += 1;
      }
      emptyRow.style.display = visible === 0 ? '' : 'none';
    });
  } catch (error) {
    if (feedback) {
      feedback.classList.add('is-error');
      feedback.textContent = error.message;
    }
  }
}
