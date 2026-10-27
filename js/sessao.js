import { api } from './api.js';

const HOME_BY_PROFILE = Object.freeze({
  VIGILANTE: 'tela-vigilante.html',
  FUNCIONARIO: 'perfil.html',
  ADMINISTRADOR: 'admin.html',
});

const PAGE_POLICIES = Object.freeze({
  admin: ['ADMINISTRADOR'],
  vigilante: ['VIGILANTE'],
  perfil: ['FUNCIONARIO'],
  reserva: ['ADMINISTRADOR'],
  cadastroVeiculo: [],
});

export const isProtectedPage = (pageName) => Object.hasOwn(PAGE_POLICIES, pageName);

const canonicalProfile = (profile) => profile === 'ADMIN' ? 'ADMINISTRADOR' : profile;

export function profileFromSession(data) {
  const profile = data?.perfil
    ?? data?.user?.perfil
    ?? data?.user?.role
    ?? data?.role
    ?? null;
  return canonicalProfile(profile);
}

export function pageForProfile(profile) {
  const normalizedProfile = canonicalProfile(profile);
  return Object.hasOwn(HOME_BY_PROFILE, normalizedProfile) ? HOME_BY_PROFILE[normalizedProfile] : null;
}

export function canOpenPage(pageName, profile) {
  if (!Object.hasOwn(PAGE_POLICIES, pageName) || pageName === 'cadastroVeiculo') return false;
  return PAGE_POLICIES[pageName].includes(canonicalProfile(profile));
}

function setGateMessage(documentRef, message) {
  const element = documentRef.getElementById('access-message');
  if (element) element.textContent = message;
}

function redirectWithDeniedNotice(windowRef, destination) {
  const targetUrl = new URL(destination, windowRef.location.href);
  targetUrl.searchParams.set('access', 'denied');
  const pageName = targetUrl.pathname.slice(targetUrl.pathname.lastIndexOf('/') + 1);
  windowRef.location.replace(`${pageName}${targetUrl.search}${targetUrl.hash}`);
}

function showRedirectNotice(windowRef, documentRef) {
  try {
    const currentUrl = new URL(windowRef.location.href);
    if (currentUrl.searchParams.get('access') !== 'denied') return;

    const feedback = documentRef.getElementById('access-feedback');
    if (feedback) {
      feedback.textContent = 'Acesso não permitido. Você foi redirecionado para sua área.';
      feedback.hidden = false;
    }
    currentUrl.searchParams.delete('access');
    windowRef.history?.replaceState?.(null, '', currentUrl.href);
  } catch {
    // A navegação continua protegida mesmo se não for possível exibir o aviso opcional.
  }
}

export async function protectPage(
  pageName,
  onAuthorized = async () => {},
  dependencies = {},
) {
  const documentRef = dependencies.documentRef || globalThis.document;
  const windowRef = dependencies.windowRef || globalThis.window;
  const apiClient = dependencies.apiClient || api;
  if (!isProtectedPage(pageName)) {
    await onAuthorized();
    return true;
  }

  const body = documentRef.body;
  const retryButton = documentRef.getElementById('access-retry');
  let requestInFlight = false;
  let sessionExpired = false;

  const expireSession = () => {
    if (sessionExpired) return;
    sessionExpired = true;
    body.dataset.accessState = 'expired';
    setGateMessage(documentRef, 'Sua sessão expirou. Redirecionando para o login...');
    if (retryButton) retryButton.hidden = true;
    windowRef.location.replace('login.html');
  };

  if (!body.dataset.sessionHandlersInstalled && typeof windowRef.addEventListener === 'function') {
    windowRef.addEventListener('parkschool:session-expired', expireSession);
    windowRef.addEventListener('parkschool:access-forbidden', (event) => {
      const feedback = documentRef.getElementById('access-feedback');
      if (!feedback) return;
      const detail = event.detail?.message;
      feedback.textContent = detail
        ? `Acesso não permitido. ${detail}`
        : 'Acesso não permitido. Você não tem permissão para realizar esta operação.';
      feedback.hidden = false;
    });
    body.dataset.sessionHandlersInstalled = 'true';
  }

  const verifySession = async () => {
    if (requestInFlight) return false;
    requestInFlight = true;
    body.dataset.accessState = 'checking';
    setGateMessage(documentRef, 'Verificando acesso...');
    if (retryButton) {
      retryButton.hidden = true;
      retryButton.disabled = true;
    }

    let sessionData;
    try {
      sessionData = await apiClient('/me');
    } catch (error) {
      if (error.status === 401) {
        expireSession();
      } else {
        body.dataset.accessState = 'network-error';
        setGateMessage(documentRef, 'Não foi possível verificar seu acesso. Confira a conexão e tente novamente.');
        if (retryButton) {
          retryButton.hidden = false;
          retryButton.disabled = false;
        }
      }
      requestInFlight = false;
      return false;
    }
    requestInFlight = false;

    const profile = profileFromSession(sessionData);
    const home = pageForProfile(profile);
    if (!home) {
      body.dataset.accessState = 'denied';
      setGateMessage(documentRef, 'Não foi possível identificar seu perfil. Redirecionando para o login...');
      windowRef.location.replace('login.html');
      return false;
    }

    if (pageName === 'cadastroVeiculo') {
      body.dataset.accessState = 'redirecting';
      setGateMessage(documentRef, 'Esta página foi substituída. Redirecionando para sua área...');
      windowRef.location.replace(home);
      return false;
    }

    if (!canOpenPage(pageName, profile)) {
      body.dataset.accessState = 'redirecting';
      setGateMessage(documentRef, 'Acesso não permitido. Redirecionando para sua área...');
      redirectWithDeniedNotice(windowRef, home);
      return false;
    }

    body.dataset.accessState = 'ready';
    showRedirectNotice(windowRef, documentRef);
    await onAuthorized();
    return true;
  };

  if (retryButton && !body.dataset.accessRetryBound) {
    retryButton.addEventListener('click', verifySession);
    body.dataset.accessRetryBound = 'true';
  }

  return verifySession();
}
