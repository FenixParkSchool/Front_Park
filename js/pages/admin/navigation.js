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

}
