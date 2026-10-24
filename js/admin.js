const CATEGORIAS = {
  administracao: { label: "Administração", cor: "var(--color-primary)", icone: "bi-diagram-3" },
  pcd:           { label: "PCD",             cor: "var(--color-secondary)", icone: "bi-universal-access" },
  carga:         { label: "Carga e descarga", cor: "var(--color-warning)", icone: "bi-truck" },
  comum:         { label: "Vagas comuns",    cor: "var(--color-tertiary)", icone: "bi-car-front" }
};

function gerarVagasIniciais(){
  const lista = [];

  for (let i = 1; i <= 3; i++) {
    lista.push({ id: `adm-${i}`, categoria: 'administracao', numero: i, status: 'livre' });
  }

  for (let i = 1; i <= 3; i++) {
    lista.push({ id: `pcd-${i}`, categoria: 'pcd', numero: i, status: 'livre' });
  }

  lista.push({ id: 'cd-1', categoria: 'carga', numero: 1, status: 'livre' });

  const totalComuns = 42 - 3 - 3 - 1;
  for (let i = 1; i <= totalComuns; i++) {
    lista.push({ id: `com-${i}`, categoria: 'comum', numero: i, status: 'livre' });
  }

  return lista;
}

let vagas = gerarVagasIniciais();

let funcionarios = JSON.parse(localStorage.getItem("park_funcionarios") || "[]");

let filtroStatusAtual = "todos";

// veículos já cadastrados (exemplo inicial)
let veiculosCadastrados = JSON.parse(localStorage.getItem("park_veiculos") || "[]");
let proximoIdVeiculo = Math.max(1, ...veiculosCadastrados.map(v => Number(v.id) || 0), 3);
let contadorFormsVeiculo = 0; // ids dos formulários abertos

// ============ navegação ============

function mudarTela(nome){
  document.querySelectorAll("[data-tela]").forEach(el => el.classList.remove("ativa"));
  document.querySelector(`[data-tela="${nome}"]`).classList.add("ativa");
  document.querySelectorAll("#sidebar .nav-link").forEach(el => {
    el.classList.remove("active");
    el.removeAttribute("aria-current");
  });
  const botaoAtivo = document.querySelector(`[data-nav="${nome}"]`);
  botaoAtivo.classList.add("active");
  botaoAtivo.setAttribute("aria-current", "page");
}

function sair(){
  document.getElementById("app").style.display = "none";
  document.getElementById("tela-saida").classList.remove("d-none");
  document.getElementById("tela-saida").classList.add("d-flex");
}

function entrarNovamente(){
  document.getElementById("tela-saida").classList.remove("d-flex");
  document.getElementById("tela-saida").classList.add("d-none");
  document.getElementById("app").style.display = "flex";
}

// ============ vagas (somente visualização) ============

function renderizarVagas(){
  const livres = vagas.filter(v => v.status === "livre").length;
  document.getElementById("stat-total").textContent = vagas.length;
  document.getElementById("stat-livres").textContent = livres;

  const grupos = ["administracao", "pcd", "carga", "comum"];
  const container = document.getElementById("grupos-vagas");

  if (!container) return;

  container.innerHTML = grupos.map(chave => {
    const info = CATEGORIAS[chave];
    const doGrupo = vagas.filter(v => v.categoria === chave);
    const cartoes = doGrupo.map(v => {
      const livre = v.status === 'livre';
      return `
        <div class="vaga-card ${livre ? 'livre' : 'ocupada'} bg-surface shadow-sm"
             style="${livre ? `border-color:${info.cor}; color:${info.cor};` : ''}"
             title="${livre ? 'Vaga livre' : 'Vaga ocupada'}">
          <i class="bi ${info.icone} icone-vaga" style="${livre ? '' : 'color: var(--color-white);'}"></i>
          <span class="fw-bold">${v.numero}</span>
          <span class="status text-uppercase" style="font-size: 0.65rem;">${livre ? 'livre' : 'ocupada'}</span>
        </div>`;
    }).join('');

    return `
      <section class="vagas-grupo">
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="bi ${info.icone} fs-5" style="color:${info.cor};"></i>
          <h2 class="font-display mb-0 fw-semibold" style="font-size:1.05rem; color: var(--text-primary);">${info.label}</h2>
          <span class="badge text-bg-light border text-secondary ms-2">${doGrupo.length} ${doGrupo.length === 1 ? 'vaga' : 'vagas'}</span>
        </div>
        <div class="vagas-grid">${cartoes}</div>
      </section>`;
  }).join('');
}

// ============ funcionários ============

function definirFiltro(status){
  filtroStatusAtual = status;
  document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`[data-filtro="${status}"]`).classList.add("active");
  renderizarFuncionarios();
}

function alternarFuncionario(id){
  const f = funcionarios.find(x => x.id === id);
  f.status = f.status === "ativo" ? "inativo" : "ativo";
  renderizarFuncionarios();
}

function renderizarFuncionarios(){
  const busca = document.getElementById("busca-input").value.toLowerCase();

  const ativos = funcionarios.filter(f => f.status === "ativo").length;
  document.getElementById("cont-todos").textContent = funcionarios.length;
  document.getElementById("cont-ativos").textContent = ativos;
  document.getElementById("cont-inativos").textContent = funcionarios.length - ativos;

  const filtrados = funcionarios.filter(f => {
    const bateBusca = f.nome.toLowerCase().includes(busca);
    const bateStatus = filtroStatusAtual === "todos" ? true : f.status === filtroStatusAtual;
    return bateBusca && bateStatus;
  });

  const lista = document.getElementById("lista-funcionarios");

  if (filtrados.length === 0){
    lista.innerHTML = `<p class="text-center py-4 mb-0" style="color:var(--text-secondary); font-size:.875rem;">Nenhum funcionário encontrado para essa busca.</p>`;
    return;
  }

  lista.innerHTML = filtrados.map(f => `
    <div class="func-item d-flex align-items-center justify-content-between p-3 mb-2 bg-surface shadow-sm rounded" style="border: 1px solid var(--border-color);">
      <div>
        <p class="mb-1 fw-medium" style="font-size:.9rem; color:var(--text-primary);">
          ${f.nome} 
          ${f.pcd === 'sim' ? '<span class="badge text-bg-info ms-1" style="font-size:0.65rem;">PCD</span>' : ''}
        </p>
        <p class="mb-0" style="font-size:.75rem; color:var(--text-secondary);"><i class="bi bi-envelope me-1"></i>${f.email} &nbsp;·&nbsp; <i class="bi bi-telephone me-1"></i>${f.telefone}</p>
      </div>
      <div class="d-flex align-items-center gap-3">
        <span class="badge ${f.status === 'ativo' ? 'text-bg-success' : 'text-bg-danger'} px-2 py-1">
          ${f.status === 'ativo' ? 'Ativo' : 'Inativo'}
        </span>
        <button class="btn ds-btn-outline btn-sm d-inline-flex align-items-center gap-1" onclick="alternarFuncionario(${f.id})">
          <i class="bi ${f.status === 'ativo' ? 'bi-person-dash' : 'bi-person-check'}"></i>
          ${f.status === 'ativo' ? 'Desativar' : 'Ativar'}
        </button>
      </div>
    </div>
  `).join("");
}

function cadastrarFuncionarioAdmin(event){
  event.preventDefault();
  
  const nome = document.getElementById("novo-func-nome").value.trim();
  const telefone = document.getElementById("novo-func-telefone").value.trim();
  const email = document.getElementById("novo-func-email").value.trim();
  const id = Number(document.getElementById("novo-func-id").value.trim());
  const pcd = document.querySelector('input[name="novo-func-pcd"]:checked').value;

  if (funcionarios.some(f => f.id === id)){
    alert("Já existe um funcionário cadastrado com este ID.");
    return;
  }

  funcionarios.push({
    id,
    nome,
    cargo: "Funcionário",
    telefone,
    email,
    pcd,
    status: "ativo"
  });

  persistFuncionarios();

  // Limpa o formulário
  event.target.reset();
  
  // Atualiza as telas dependentes
  renderizarFuncionarios();
  preencherSelectFuncionarios();
  
  // Retorna para a tela de listagem de funcionários
  mudarTela('funcionarios');
}

// ============ veículos ============

function preencherSelectFuncionarios(){
  const select = document.getElementById("select-funcionario");
  if (!select) return;
  select.innerHTML = funcionarios.map(f => `<option value="${f.id}">${f.nome} (ID: ${f.id})</option>`).join("");
}

function criarFormVeiculoHTML(idForm, numero){
  return `
    <div class="card-form bg-surface p-4 shadow-sm rounded mb-4 position-relative" style="border: 1px solid var(--border-color);" data-form-veiculo="${idForm}">
      ${numero > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3" title="Remover este veículo" onclick="removerFormVeiculo(${idForm})"><i class="bi bi-trash3"></i></button>` : ""}
      
      <p class="veiculo-numero fw-bold mb-3" style="color: var(--color-primary);">Veículo ${numero}</p>

      <div class="row g-3">
        <div class="col-md-7">
          <label class="form-label">Modelo</label>
          <input type="text" class="form-control campo-modelo" placeholder="Ex.: Onix, Fazer 250">
        </div>
        <div class="col-md-5">
          <label class="form-label d-block">Tipo</label>
          <div class="form-check form-check-inline mt-2">
            <input class="form-check-input campo-tipo" type="radio" name="tipo-${idForm}" id="tipo-carro-${idForm}" value="carro" checked>
            <label class="form-check-label text-dark" for="tipo-carro-${idForm}">Carro</label>
          </div>
          <div class="form-check form-check-inline mt-2">
            <input class="form-check-input campo-tipo" type="radio" name="tipo-${idForm}" id="tipo-moto-${idForm}" value="moto">
            <label class="form-check-label text-dark" for="tipo-moto-${idForm}">Moto</label>
          </div>
        </div>
        <div class="col-md-6">
          <label class="form-label">Placa</label>
          <input type="text" class="form-control campo-placa" placeholder="ABC1D23" style="text-transform:uppercase;" maxlength="8">
        </div>
        <div class="col-md-6">
          <label class="form-label">Cor do veículo</label>
          <input type="text" class="form-control campo-cor" placeholder="Ex.: Prata">
        </div>
      </div>
    </div>`;
}

function adicionarFormVeiculo(){
  contadorFormsVeiculo++;
  const container = document.getElementById("lista-forms-veiculo");
  const numero = container.children.length + 1;
  container.insertAdjacentHTML("beforeend", criarFormVeiculoHTML(contadorFormsVeiculo, numero));
}

function removerFormVeiculo(idForm){
  const el = document.querySelector(`[data-form-veiculo="${idForm}"]`);
  if (el) el.remove();
  renumerarFormsVeiculo();
}

function renumerarFormsVeiculo(){
  const forms = document.querySelectorAll("[data-form-veiculo]");
  forms.forEach((form, i) => {
    form.querySelector(".veiculo-numero").textContent = `Veículo ${i + 1}`;
  });
}

function salvarVeiculos(){
  const selectFunc = document.getElementById("select-funcionario");
  if (!selectFunc || selectFunc.value === "") {
    alert("Selecione um funcionário válido.");
    return;
  }

  const funcionarioId = Number(selectFunc.value);
  const forms = document.querySelectorAll("[data-form-veiculo]");
  const novos = [];

  for (const form of forms){
    const modelo = form.querySelector(".campo-modelo").value.trim();
    const placa = form.querySelector(".campo-placa").value.trim().toUpperCase();
    const cor = form.querySelector(".campo-cor").value.trim();
    const tipo = form.querySelector(".campo-tipo:checked").value;

    if (!modelo || !placa || !cor){
      // Utiliza a cor de warning/danger baseada no CSS variables
      form.style.outline = "1.5px solid var(--color-danger)";
      form.style.outlineOffset = "2px";
      continue;
    }
    form.style.outline = "none";
    novos.push({ id: proximoIdVeiculo++, funcionarioId, modelo, tipo, placa, cor });
  }

  if (novos.length === 0) return;

  veiculosCadastrados = veiculosCadastrados.concat(novos);
  persistVeiculos();
  renderizarVeiculosCadastrados();

  // reseta o formulário para um único bloco em branco
  contadorFormsVeiculo = 0;
  document.getElementById("lista-forms-veiculo").innerHTML = "";
  adicionarFormVeiculo();
}

function renderizarVeiculosCadastrados(){
  const container = document.getElementById("lista-veiculos-cadastrados");
  if (!container) return;

  if (veiculosCadastrados.length === 0){
    container.innerHTML = `<p style="color:var(--text-secondary); font-size:.875rem;">Nenhum veículo cadastrado ainda.</p>`;
    return;
  }

  container.innerHTML = veiculosCadastrados.map(v => {
    const dono = funcionarios.find(f => f.id === v.funcionarioId);
    const icone = v.tipo === "moto" ? "bi-bicycle" : "bi-car-front-fill";
    return `
      <div class="veiculo-registrado d-flex justify-content-between align-items-center p-3 mb-3 bg-surface shadow-sm rounded" style="border: 1px solid var(--border-color);">
        <div class="d-flex align-items-center gap-3">
          <div class="icon-circle icon-circle-md icon-circle-primary">
            <i class="bi ${icone}"></i>
          </div>
          <div>
            <p class="mb-0 fw-medium" style="font-size:.9rem; color:var(--text-primary);">${v.modelo} <span class="badge text-bg-light border text-secondary ms-1 text-capitalize fw-normal">${v.tipo}</span></p>
            <p class="mb-0 mt-1" style="font-size:.75rem; color:var(--text-secondary);"><i class="bi bi-person me-1"></i>${dono ? dono.nome : "Funcionário não encontrado"}</p>
          </div>
        </div>
        <div class="text-end">
          <p class="mb-0 fw-bold" style="font-size:.95rem; font-family: var(--font-family-base); color:var(--text-primary);">${v.placa}</p>
          <p class="mb-0 d-flex align-items-center justify-content-end gap-1 mt-1" style="font-size:.75rem; color:var(--text-secondary);">
            <span class="rounded-circle shadow-sm" style="width:12px; height:12px; background:${v.cor}; border: 1px solid var(--border-color);"></span>
            <span class="text-capitalize">${v.cor}</span>
          </p>
        </div>
      </div>`;
  }).join("");
}

const STORAGE_KEYS = {
  funcionarios: 'park_funcionarios',
  solicitacoes: 'park_solicitacoes',
  veiculos: 'park_veiculos',
  visitas: 'park_visitas'
};

const safeRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

function persistFuncionarios() {
  safeWrite(STORAGE_KEYS.funcionarios, funcionarios);
}

function persistVeiculos() {
  safeWrite(STORAGE_KEYS.veiculos, veiculosCadastrados);
}

function normalizarCargo(perfil) {
  if (perfil === 'operador') return 'Patrimônio';
  if (perfil === 'supervisor') return 'Vigilante';
  return 'Funcionário';
}

function renderizarSolicitacoes() {
  const lista = document.getElementById('lista-solicitacoes');
  if (!lista) return;

  const solicitacoes = safeRead(STORAGE_KEYS.solicitacoes, []);
  if (solicitacoes.length === 0) {
    lista.innerHTML = '<p class="text-center py-4 mb-0" style="color:var(--text-secondary); font-size:.875rem;">Nenhuma solicitação pendente.</p>';
    return;
  }

  lista.innerHTML = solicitacoes.map(item => `
    <div class="solicitacao-item d-flex justify-content-between align-items-center gap-3 py-3" style="border-top:1px solid var(--border-color);">
      <div>
        <p class="mb-1 fw-medium" style="font-size:.9rem; color:var(--text-primary);">${item.nome}</p>
        <p class="mb-1" style="font-size:.75rem; color:var(--text-secondary);">${item.email}</p>
        <span class="badge text-bg-light border text-secondary">${normalizarCargo(item.perfil)}</span>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-success" data-acao="aprovar" data-id="${item.id}">Aprovar</button>
        <button class="btn btn-sm btn-outline-danger" data-acao="rejeitar" data-id="${item.id}">Recusar</button>
      </div>
    </div>
  `).join('');

  lista.querySelectorAll('[data-acao]').forEach(botao => {
    botao.addEventListener('click', () => {
      const id = botao.dataset.id;
      const acao = botao.dataset.acao;
      if (acao === 'aprovar') aprovarSolicitacao(id);
      else rejeitarSolicitacao(id);
    });
  });
}

function aprovarSolicitacao(id) {
  const solicitacoes = safeRead(STORAGE_KEYS.solicitacoes, []);
  const item = solicitacoes.find(s => String(s.id) === String(id));
  if (!item) return;

  const existente = funcionarios.find(f => (f.email || '').toLowerCase() === (item.email || '').toLowerCase());
  const novoFuncionario = {
    id: existente ? existente.id : Date.now(),
    nome: item.nome,
    cargo: normalizarCargo(item.perfil),
    telefone: item.telefone || '(11) 00000-0000',
    email: item.email,
    pcd: 'nao',
    status: 'ativo'
  };

  if (!existente) funcionarios.push(novoFuncionario);
  else Object.assign(existente, novoFuncionario);

  persistFuncionarios();
  safeWrite(STORAGE_KEYS.solicitacoes, solicitacoes.filter(s => String(s.id) !== String(id)));
  renderizarFuncionarios();
  preencherSelectFuncionarios();
  renderizarSolicitacoes();
  alert(`${item.nome} foi aprovado no sistema.`);
}

function rejeitarSolicitacao(id) {
  const solicitacoes = safeRead(STORAGE_KEYS.solicitacoes, []);
  safeWrite(STORAGE_KEYS.solicitacoes, solicitacoes.filter(s => String(s.id) !== String(id)));
  renderizarSolicitacoes();
}

function preencherSelectVagasAdmin() {
  const select = document.getElementById('visita-vaga');
  if (!select) return;
  select.innerHTML = vagas.map(v => `<option value="${v.numero}">Vaga ${v.numero}</option>`).join('');
}

function renderizarVisitasAdmin() {
  const lista = document.getElementById('lista-visitas-admin');
  if (!lista) return;

  const visitas = safeRead(STORAGE_KEYS.visitas, []);
  if (visitas.length === 0) {
    lista.innerHTML = '<p class="text-center py-4 mb-0" style="color:var(--text-secondary); font-size:.875rem;">Nenhuma visita cadastrada.</p>';
    return;
  }

  lista.innerHTML = visitas.map(visita => `
    <div class="visita-item d-flex justify-content-between align-items-center gap-3 py-3" style="border-top:1px solid var(--border-color);">
      <div>
        <p class="mb-1 fw-medium" style="font-size:.9rem; color:var(--text-primary);">${visita.nome}</p>
        <p class="mb-1" style="font-size:.75rem; color:var(--text-secondary);">${visita.motivo} · Vaga ${visita.vaga} · ${visita.placa}</p>
        <span class="badge text-bg-light border text-secondary">${visita.entrada} - ${visita.saida}</span>
      </div>
      <span class="badge ${visita.status === 'confirmed' ? 'text-bg-success' : 'text-bg-warning'}">${visita.status === 'confirmed' ? 'Confirmada' : 'Pendente'}</span>
    </div>
  `).join('');
}

function cadastrarVisitaAdmin(event) {
  event.preventDefault();

  const nome = document.getElementById('visita-nome').value.trim();
  const motivo = document.getElementById('visita-motivo').value.trim();
  const vaga = document.getElementById('visita-vaga').value;
  const placa = document.getElementById('visita-placa').value.trim().toUpperCase();
  const entrada = document.getElementById('visita-entrada').value;
  const saida = document.getElementById('visita-saida').value;

  if (!nome || !motivo || !vaga || !placa || !entrada || !saida) {
    alert('Preencha todos os dados da visita.');
    return;
  }

  if (entrada >= saida) {
    alert('O horário de saída deve ser maior que o horário de entrada.');
    return;
  }

  const visitas = safeRead(STORAGE_KEYS.visitas, []);
  visitas.push({
    id: Date.now(),
    nome,
    motivo,
    vaga: Number(vaga),
    placa,
    entrada,
    saida,
    status: 'pending',
    data: new Date().toISOString().slice(0, 10)
  });

  safeWrite(STORAGE_KEYS.visitas, visitas);
  renderizarVisitasAdmin();
  event.target.reset();
  alert('Visita cadastrada com sucesso.');
}

function inicializarAdmin() {
  renderizarVagas();
  renderizarFuncionarios();
  preencherSelectFuncionarios();
  preencherSelectVagasAdmin();
  renderizarVeiculosCadastrados();
  renderizarSolicitacoes();
  renderizarVisitasAdmin();

  const listaVeiculos = document.getElementById('lista-forms-veiculo');
  if (listaVeiculos && listaVeiculos.children.length === 0) {
    adicionarFormVeiculo();
  }

  const formNovaVisita = document.getElementById('formNovaVisitaAdmin');
  if (formNovaVisita) formNovaVisita.addEventListener('submit', cadastrarVisitaAdmin);
}

window.mudarTela = mudarTela;
window.sair = sair;
window.entrarNovamente = entrarNovamente;
window.definirFiltro = definirFiltro;
window.alternarFuncionario = alternarFuncionario;
window.cadastrarFuncionarioAdmin = cadastrarFuncionarioAdmin;
window.adicionarFormVeiculo = adicionarFormVeiculo;
window.removerFormVeiculo = removerFormVeiculo;
window.salvarVeiculos = salvarVeiculos;
window.inicializarAdmin = inicializarAdmin;

inicializarAdmin();
