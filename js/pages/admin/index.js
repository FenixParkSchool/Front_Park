import { api } from '../../services/auth.js';
import { initAdminNavigation } from './navigation.js';
import { getAdminVacancies, initAdminVacancies } from './vacancies.js';
import { getEmployees, initAdminEmployees, refreshEmployees, upsertEmployee } from './employees.js';
import { initAdminVehicles } from './vehicles.js';
import { initAdminRequests } from './requests.js';
import { initAdminVisits } from './visits.js';

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
}

async function initRoles() {
  const list = document.getElementById('lista-perfis');
  const feedback = document.getElementById('perfis-feedback');
  if (!list) return;

  try {
    const [employees, users] = await Promise.all([
      api('/funcionarios'),
      api('/admin/users'),
    ]);

    list.replaceChildren();
    if (feedback) feedback.textContent = '';

    if (users.length === 0) {
      const row = document.createElement('tr');
      const message = document.createElement('td');
      message.colSpan = 3;
      message.className = 'empty-state';
      message.textContent = 'Nenhuma conta cadastrada.';
      row.append(message);
      list.append(row);
      return;
    }

    for (const user of users) {
      const row = document.createElement('tr');

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

      const employeeCell = document.createElement('td');
      employeeCell.dataset.label = 'Vínculo com funcionário';
      const employeeControls = document.createElement('div');
      employeeControls.className = 'admin-profile-control';
      const employeeSelect = document.createElement('select');
      employeeSelect.className = 'form-select form-select-sm';
      employeeSelect.setAttribute('aria-label', `Funcionário vinculado a ${user.username}`);
      employeeSelect.add(new Option('Sem vínculo', '', false, !user.idFuncionario));
      for (const employee of employees) {
        employeeSelect.add(new Option(
          employee.nomeFuncionario,
          employee.idFuncionario,
          false,
          employee.idFuncionario === user.idFuncionario,
        ));
      }
      const saveEmployeeLink = document.createElement('button');
      saveEmployeeLink.type = 'button';
      saveEmployeeLink.className = 'btn ds-btn-outline btn-sm';
      saveEmployeeLink.textContent = 'Salvar vínculo';
      saveEmployeeLink.addEventListener('click', async () => {
        saveEmployeeLink.disabled = true;
        try {
          await api(`/admin/users/${user.idUsuario}/funcionario`, {
            method: 'PATCH',
            body: JSON.stringify({
              idFuncionario: employeeSelect.value ? Number(employeeSelect.value) : null,
            }),
          });
          window.alert('Vínculo atualizado.');
        } catch (error) {
          window.alert(error.message);
        } finally {
          saveEmployeeLink.disabled = false;
        }
      });
      employeeControls.append(employeeSelect, saveEmployeeLink);
      employeeCell.append(employeeControls);

      row.append(userCell, roleCell, employeeCell);
      list.append(row);
    }
  } catch (error) {
    if (feedback) {
      feedback.classList.add('is-error');
      feedback.textContent = error.message;
    }
  }
}
