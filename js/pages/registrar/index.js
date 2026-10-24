import { Modal } from 'bootstrap';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export function init() {
  const form = document.getElementById('formRegistro');
  const name = document.getElementById('nome');
  const email = document.getElementById('email');
  const profile = document.getElementById('perfil');
  const password = document.getElementById('senha');
  const confirmPassword = document.getElementById('confirmarSenha');
  const feedback = document.getElementById('passwordMismatchFeedback');
  const terms = document.getElementById('termos');
  if (!form || !name || !email || !profile || !password || !confirmPassword) return;

  // Retira dados sensíveis legados sem limpar indiscriminadamente o storage da sessão.
  ['park_solicitacoes', 'senha', 'user'].forEach((key) => window.localStorage.removeItem(key));
  window.sessionStorage.removeItem('cadastroRecente');

  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonLabel = submitButton?.textContent.trim() || 'Criar Conta';

  const validatePasswords = () => {
    const mismatch = confirmPassword.value.length > 0 && password.value !== confirmPassword.value;
    confirmPassword.closest('.ds-input-group')?.classList.toggle('is-invalid', mismatch);
    feedback?.classList.toggle('d-none', !mismatch);
    feedback?.classList.toggle('d-block', mismatch);
    return !mismatch;
  };

  password.addEventListener('input', validatePasswords);
  confirmPassword.addEventListener('input', validatePasswords);

  document.querySelectorAll('.btn-toggle-password').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      const icon = button.querySelector('i');
      if (!input || !icon) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !show);
      icon.classList.toggle('fa-eye-slash', show);
      button.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  });

  document.getElementById('btn_aceitar_modal')?.addEventListener('click', () => {
    if (terms) terms.checked = true;
    const modalElement = document.getElementById('modalTermos');
    if (modalElement) Modal.getInstance(modalElement)?.hide();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const passwordsMatch = validatePasswords();
    if (!form.checkValidity() || !passwordsMatch) {
      event.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    const userTypeId = Number(profile.value);
    if (![1, 2].includes(userTypeId)) {
      profile.focus();
      window.alert('Selecione um nível de acesso válido.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'A cadastrar...';
    }

    try {
      const response = await window.fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name.value.trim(),
          email: email.value.trim(),
          senhaHash: password.value,
          idTipoUsuario: userTypeId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        window.alert('Conta cadastrada com sucesso! Redirecionando para o login.');
        window.location.href = 'login.html';
      } else if (response.status === 409) {
        window.alert(data.error || 'Este e-mail já está cadastrado no sistema.');
        email.focus();
      } else {
        window.alert(data.error || 'Erro ao realizar o cadastro. Verifique os dados.');
      }
    } catch (error) {
      console.error('Erro na comunicação com a API:', error);
      window.alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonLabel;
      }
    }
  });
}
