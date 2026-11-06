//Arquivo:Front_Park/js/pages/vigilante/vacancies.js
import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';
import { state } from './state.js';

// Posição de cada vaga no desenho, definida pelo NÚMERO da vaga.
// Assim, excluir ou cadastrar vagas não desloca o resto do mapa.
const FAIXAS = {
  topo:     { de: 1,  ate: 23 },
  base:     { de: 40, ate: 57 },
  motoTopo: { de: 24, ate: 27 },
  motoBase: { de: 28, ate: 39 },
};

const dentro = (n, faixa) =>
  Number.isInteger(n) && n >= faixa.de && n <= faixa.ate;

// Coluna/linha (1-based) de cada vaga dentro da sua grade.
const posTopo = (n) =>
  `grid-column:${FAIXAS.topo.ate - n + 1};grid-row:1`;

const posBase = (n) =>
  `grid-column:${n - FAIXAS.base.de + 2};grid-row:1`;

const posMotoTopo = (n) => {
  const i = n - FAIXAS.motoTopo.de;
  return `grid-column:${(i % 2) + 1};grid-row:${Math.floor(i / 2) + 1}`;
};

const posMotoBase = (n) => {
  const i = n - FAIXAS.motoBase.de;
  return `grid-column:${Math.floor(i / 4) + 1};grid-row:${(i % 4) + 1}`;
};

export const TIPOS = {
  comum: {
    rotulo: 'Comum',
    curto: 'Comum',
    icone: 'fa-car',
  },
  senac: {
    rotulo: 'SENAC',
    curto: 'SENAC',
    icone: 'fa-building',
  },
  pcd: {
    rotulo: 'PCD',
    curto: 'PCD',
    icone: 'fa-wheelchair',
  },
  carga: {
    rotulo: 'Carga e descarga',
    curto: 'Carga',
    icone: 'fa-truck',
  },
  moto: {
    rotulo: 'Motocicleta',
    curto: 'Moto',
    icone: 'fa-motorcycle',
  },
  visitante: {
    rotulo: 'Visitante',
    curto: 'Visit.',
    icone: 'fa-user',
  },
};

const ESTADOS = {
  DISPONIVEL: {
    rotulo: 'Disponível',
    css: 'available',
    icone: 'fa-check',
  },
  RESERVADA: {
    rotulo: 'Reservada',
    css: 'reserved',
    icone: 'fa-calendar-check',
  },
  OCUPADA: {
    rotulo: 'Ocupada',
    css: 'occupied',
    icone: 'fa-car',
  },
  INDISPONIVEL: {
    rotulo: 'Indisponível',
    css: 'unavailable',
    icone: 'fa-ban',
  },
};

const SEM_INFO = {
  rotulo: 'Sem informação',
  css: 'unknown',
  icone: 'fa-question',
};

const $ = (id) => document.getElementById(id);

const pad = (n) => String(n ?? '?').padStart(2, '0');

export const tipoChave = (t) => {
  const k = String(t ?? '').toLowerCase();
  return k === 'carro' ? 'comum' : k;
};

const tipoInfo = (t) =>
  TIPOS[tipoChave(t)] ?? {
    rotulo: t || 'Sem categoria',
    curto: t || '—',
    icone: 'fa-car',
  };

// Carrega as vagas da API.
export async function loadVagas() {
  try {
    const rows = await api('/vagas');

    state.vagas = rows
      .slice()
      .sort((a, b) => (a.numeroVaga ?? 0) - (b.numeroVaga ?? 0));

    state.erroVagas = null;
  } catch (error) {
    // Nunca inventa vagas livres quando a API falha.
    state.vagas = [];
    state.erroVagas =
      error.message || 'Não foi possível carregar as vagas.';
  }
}

// Atualiza os indicadores do painel.
export function updateMetrics() {
  const set = (id, value) => {
    const el = $(id);
    if (el) el.textContent = String(value);
  };

  const ok = !state.carregando && !state.erroVagas;

  const count = (estado) =>
    state.vagas.filter((v) => v.estadoAtual === estado).length;

  set('totalVagas', ok ? state.vagas.length : '—');
  set('vagasDisponiveis', ok ? count('DISPONIVEL') : '—');
  set('vagasOcupadas', ok ? count('OCUPADA') : '—');
  set('vagasReservadas', ok ? count('RESERVADA') : '—');
  set('vagasIndisponiveis', ok ? count('INDISPONIVEL') : '—');

  const okRes = !state.carregando && !state.erroReservas;

  set(
    'visitasPendentes',
    okRes
      ? state.reservas.filter((r) => r.status === 'PENDENTE').length
      : '—'
  );

  set('badgeNotificacoes', okRes ? state.reservas.length : '—');
}

// Card da vaga: categoria + ícone, número, situação e placa.
// Motos usam uma versão compacta.
// Todas as vagas possuem atributos de interação.
function slotHtml(vaga, { compact = false, estilo = '' } = {}) {
  const estado = ESTADOS[vaga.estadoAtual] ?? SEM_INFO;
  const chave = tipoChave(vaga.tipoVaga);
  const tipo = tipoInfo(vaga.tipoVaga);

  const busca = $('buscaVaga')?.value.trim() ?? '';
  const filtro = $('filtroTipo')?.value ?? 'todos';

  const combina =
    (!busca || String(vaga.numeroVaga).includes(busca))
    && (filtro === 'todos' || chave === filtro)
    && (!state.filtroEstado || vaga.estadoAtual === state.filtroEstado);

  const titulo =
    `Vaga ${pad(vaga.numeroVaga)} · ${tipo.rotulo} · ${estado.rotulo}` +
    `${vaga.placaAtual ? ` · ${vaga.placaAtual}` : ''}`;

  const base =
    `vaga-card ${estado.css} tipo-${escapeHtml(chave)} ${combina ? '' : 'is-dim'}`;

  const style = estilo ? ` style="${estilo}"` : '';

  // Atributos de interação para todas as vagas.
  const acao =
    `data-id-vaga="${Number(vaga.idVaga)}" ` +
    `tabindex="0" ` +
    `role="button" ` +
    `aria-pressed="${vaga.estadoAtual === 'INDISPONIVEL'}"`;

  // Versão compacta para motocicletas.
  if (compact) {
    return `<div class="${base} vaga-chip"${style} ${acao}
      title="${escapeHtml(titulo)}"
      aria-label="${escapeHtml(titulo)}">
      <span>${pad(vaga.numeroVaga)}</span>
    </div>`;
  }

  // Versão normal para automóveis e demais vagas.
  return `<div class="${base}"${style} ${acao}
    title="${escapeHtml(titulo)}"
    aria-label="${escapeHtml(titulo)}">

    <span class="vaga-card-top">
      <span class="vaga-type">${escapeHtml(tipo.curto)}</span>
      <i class="fa-solid ${tipo.icone}" aria-hidden="true"></i>
    </span>

    <strong>${pad(vaga.numeroVaga)}</strong>

    <span class="vaga-status">
      <i class="fa-solid ${estado.icone}" aria-hidden="true"></i>
      ${estado.rotulo}
    </span>

    ${vaga.placaAtual
      ? `<small>${escapeHtml(vaga.placaAtual)}</small>`
      : ''}

  </div>`;
}

// Renderiza o mapa de vagas.
export function renderVacancies() {
  const container = $('containerVagas');

  if (!container) return;

  if (state.carregando) {
    container.innerHTML =
      '<p class="empty-state">Carregando vagas...</p>';
    return;
  }

  if (state.erroVagas) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>${escapeHtml(state.erroVagas)}</p>
      </div>`;
    return;
  }

  if (!state.vagas.length) {
    container.innerHTML =
      '<p class="empty-state">Nenhuma vaga cadastrada.</p>';
    return;
  }

  // Separa cada vaga na área do desenho pelo número.
  const g = {
    topo: [],
    base: [],
    motoTopo: [],
    motoBase: [],
    extras: [],
  };

  for (const v of state.vagas) {
    const n = v.numeroVaga;
    const moto = tipoChave(v.tipoVaga) === 'moto';

    if (!moto && dentro(n, FAIXAS.topo)) {
      g.topo.push(v);
    } else if (!moto && dentro(n, FAIXAS.base)) {
      g.base.push(v);
    } else if (moto && dentro(n, FAIXAS.motoTopo)) {
      g.motoTopo.push(v);
    } else if (moto && dentro(n, FAIXAS.motoBase)) {
      g.motoBase.push(v);
    } else {
      g.extras.push(v);
    }
  }

  container.innerHTML = `
    <div class="lot">

      <div class="lot-row">

        <div class="lot-motos lot-motos-top">
          ${g.motoTopo
            .map((v) =>
              slotHtml(v, {
                compact: true,
                estilo: posMotoTopo(v.numeroVaga),
              })
            )
            .join('')}
        </div>

        <div class="lot-slots lot-slots-top">
          ${g.topo
            .map((v) =>
              slotHtml(v, {
                estilo: posTopo(v.numeroVaga),
              })
            )
            .join('')}
        </div>

      </div>

      <div class="lot-lane" aria-hidden="true"></div>

      <div class="lot-row">

        <div class="lot-motos lot-motos-base">
          ${g.motoBase
            .map((v) =>
              slotHtml(v, {
                compact: true,
                estilo: posMotoBase(v.numeroVaga),
              })
            )
            .join('')}
        </div>

        <div class="lot-slots lot-slots-base">
          ${g.base
            .map((v) =>
              slotHtml(v, {
                estilo: posBase(v.numeroVaga),
              })
            )
            .join('')}
        </div>

      </div>

      ${g.extras.length
        ? `
          <div class="lot-extra">
            <h3 class="lot-extra-title">Outras vagas</h3>

            <div class="lot-extra-grid">
              ${g.extras
                .map((v) => slotHtml(v))
                .join('')}
            </div>
          </div>
        `
        : ''}

    </div>`;
}
