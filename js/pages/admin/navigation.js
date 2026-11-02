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
      // guarda a seção na URL (admin.html#visitas) sem criar histórico nem rolar a página
      history.replaceState(null, '', `#${screenName}`);
      // avisa os outros módulos que uma tela foi aberta
      document.dispatchEvent(new CustomEvent('admin-tela', { detail: screenName }));
    });
  });

  document.querySelectorAll('[data-action="ir-para-tela"]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector(`#sidebar [data-nav="${button.dataset.screen}"]`)?.click();
    });
  });

  const initial = decodeURIComponent(window.location.hash.slice(1));
  if (initial) document.querySelector(`#sidebar [data-nav="${CSS.escape(initial)}"]`)?.click();
}