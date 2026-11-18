//Arquivo: Front_Park/js/pages/redefinir-senha/index.js
import { Toast } from 'bootstrap';
import { api } from '../../api.js';
 
export function init() {
  const form = document.getElementById('reset-form');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  const confirmError = document.getElementById('confirm-error');
  const submit = document.getElementById('submit-btn');
  const togglePassword = document.getElementById('toggle-password');
  const toastElement = document.getElementById('recoveryToast');
  if (!form || !password || !confirm || !submit || !toastElement) return;
 
  const toast = Toast.getOrCreateInstance(toastElement, { delay: 5000 });
  const toastMessage = document.getElementById('toast-message');
  const label = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');
 
  const showToast = (message, type = 'success') => {
    toastElement.classList.remove('text-bg-success', 'text-bg-danger');
    toastElement.classList.add(type === 'success' ? 'text-bg-success' : 'text-bg-danger');
    if (toastMessage) toastMessage.textContent = message;
    toast.show();
  };
 
  
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  history.replaceState(null, '', window.location.pathname);
 
  if (!token) {
    showToast('Link inválido ou expirado. Solicite uma nova recuperação de senha.', 'error');
    submit.disabled = true;
    return;
  }
 
  togglePassword?.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    togglePassword.querySelector('i')?.classList.toggle('fa-eye', !show);
    togglePassword.querySelector('i')?.classList.toggle('fa-eye-slash', show);
  });
 
  const validate = () => {
    const longEnough = password.value.length >= 8;
    const matches = password.value === confirm.value;
    confirmError?.classList.toggle('d-none', matches || !confirm.value);
    submit.disabled = !(longEnough && matches);
    return longEnough && matches;
  };
  password.addEventListener('input', validate);
  confirm.addEventListener('input', validate);
 
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate()) return;
    submit.disabled = true;
    if (label) label.textContent = 'Salvando...';
    spinner?.classList.remove('d-none');
 
    try {
      // 2) O token vai no corpo do POST, não na URL
      await api('/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ token, password: password.value }),
      });
      showToast('Senha alterada com sucesso! Redirecionando para o login...');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    } catch (error) {
      showToast(error.status ? error.message : 'Sem conexão com o servidor. Tente novamente.', 'error');
      submit.disabled = false;
    } finally {
      if (label) label.textContent = 'Salvar nova senha';
      spinner?.classList.add('d-none');
    }
  });
 
  validate();
}