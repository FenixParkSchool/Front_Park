import test from 'node:test';
import assert from 'node:assert/strict';
import { api, loginDestinationForProfile } from '../js/services/auth.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const loginHtml = readFileSync(new URL('../pages/login.html', import.meta.url), 'utf8');
const loginModule = readFileSync(new URL('../js/pages/login/index.js', import.meta.url), 'utf8');

function createElement(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    textContent: '',
    disabled: false,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
  };
}

async function submitLogin({ response, requestFailure, email = '  pessoa@example.com ', password = 'SenhaDeTeste123!' }) {
  const originals = Object.fromEntries(['document', 'window', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const submitButton = createElement();
  const submitLabel = createElement();
  submitLabel.textContent = 'Entrar';
  const feedback = createElement(['d-none']);
  const emailInput = { value: email };
  const passwordInput = { value: password };
  let submitHandler;
  let request;
  const destination = { value: null };
  const form = {
    querySelector: (selector) => selector === 'button[type="submit"]' ? submitButton : null,
    addEventListener: (eventName, handler) => {
      if (eventName === 'submit') submitHandler = handler;
    },
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      getElementById: (id) => ({
        'login-form': form,
        email: emailInput,
        senha: passwordInput,
        'login-feedback': feedback,
        'login-submit-label': submitLabel,
      })[id] || null,
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { assign: (path) => { destination.value = path; } } },
  });
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url, options) => {
      request = { url, options };
      if (requestFailure) throw requestFailure;
      return response;
    },
  });

  try {
    const { init } = await import('../js/pages/login/index.js');
    init();
    let prevented = false;
    await submitHandler({ preventDefault: () => { prevented = true; } });
    return { destination: destination.value, feedback, submitButton, submitLabel, prevented, request };
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('o login envia e-mail e senha separadamente com sessão por cookie e encaminha cada perfil', async () => {
  const scenarios = [
    ['VIGILANTE', 'tela-vigilante.html'],
    ['FUNCIONARIO', 'perfil.html'],
    ['ADMINISTRADOR', 'admin.html'],
  ];

  for (const [perfil, page] of scenarios) {
    assert.equal(loginDestinationForProfile(perfil), page);
    const result = await submitLogin({
      response: { ok: true, status: 200, json: async () => ({ user: { perfil } }) },
    });
    assert.equal(result.prevented, true);
    assert.equal(result.destination, page);
    assert.equal(result.request.url.endsWith('/login'), true);
    assert.equal(result.request.options.method, 'POST');
    assert.equal(result.request.options.credentials, 'include');
    assert.deepEqual(JSON.parse(result.request.options.body), {
      email: 'pessoa@example.com',
      password: 'SenhaDeTeste123!',
    });
    assert.equal(result.submitButton.disabled, false);
    assert.equal(result.submitLabel.textContent, 'Entrar');
  }
  assert.equal(loginDestinationForProfile('toString'), null);
});

test('erros 400, 401 e 429 ficam visíveis e mantêm a pessoa na tela de login', async () => {
  for (const status of [400, 401, 429]) {
    const result = await submitLogin({
      response: { ok: false, status, json: async () => ({ error: `Erro ${status}.` }) },
    });
    assert.equal(result.destination, null);
    assert.equal(result.feedback.textContent, `Erro ${status}.`);
    assert.equal(result.feedback.classList.contains('d-none'), false);
    assert.equal(result.submitButton.disabled, false);
  }
});

test('falha de rede mostra feedback e mantém a pessoa na tela de login', async () => {
  const result = await submitLogin({ requestFailure: new TypeError('Falha de rede.') });
  assert.equal(result.destination, null);
  assert.equal(result.feedback.textContent, 'Falha de rede.');
  assert.equal(result.feedback.classList.contains('d-none'), false);
  assert.equal(result.submitButton.disabled, false);
});

test('API apresenta mensagem útil para excesso de tentativas sem resposta textual do servidor', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try {
    await assert.rejects(api('/login', { method: 'POST', body: '{}' }), (error) => {
      assert.equal(error.status, 429);
      assert.match(error.message, /Muitas tentativas/u);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('API retorna null para respostas 204', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 204 });
  try {
    assert.equal(await api('/logout'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a tela de login não exibe ações simuladas nem persiste credenciais no navegador', () => {
  assert.match(loginHtml, /id="email"[^>]*name="email"/u);
  assert.match(loginHtml, /id="senha"[^>]*name="password"/u);
  assert.match(loginHtml, /id="login-feedback"[^>]*role="alert"/u);
  assert.doesNotMatch(loginHtml, /id="lembrar"|esqueci_senha\.html|registrar\.html/u);
  assert.match(loginModule, /user\?\.perfil/u);
  assert.doesNotMatch(loginModule, /document\.cookie|localStorage|sessionStorage/u);
  assert.match(readFileSync(new URL('../pages/perfil.html', import.meta.url), 'utf8'), /<h1[^>]*>Meu perfil<\/h1>/u);
  assert.ok(root.endsWith('/Front_Park/'));
});
