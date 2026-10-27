export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function dispatchApiEvent(name, detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    const statusMessages = {
      400: 'Dados inválidos. Confira as informações e tente novamente.',
      401: 'Sua sessão expirou ou as credenciais são inválidas.',
      403: 'Você não tem permissão para realizar esta operação.',
      429: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
    };
    const serverMessage = data?.error || data?.message;
    const message = typeof serverMessage === 'string' && serverMessage.trim()
      ? serverMessage
      : statusMessages[response.status] || 'Não foi possível concluir a operação.';

    if (response.status === 401) dispatchApiEvent('parkschool:session-expired');
    if (response.status === 403) dispatchApiEvent('parkschool:access-forbidden', { message });
    throw Object.assign(new Error(message), { status: response.status });
  }

  return data;
}
