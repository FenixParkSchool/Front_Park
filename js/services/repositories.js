import { localStore } from '../shared/storage.js';

const arrayRepo = (key) => ({
  list: () => {
    const value = localStore.get(key, []);
    return Array.isArray(value) ? value : [];
  },
  save: (items) => localStore.set(key, items),
});

export const employeesRepo = {
  ...arrayRepo('park_funcionarios'),
  upsert(employee) {
    const employees = this.list();
    const index = employees.findIndex((item) => String(item.id) === String(employee.id));
    if (index < 0) employees.push(employee);
    else employees[index] = { ...employees[index], ...employee };
    this.save(employees);
    return employees;
  },
};

export const vehiclesRepo = arrayRepo('park_veiculos');
export const requestsRepo = arrayRepo('park_solicitacoes');
export const visitsRepo = arrayRepo('park_visitas');
export const reservationsRepo = arrayRepo('reservasVagas');
