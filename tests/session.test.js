import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  canOpenPage,
  bindLogout,
  logout,
  pageForProfile,
  profileFromSession,
  protectPage,
} from '../js/sessao.js';

function createHarness({ href = 'https://app.example/pages/admin.html' } = {}) {
  const body = { dataset: { accessState: 'checking' } };
  const message = { textContent: '' };
  const retryButton = {
    hidden: true,
    disabled: false,
    handler: null,
    addEventListener(eventName, handler) {
      if (eventName === 'click') this.handler = handler;
    },
  };
  const feedback = { textContent: '', hidden: true };
  const handlers = new Map();
  const redirects = [];
  const documentRef = {
    body,
    getElementById(id) {
      return {
        'access-message': message,
        'access-retry': retryButton,
        'access-feedback': feedback,
      }[id] || null;
    },
  };
  const windowRef = {
    location: {
      href,
      replace: (destination) => redirects.push(destination),
    },
    history: { replaceState() {} },
    addEventListener: (eventName, handler) => handlers.set(eventName, handler),
  };
  return { body, message, retryButton, feedback, handlers, redirects, documentRef, windowRef };
}

const dependencies = (harness, apiClient) => ({
  documentRef: harness.documentRef,
  windowRef: harness.windowRef,
  apiClient,
});

test('lê o perfil do GET /me tanto na raiz quanto no objeto user entregue por F01', () => {
  assert.equal(profileFromSession({ perfil: 'FUNCIONARIO' }), 'FUNCIONARIO');
  assert.equal(profileFromSession({ user: { perfil: 'VIGILANTE' } }), 'VIGILANTE');
  assert.equal(profileFromSession({ user: { role: 'ADMIN' } }), 'ADMINISTRADOR');
  assert.equal(pageForProfile('FUNCIONARIO'), 'perfil.html');
  assert.equal(pageForProfile('ADMIN'), 'admin.html');
  assert.equal(pageForProfile('toString'), null);
});

test('cada página privada permite somente o perfil autorizado', () => {
  assert.equal(canOpenPage('admin', 'ADMINISTRADOR'), true);
  assert.equal(canOpenPage('admin', 'ADMIN'), true);
  assert.equal(canOpenPage('reserva', 'ADMINISTRADOR'), true);
  assert.equal(canOpenPage('reserva', 'ADMIN'), true);
  assert.equal(canOpenPage('vigilante', 'VIGILANTE'), true);
  assert.equal(canOpenPage('perfil', 'FUNCIONARIO'), true);
  assert.equal(canOpenPage('admin', 'FUNCIONARIO'), false);
  assert.equal(canOpenPage('reserva', 'VIGILANTE'), false);
  assert.equal(canOpenPage('perfil', 'ADMINISTRADOR'), false);
  assert.equal(canOpenPage('cadastroVeiculo', 'FUNCIONARIO'), true);
  assert.equal(canOpenPage('cadastroVeiculo', 'ADMINISTRADOR'), false);
});

test('perfil autorizado libera a página depois de consultar a sessão e só então inicializa dados', async () => {
  const harness = createHarness();
  const events = [];
  const allowed = await protectPage('admin', async () => events.push('inicializar'), dependencies(
    harness,
    async (path) => {
      events.push(`consulta:${path}`);
      return { user: { role: 'ADMINISTRADOR' } };
    },
  ));
  assert.equal(allowed, true);
  assert.deepEqual(events, ['consulta:/me', 'inicializar']);
  assert.equal(harness.body.dataset.accessState, 'ready');
  assert.deepEqual(harness.redirects, []);
});

test('perfil diferente é encaminhado à própria área com aviso e sem inicializar a página proibida', async () => {
  const harness = createHarness();
  let initialized = false;
  const allowed = await protectPage('admin', () => { initialized = true; }, dependencies(
    harness,
    async () => ({ user: { role: 'FUNCIONARIO' } }),
  ));
  assert.equal(allowed, false);
  assert.equal(initialized, false);
  assert.deepEqual(harness.redirects, ['perfil.html?access=denied']);
  assert.equal(harness.body.dataset.accessState, 'redirecting');
});

test('a página legada de veículos valida a sessão e redireciona o funcionário ao perfil', async () => {
  const harness = createHarness({ href: 'https://app.example/pages/cadastro_veiculo.html' });
  let initialized = false;
  const allowed = await protectPage('cadastroVeiculo', () => { initialized = true; }, dependencies(
    harness,
    async () => ({ user: { role: 'FUNCIONARIO' } }),
  ));
  assert.equal(allowed, false);
  assert.equal(initialized, false);
  assert.deepEqual(harness.redirects, ['perfil.html']);
});

test('o cadastro de veículos é liberado somente quando o funcionário possui ficha vinculada', async () => {
  const harness = createHarness({ href: 'https://app.example/pages/cadastro_veiculo.html' });
  let initialized = false;
  const allowed = await protectPage('cadastroVeiculo', () => { initialized = true; }, dependencies(
    harness,
    async () => ({ user: { role: 'FUNCIONARIO', idFuncionario: 27 } }),
  ));
  assert.equal(allowed, true);
  assert.equal(initialized, true);
  assert.deepEqual(harness.redirects, []);
});

test('401 na consulta inicial exige login e não inicializa a página', async () => {
  const harness = createHarness();
  let initialized = false;
  const unauthorized = Object.assign(new Error('Não autorizado'), { status: 401 });
  const allowed = await protectPage('admin', () => { initialized = true; }, dependencies(
    harness,
    async () => { throw unauthorized; },
  ));
  assert.equal(allowed, false);
  assert.equal(initialized, false);
  assert.deepEqual(harness.redirects, ['login.html']);
  assert.equal(harness.body.dataset.accessState, 'expired');
});

test('falha de rede não libera a página e o botão tenta novamente com sucesso', async () => {
  const harness = createHarness();
  let attempts = 0;
  let initialized = 0;
  const allowed = await protectPage('perfil', () => { initialized += 1; }, dependencies(
    harness,
    async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError('Falha de rede.');
      return { perfil: 'FUNCIONARIO' };
    },
  ));
  assert.equal(allowed, false);
  assert.equal(initialized, 0);
  assert.equal(harness.body.dataset.accessState, 'network-error');
  assert.match(harness.message.textContent, /Não foi possível verificar seu acesso/u);
  assert.equal(harness.retryButton.hidden, false);

  await harness.retryButton.handler();
  assert.equal(attempts, 2);
  assert.equal(initialized, 1);
  assert.equal(harness.body.dataset.accessState, 'ready');
});

test('403 posterior mostra aviso de falta de permissão, sem navegar como operação concluída', async () => {
  const harness = createHarness();
  await protectPage('admin', async () => {}, dependencies(
    harness,
    async () => ({ user: { role: 'ADMINISTRADOR' } }),
  ));
  harness.handlers.get('parkschool:access-forbidden')({ detail: { message: 'Regra da API.' } });
  assert.equal(harness.feedback.hidden, false);
  assert.match(harness.feedback.textContent, /Acesso não permitido/u);
  assert.match(harness.feedback.textContent, /Regra da API/u);
  assert.deepEqual(harness.redirects, []);
});

test('401 posterior oculta novamente a página protegida e redireciona para o login', async () => {
  const harness = createHarness();
  await protectPage('admin', async () => {}, dependencies(
    harness,
    async () => ({ user: { role: 'ADMINISTRADOR' } }),
  ));
  harness.handlers.get('parkschool:session-expired')();
  assert.equal(harness.body.dataset.accessState, 'expired');
  assert.deepEqual(harness.redirects, ['login.html']);
});

test('logout envia POST, limpa o estado privado e abre o login somente após sucesso', async () => {
  const harness = createHarness();
  let cleared = 0;
  const originalStorage = globalThis.sessionStorage;
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: { clear: () => { cleared += 1; } },
  });
  try {
    const requests = [];
    await logout({
      apiClient: async (path, options) => { requests.push({ path, options }); },
      documentRef: harness.documentRef,
      windowRef: harness.windowRef,
    });
    assert.deepEqual(requests, [{ path: '/logout', options: { method: 'POST' } }]);
    assert.equal(cleared, 1);
    assert.equal(harness.body.dataset.accessState, 'expired');
    assert.deepEqual(harness.redirects, ['login.html']);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: originalStorage });
    else delete globalThis.sessionStorage;
  }
});

test('falha de rede no logout mantém o botão disponível e exibe erro sem redirecionar', async () => {
  const harness = createHarness();
  const button = {
    disabled: false,
    handler: null,
    addEventListener(eventName, handler) {
      if (eventName === 'click') this.handler = handler;
    },
  };
  harness.documentRef.querySelectorAll = () => [button];
  bindLogout({
    documentRef: harness.documentRef,
    windowRef: harness.windowRef,
    apiClient: async () => { throw new TypeError('Falha de rede.'); },
  });
  await button.handler();
  assert.equal(button.disabled, false);
  assert.equal(harness.feedback.hidden, false);
  assert.equal(harness.feedback.textContent, 'Falha de rede.');
  assert.deepEqual(harness.redirects, []);
});

test('todas as páginas privadas apresentam gate antes do conteúdo e carregam main.js', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const privatePages = ['admin.html', 'tela-vigilante.html', 'perfil.html', 'reserva_vaga.html', 'cadastro_veiculo.html'];
  for (const page of privatePages) {
    const html = readFileSync(`${root}pages/${page}`, 'utf8');
    assert.match(html, /data-access-required="true"/u, `${page} precisa iniciar protegida`);
    assert.match(html, /id="access-state"[\s\S]*?Verificando acesso\.\.\./u, `${page} precisa exibir o estado de verificação`);
    assert.match(html, /id="access-retry"[\s\S]*?Tentar novamente/u, `${page} precisa oferecer retry`);
    assert.match(html, /<script\s+type="module"\s+src="\.\.\/js\/main\.js"/u, `${page} precisa carregar o guard compartilhado`);
  }
});
