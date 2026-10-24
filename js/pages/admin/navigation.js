export function initAdminNavigation() {
  document.querySelectorAll('#sidebar [data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const screenName = button.dataset.nav;
      document.querySelectorAll('[data-tela]').forEach((screen) => screen.classList.remove('ativa'));
      document.querySelector(`[data-tela="${screenName}"]`)?.classList.add('ativa');
      document.querySelectorAll('#sidebar [data-nav]').forEach((item) => {
        item.classList.toggle('active', item === button);
        if (item === button) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    });
  });

  document.querySelectorAll('[data-action="ir-para-tela"]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector(`#sidebar [data-nav="${button.dataset.screen}"]`)?.click();
    });
  });

  document.getElementById('btn-sair')?.addEventListener('click', () => {
    document.getElementById('app')?.classList.add('d-none');
    document.getElementById('tela-saida')?.classList.remove('d-none');
  });

  document.querySelector('[data-action="entrar-novamente"]')?.addEventListener('click', () => {
    document.getElementById('tela-saida')?.classList.add('d-none');
    document.getElementById('app')?.classList.remove('d-none');
  });
}
