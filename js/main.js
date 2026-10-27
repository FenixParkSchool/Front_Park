import { protectPage, isProtectedPage } from './sessao.js';
import { logout } from './services/auth.js';
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
  await protectPage(pageName, initializePage);
} else {
  await initializePage();
}

document.getElementById('btn-sair')?.addEventListener('click', () => logout().catch(error => window.alert(error.message)));
