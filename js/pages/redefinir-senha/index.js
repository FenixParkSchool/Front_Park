import { Toast } from 'bootstrap';
import { api } from '../../api.js';

export function init() {
  const form = document.getElementById('reset-form');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  const confirmError = document.getElementById('confirm-error');
  const toggle = document.getElementById('toggle-password');
  const submit = document.getElementById('submit-btn');
  const label = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');
  const toastElement = document.getElementById('recoveryToast');
  const toastMessage = document.getElementById('toast-message');
  if (!form || !password || !confirm || !submit || !toastElement) return;

  const toast = Toast.getOrCreateInstance(toastElement, { delay: 5000 });
  const showToast = (message, type = 'success') => {
    toastElement.classList.remove('text-bg-success', 'text-bg-danger');
    toastElement.classList.add(type === 'success' ? 'text-bg-success' : 'text-bg-danger');
    if (toastMessage) toastMessage.textContent = message;
    toast.show();
  };

  // O token vem no link do e-mail: redefinir_senha.html?token=XXXX
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    submit.disabled = true;
    showToast('Link inválido. Solicite uma nova recuperação de senha.', 'error');
    return;
  }

  // Botão de mostrar/ocultar senha
  toggle?.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    confirm.type = show ? 'text' : 'password';
    toggle.querySelector('i')?.classList.toggle('fa-eye', !show);
    toggle.querySelector('i')?.classList.toggle('fa-eye-slash', show);
  });

  // Mesmas regras do backend: mínimo 8 caracteres e no máximo 72 bytes (limite do bcrypt)
  const byteLength = (value) => new TextEncoder().encode(value).length;
  const validate = () => {
    const okLength = password.value.length >= 8 && byteLength(password.value) <= 72;
    const okMatch = password.value === confirm.value;
    const showMismatch = confirm.value.length > 0 && !okMatch;
    confirmError?.classList.toggle('d-none', !showMismatch);
    submit.disabled = !(okLength && okMatch);
    return okLength && okMatch;
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
      await api('/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ token, password: password.value }),
      });
      showToast('Senha alterada com sucesso! Redirecionando para o login...');
      window.setTimeout(() => { window.location.href = 'login.html'; }, 2000);
      return; // mantém o botão desabilitado durante o redirecionamento
    } catch (error) {
      if (error.status) {
        showToast(error.message, 'error');
      } else {
        showToast('Sem conexão com o servidor. Tente novamente.', 'error');
      }
    }

    if (label) label.textContent = 'Salvar nova senha';
    spinner?.classList.add('d-none');
    validate();
  });

  validate();
}