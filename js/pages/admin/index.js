import { initAdminNavigation } from './navigation.js';
import { getAdminVacancies, initAdminVacancies } from './vacancies.js';
import { getEmployees, initAdminEmployees, refreshEmployees, upsertEmployee } from './employees.js';
import { initAdminVehicles } from './vehicles.js';
import { initAdminRequests } from './requests.js';
import { initAdminVisits } from './visits.js';

export function init() {
  initAdminNavigation();
  initAdminVacancies();
  initAdminEmployees();
  initAdminVehicles(getEmployees);
  initAdminRequests({ upsertEmployee, refreshEmployees });
  initAdminVisits(getAdminVacancies);
}
