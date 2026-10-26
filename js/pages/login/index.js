import { api, homeForRole } from '../../services/auth.js';
export function init() {
  const form = document.querySelector('form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const { user } = await api('/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('email').value.trim(), password: document.getElementById('senha').value }) });
      if (!['ADMIN', 'VIGILANTE', 'FUNCIONARIO'].includes(user.role)) throw new Error('Conta sem perfil autorizado. Contate a administra??o.');
      location.assign(homeForRole(user.role));
    } catch (error) { window.alert(error.message); }
    finally { button.disabled = false; }
  });
}
