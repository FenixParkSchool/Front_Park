import { api, loginDestinationForProfile } from '../../services/auth.js';

export function init() {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('senha');
  const feedback = document.getElementById('login-feedback');
  if (!form || !emailInput || !passwordInput || !feedback) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = document.getElementById('login-submit-label');
  const defaultLabel = submitLabel?.textContent || 'Entrar';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton?.disabled) return;

    feedback.textContent = '';
    feedback.classList.add('d-none');
    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Entrando...';

    try {
      const { user } = await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        }),
      });
      const destination = loginDestinationForProfile(user?.perfil);
      if (!destination) {
        throw new Error('Conta sem perfil autorizado. Contate a administração.');
      }
      window.location.assign(destination);
    } catch (error) {
      feedback.textContent = error.message || 'Não foi possível entrar. Tente novamente.';
      feedback.classList.remove('d-none');
    } finally {
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = defaultLabel;
    }
  });
}
