import { bindLogout, protectPage, isProtectedPage } from './sessao.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

const pageLoaders = {
  login: () => import('./pages/login/index.js'),
  admin: () => import('./pages/admin/index.js'),
  registrar: () => import('./pages/registrar/index.js'),
  cadastroVeiculo: () => import('./pages/cadastro-veiculo/index.js'),
  esqueciSenha: () => import('./pages/esqueci-senha/index.js'),
  reserva: () => import('./pages/reserva/index.js'),
  vigilante: () => import('./pages/vigilante/index.js'),
  perfil: () => import('./pages/perfil.js'),
};

const pageName = document.body.dataset.page;
const loadPage = pageLoaders[pageName];

async function initializePage() {
  if (!loadPage) return;
  try {
    const page = await loadPage();
    await page.init();
  } catch (error) {
    console.error(`Não foi possível inicializar a página "${pageName}".`, error);
  }
}

if (isProtectedPage(pageName)) {
  const verifyCurrentSession = async () => {
    const authorized = await protectPage(pageName, initializePage);
    if (authorized) bindLogout();
  };
  await verifyCurrentSession();
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) verifyCurrentSession();
  });
} else {
  await initializePage();
}
