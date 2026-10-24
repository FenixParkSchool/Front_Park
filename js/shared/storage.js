const read = (storage, key, fallback) => {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const write = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const localStore = {
  get: (key, fallback = null) => read(window.localStorage, key, fallback),
  set: (key, value) => write(window.localStorage, key, value),
  remove: (key) => window.localStorage.removeItem(key),
};

export const sessionStore = {
  get: (key, fallback = null) => read(window.sessionStorage, key, fallback),
  set: (key, value) => write(window.sessionStorage, key, value),
  remove: (key) => window.sessionStorage.removeItem(key),
};
