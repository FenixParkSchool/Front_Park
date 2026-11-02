import { localStore } from '../shared/storage.js';

const arrayRepo = (key) => ({
  list: () => {
    const value = localStore.get(key, []);
    return Array.isArray(value) ? value : [];
  },
  save: (items) => localStore.set(key, items),
});

export const vehiclesRepo = arrayRepo('park_veiculos');
export const requestsRepo = arrayRepo('park_solicitacoes');