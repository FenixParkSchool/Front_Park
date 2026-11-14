import { Toast } from 'bootstrap';
import { api } from '../../api.js';

export function init() {
  const email = document.getElementById('email');
  const submit = document.getElementById('submit-btn');
  const form = document.getElementById('request-form');
  const toastElement = document.getElementById('recoveryToast');
  if (!email || !submit || !form || !toastElement) return;
  const toast = Toast.getOrCreateInstance(toastElement, { delay: 5000 });
  const toastMessage = document.getElementById('toast-message');
  const label = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');

  // Mostra o toast em verde (sucesso) ou vermelho (erro)
  const showToast = (message, type = 'success') => {
    toastElement.classList.remove('text-bg-success', 'text-bg-danger');
    toastElement.classList.add(type === 'success' ? 'text-bg-success' : 'text-bg-danger');
    if (toastMessage) toastMessage.textContent = message;
    toast.show();
  };

  const validate = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    submit.disabled = !valid;
    return valid;
  };
  email.addEventListener('input', validate);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate()) return;
    submit.disabled = true;
    if (label) label.textContent = 'Enviando...';
    spinner?.classList.remove('d-none');

    try {
      await api('/esqueci-senha', {
        method: 'POST',
        body: JSON.stringify({ email: email.value.trim() }),
      });
      showToast('Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.');
      email.value = '';
    } catch (error) {
      if (error.status) {
        showToast(error.message, 'error');
      } else {
        showToast('Sem conexão com o servidor. Tente novamente.', 'error');
      }
    } finally {
      if (label) label.textContent = 'Solicitar recuperação';
      spinner?.classList.add('d-none');
      validate();
    }
  });
  validate();
}