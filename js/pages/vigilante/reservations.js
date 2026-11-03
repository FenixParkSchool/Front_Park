//Arquivo:Front_Park/js/pages/vigilante/reservations.js
import { api } from '../../services/auth.js';
import { state } from './state.js';

// Mesmo fuso que o back usa em vaga.service.ts, para "hoje" e "agora" baterem
// com o estado RESERVADA calculado pela API (e não com o relógio do computador).
const FUSO = 'America/Sao_Paulo';

const partesAgora = () => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]),
);

const hoje = () => { const p = partesAgora(); return `${p.year}-${p.month}-${p.day}`; };
const horaAtual = () => { const p = partesAgora(); return `${p.hour === '24' ? '00' : p.hour}:${p.minute}`; };

const ymd = (v) => String(v ?? '').slice(0, 10);
// aceita "14:00:00" e também "1970-01-01T14:00:00.000Z"
const hhmm = (v) => {
  const s = String(v ?? '');
  return s.includes('T') ? s.slice(11, 16) : s.slice(0, 5);
};

export async function loadReservas() {
  try {
    const reservas = await api('/reserva-vagas');
    const visitantes = await api('/visitantes').catch(() => []); // só identifica a visita
    const dia = hoje();
    const agora = horaAtual();

    state.reservas = reservas
      // só reservas de hoje que ainda não terminaram
      .filter((r) => ymd(r.dataReserva) === dia
        && r.statusVisita !== 'RECUSADA'
        && hhmm(r.horaSaida) > agora)
      .sort((a, b) => hhmm(a.horaEntrada).localeCompare(hhmm(b.horaEntrada)))
      .map((r) => {
        const v = visitantes.find((x) => x.idVisitante === r.idVisitante);
        const vaga = state.vagas.find((x) => x.idVaga === r.idVaga);
        return {
          id: r.idReservaVaga,
          tipo: r.tipoReserva,
          status: r.statusVisita,
          numeroVaga: vaga?.numeroVaga ?? r.idVaga,
          motivo: r.motivoReserva,
          entrada: hhmm(r.horaEntrada),
          saida: hhmm(r.horaSaida),
          placa: r.placaReserva ?? '',
          visitante: v ? { nome: v.nomeVisitante, telefone: v.telefoneVisitante } : null,
        };
      });
    state.erroReservas = null;
  } catch (error) {
    state.reservas = [];
    state.erroReservas = error.message || 'Não foi possível carregar as reservas de hoje.';
  }
}