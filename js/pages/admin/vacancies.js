import { api } from '../../services/auth.js';
import { escapeHtml } from '../../shared/utils.js';
 
const SUGESTOES = ['carro', 'pcd', 'moto', 'carga', 'visitante'];
const ROTULOS = { pcd: 'PCD' };
const rotulo = (tipo) => ROTULOS[tipo] ?? (tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : 'Sem categoria');
 
let vacancies = [];
 
// Mantém o contrato usado por outros módulos: { number, tipo, idVaga }.
export const getAdminVacancies = () =>
  vacancies.map((v) => ({ number: v.numeroVaga, tipo: v.tipoVaga, idVaga: v.idVaga }));
 
export function initAdminVacancies() {
  const $ = (id) => document.getElementById(id);
  const groups = $('grupos-vagas');
  const form = $('form-vaga');
  if (!groups || !form) return;
 
  const total = $('stat-total');
  const feedback = $('vagas-feedback');
  const numberInput = $('vaga-numero');
  const typeInput = $('vaga-tipo');
  const datalist = $('vaga-tipos');
  const formTitle = $('titulo-form-vaga');
  let editingId = null;
 
  const say = (text = '', isError = false) => {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.toggle('text-danger', isError);
  };
 
  const closeForm = () => { form.classList.add('d-none'); form.reset(); editingId = null; };
  const openForm = (vaga = null) => {
    editingId = vaga?.idVaga ?? null;
    formTitle.textContent = vaga ? `Editar vaga ${vaga.numeroVaga}` : 'Nova vaga';
    numberInput.value = vaga?.numeroVaga ?? '';
    typeInput.value = vaga?.tipoVaga ?? '';
    form.classList.remove('d-none');
    numberInput.focus();
  };
 
  const render = () => {
    if (total) total.textContent = String(vacancies.length);
    const tipos = [...new Set([...SUGESTOES, ...vacancies.map((v) => v.tipoVaga).filter(Boolean)])];
    if (datalist) datalist.innerHTML = tipos.map((t) => `<option value="${escapeHtml(t)}"></option>`).join('');
 
    if (!vacancies.length) {
      groups.innerHTML = '<p class="text-center py-4 mb-0 empty-state">Nenhuma vaga cadastrada. Use “Nova vaga”.</p>';
      return;
    }
    const porTipo = new Map();
    for (const vaga of vacancies) {
      const chave = vaga.tipoVaga || '';
      if (!porTipo.has(chave)) porTipo.set(chave, []);
      porTipo.get(chave).push(vaga);
    }
    groups.innerHTML = [...porTipo.entries()].map(([tipo, lista]) => `
      <div class="mb-4">
        <h3 class="h6 mb-2">${escapeHtml(rotulo(tipo))} <span class="badge text-bg-light border text-secondary">${lista.length}</span></h3>
        <div class="d-flex flex-wrap gap-2">
          ${lista.map((v) => `<div class="d-inline-flex align-items-center gap-2 border rounded px-3 py-2">
            <strong>Vaga ${escapeHtml(v.numeroVaga)}</strong>
            <button type="button" class="btn btn-sm ds-btn-outline" data-action="editar-vaga" data-id="${v.idVaga}">Editar</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="excluir-vaga" data-id="${v.idVaga}">Excluir</button>
          </div>`).join('')}
        </div>
      </div>`).join('');
  };
 
  const load = async () => {
    vacancies = (await api('/vagas')).slice().sort((a, b) => a.numeroVaga - b.numeroVaga);
    render();
  };
 
  $('btn-nova-vaga')?.addEventListener('click', () => { say(); openForm(); });
  $('btn-cancelar-vaga')?.addEventListener('click', () => { closeForm(); say(); });
 
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    say();
    const numeroVaga = Number(numberInput.value);
    const tipoVaga = typeInput.value.trim().toLowerCase();
    if (!Number.isInteger(numeroVaga) || numeroVaga < 1 || numeroVaga > 2147483647) return say('Informe o número da vaga como inteiro positivo.', true);
    if (!tipoVaga || tipoVaga.length > 20) return say('Informe a categoria da vaga (até 20 caracteres).', true);
 
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const body = JSON.stringify({ numeroVaga, tipoVaga });
      await api(editingId ? `/vagas/${editingId}` : '/vagas', { method: editingId ? 'PUT' : 'POST', body });
      closeForm();
      await load();
      say(`Vaga ${numeroVaga} salva com sucesso.`);
    } catch (error) {
      say(error.message, true); // 409 (número repetido) e 400 (dado inválido) vêm da API
    } finally {
      submit.disabled = false;
    }
  });
 
  groups.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const vaga = vacancies.find((v) => String(v.idVaga) === button.dataset.id);
    if (!vaga) return;
 
    if (button.dataset.action === 'editar-vaga') {
      say();
      openForm(vaga);
      return;
    }
    if (!window.confirm(`Excluir a vaga ${vaga.numeroVaga}? Esta ação não pode ser desfeita.`)) return;
 
    say();
    button.disabled = true;
    let failure = null;
    try { await api(`/vagas/${vaga.idVaga}`, { method: 'DELETE' }); } catch (error) { failure = error; }
    try { await load(); } catch (error) { failure = failure ?? error; }
    // 204 sem corpo pode derrubar um parser de JSON: o que vale é a vaga ter sumido (ou não) da lista.
    if (vacancies.some((v) => v.idVaga === vaga.idVaga)) {
      say(failure?.message ?? 'Não foi possível excluir a vaga.', true); // ex.: 409 por reservas
    } else {
      say(`Vaga ${vaga.numeroVaga} excluída.`);
    }
  });
 
  load().catch((error) => { groups.innerHTML = `<p class="text-center py-4 mb-0 empty-state">${escapeHtml(error.message)}</p>`; });
}