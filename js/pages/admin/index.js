import { api } from '../../services/auth.js';
import { initAdminNavigation } from './navigation.js';
import { getAdminVacancies, initAdminVacancies } from './vacancies.js';
import { getEmployees, initAdminEmployees, refreshEmployees, upsertEmployee } from './employees.js';
import { initAdminVehicles } from './vehicles.js';
import { initAdminRequests } from './requests.js';
import { initAdminVisits } from './visits.js';

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
  const section = document.createElement('section');
  section.className = 'container py-4';
  section.innerHTML = '<h2>Perfis de acesso</h2><p>Selecione o perfil e salve para aplicar as permissões da conta.</p>';
  document.getElementById('app').append(section);
  try {
    const employees = await api('/funcionarios');
    for (const user of await api('/admin/users')) {
      const row = document.createElement('div');
      row.className = 'd-flex gap-2 mb-2 align-items-center';
      const label = document.createElement('span');
      label.textContent = `${user.username} (${user.email})`;
      const select = document.createElement('select');
      select.setAttribute('aria-label', `Perfil de ${user.username}`);
      for (const role of ['ADMIN', 'VIGILANTE', 'FUNCIONARIO']) {
        const option = new Option(role, role, false, user.role === role);
        select.add(option);
      }
      const save = document.createElement('button');
      save.textContent = 'Salvar perfil';
      save.className = 'btn btn-primary btn-sm';
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await api(`/admin/users/${user.idUsuario}/role`, { method: 'PATCH', body: JSON.stringify({ role: select.value }) });
          window.alert('Perfil atualizado.');
        } catch (error) { window.alert(error.message); }
        finally { save.disabled = false; }
      });
      const employeeSelect = document.createElement('select');
      employeeSelect.setAttribute('aria-label', `Funcionário vinculado a ${user.username}`);
      employeeSelect.add(new Option('Sem vínculo', '', false, !user.idFuncionario));
      for (const employee of employees) employeeSelect.add(new Option(employee.nomeFuncionario, employee.idFuncionario, false, employee.idFuncionario === user.idFuncionario));
      const link = document.createElement('button');
      link.textContent = 'Salvar vínculo';
      link.className = 'btn btn-secondary btn-sm';
      link.addEventListener('click', async () => {
        link.disabled = true;
        try {
          await api(`/admin/users/${user.idUsuario}/funcionario`, { method: 'PATCH', body: JSON.stringify({ idFuncionario: employeeSelect.value ? Number(employeeSelect.value) : null }) });
          window.alert('Vínculo atualizado.');
        } catch (error) { window.alert(error.message); }
        finally { link.disabled = false; }
      });
      row.append(label, select, save, employeeSelect, link);
      section.append(row);
    }
  } catch (error) { section.append(document.createTextNode(error.message)); }
}
