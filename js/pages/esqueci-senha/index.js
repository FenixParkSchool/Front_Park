import { Toast } from 'bootstrap';

export function init() {
  const email = document.getElementById('email');
  const submit = document.getElementById('submit-btn');
  const form = document.getElementById('request-form');
  const toastElement = document.getElementById('recoveryToast');
  if (!email || !submit || !form || !toastElement) return;
  const toast = Toast.getOrCreateInstance(toastElement, { delay: 5000 });
  const label = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');

  const validate = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    submit.disabled = !valid;
    return valid;
  };
  email.addEventListener('input', validate);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validate()) return;
    submit.disabled = true;
    if (label) label.textContent = 'Registrando...';
    spinner?.classList.remove('d-none');
    window.setTimeout(() => {
      if (label) label.textContent = 'Solicitar recuperação';
      spinner?.classList.add('d-none');
      toast.show();
      email.value = '';
      validate();
    }, 900);
  });
  validate();
}
