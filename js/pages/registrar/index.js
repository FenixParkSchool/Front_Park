import { Modal } from 'bootstrap';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Formato: texto@dominio.extensao
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Senhas muito comuns que serão recusadas
const COMMON_PASSWORDS = [
  '12345678', '123456789', '1234567890', '11111111', 'password', 'password1',
  'senha123', 'senha1234', 'qwerty123', 'abc12345', 'admin123', 'estacionamento',
  'parkschool', 'iloveyou1',
];

const STRENGTH_LEVELS = {
  1: 'Fraca',
  2: 'Média',
  3: 'Forte',
  4: 'Muito forte',
};

const STRENGTH_COLORS = {
  1: '#dc3545',
  2: '#fd7e14',
  3: '#b58100',
  4: '#198754',
};

function evaluatePassword(value, { name = '', email = '' } = {}) {
  const rules = {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9\s]/.test(value),
  };

  const lower = value.toLowerCase();
  const emailUser = email.split('@')[0].toLowerCase();
  const firstName = name.trim().split(/\s+/)[0].toLowerCase();

  const isCommon = COMMON_PASSWORDS.includes(lower);
  const hasPersonalData =
    (emailUser.length >= 3 && lower.includes(emailUser)) ||
    (firstName.length >= 3 && lower.includes(firstName));
  const hasRepeats = /(.)\1{3,}/.test(value); // ex: aaaa, 1111

  const metCount = Object.values(rules).filter(Boolean).length;
  const allRules = metCount === 5;

  const score = metCount + (value.length >= 12 ? 1 : 0);
  let level = score <= 2 ? 1 : score <= 4 ? 2 : score === 5 ? 3 : 4;
  if (value.length === 0) level = 0;
  if (isCommon || hasPersonalData || hasRepeats) level = Math.min(level, 1);

  let error = '';
  if (!allRules) error = 'A senha não atende a todos os requisitos.';
  else if (isCommon) error = 'Essa senha é muito comum. Escolha outra.';
  else if (hasPersonalData) error = 'A senha não pode conter seu nome ou e-mail.';
  else if (hasRepeats) error = 'Evite repetir o mesmo caractere várias vezes seguidas.';

  return { rules, level, valid: error === '', error };
}

export function init() {
  const form = document.getElementById('formRegistro');
  const name = document.getElementById('nome');
  const email = document.getElementById('email');
  const profile = document.getElementById('perfil');
  const password = document.getElementById('senha');
  const confirmPassword = document.getElementById('confirmarSenha');
  const feedback = document.getElementById('passwordMismatchFeedback');
  const emailFeedback = document.getElementById('emailFeedback');
  const passwordFeedback = document.getElementById('passwordFeedback');
  const strengthFill = document.getElementById('passwordStrengthFill');
  const strengthLabel = document.getElementById('passwordStrengthLabel');
  const terms = document.getElementById('termos');
  if (!form || !name || !email || !profile || !password || !confirmPassword) return;

  // Retira dados sensíveis legados sem limpar indiscriminadamente o storage da sessão.
  ['park_solicitacoes', 'senha', 'user'].forEach((key) => window.localStorage.removeItem(key));
  window.sessionStorage.removeItem('cadastroRecente');

  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonLabel = submitButton?.textContent.trim() || 'Criar Conta';

  // Mostra/esconde a mensagem de erro de um campo
  const showError = (input, feedbackEl, show, message) => {
    input.closest('.ds-input-group')?.classList.toggle('is-invalid', show);
    if (feedbackEl) {
      if (message) feedbackEl.textContent = message;
      feedbackEl.classList.toggle('d-none', !show);
      feedbackEl.classList.toggle('d-block', show);
    }
  };

  const validateEmail = () => {
    const value = email.value.trim();
    const valid = EMAIL_REGEX.test(value);
    showError(email, emailFeedback, value.length > 0 && !valid);
    return valid;
  };

  const validatePasswords = () => {
    const mismatch = confirmPassword.value.length > 0 && password.value !== confirmPassword.value;
    showError(confirmPassword, feedback, mismatch, 'As senhas não coincidem.');
    return !mismatch && confirmPassword.value.length > 0;
  };

  const updatePasswordStrength = (showMessage = true) => {
    const result = evaluatePassword(password.value, {
      name: name.value,
      email: email.value,
    });

    // Barra e texto de força
    if (strengthFill) strengthFill.dataset.level = String(result.level);
    if (strengthLabel) {
      strengthLabel.textContent = STRENGTH_LEVELS[result.level] || '';
      strengthLabel.style.color = STRENGTH_COLORS[result.level] || '';
    }

    // Checklist de requisitos
    document.querySelectorAll('.password-rules li').forEach((li) => {
      const ok = result.rules[li.dataset.rule];
      li.classList.toggle('ok', ok);
      const icon = li.querySelector('i');
      icon?.classList.toggle('fa-circle-check', ok);
      icon?.classList.toggle('fa-solid', ok);
      icon?.classList.toggle('fa-circle', !ok);
      icon?.classList.toggle('fa-regular', !ok);
    });

    if (showMessage) {
      showError(password, passwordFeedback, password.value.length > 0 && !result.valid, result.error);
    }
    return result.valid;
  };

  email.addEventListener('input', validateEmail);
  email.addEventListener('blur', validateEmail);
  name.addEventListener('input', () => updatePasswordStrength(password.value.length > 0));

  password.addEventListener('input', () => {
    updatePasswordStrength();
    if (confirmPassword.value) validatePasswords();
  });
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

    // E-mail
    const emailOk = validateEmail();
    if (!email.value.trim()) showError(email, emailFeedback, true);

    // Senha
    const passwordOk = updatePasswordStrength();
    if (!password.value) showError(password, passwordFeedback, true, 'Informe uma senha.');

    // Confirmação
    const passwordsMatch = validatePasswords();
    if (!passwordsMatch && !confirmPassword.value) {
      showError(confirmPassword, feedback, true, 'Confirme a senha.');
    }

    if (!form.checkValidity() || !emailOk || !passwordOk || !passwordsMatch) {
      event.stopPropagation();
      form.classList.add('was-validated');
      form.querySelector('.is-invalid input, :invalid')?.focus();
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
          email: email.value.trim().toLowerCase(),
          senhaHash: password.value,
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