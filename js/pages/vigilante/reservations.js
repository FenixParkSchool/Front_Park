import { api } from '../../services/auth.js';

const pad = (n) => String(n).padStart(2, '0');
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowString = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const SOURCES = {
  reservas: '/reserva-vagas',
  vagas: '/vagas',
  visitantes: '/visitantes',
  veiculos: '/veiculoVisitantes',
};

// Reservas de HOJE ainda em andamento ou por vir.
// Cada rota é lida separada: se uma for negada (403), as outras continuam e o problema é informado.
export async function loadTodayReservations() {
  const keys = Object.keys(SOURCES);
  const settled = await Promise.allSettled(keys.map((key) => api(SOURCES[key])));

  const data = {};
  const problems = [];
  settled.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled') {
      data[key] = result.value;
    } else {
      data[key] = [];
      problems.push({ key, path: SOURCES[key], message: result.reason?.message ?? 'erro desconhecido' });
    }
  });

  const reservasProblem = problems.find((p) => p.key === 'reservas');
  if (reservasProblem) throw new Error(`${reservasProblem.path}: ${reservasProblem.message}`);

  const today = todayString();
  const now = nowString();

  const items = data.reservas
    .filter((r) => r.dataReserva === today && r.statusVisita !== 'RECUSADA' && r.horaSaida > now)
    .sort((a, b) => a.horaEntrada.localeCompare(b.horaEntrada))
    .map((r) => {
      const vaga = data.vagas.find((v) => v.idVaga === r.idVaga);
      const visitante = data.visitantes.find((v) => v.idVisitante === r.idVisitante) ?? null;
      const veiculo = data.veiculos.find((v) => v.idVeiculoVisitante === r.idVeiculoVisitante) ?? null;
      return {
        id: r.idReservaVaga,
        tipo: r.tipoReserva, // 'VISITA' | 'OUTRO'
        status: r.statusVisita, // só existe para visitas
        idVaga: r.idVaga,
        numeroVaga: vaga?.numeroVaga ?? null,
        motivo: r.motivoReserva,
        horaEntrada: r.horaEntrada,
        horaSaida: r.horaSaida,
        placa: r.placaReserva ?? veiculo?.placaVeiculoVisitante ?? '',
        visitante: visitante && {
          nome: visitante.nomeVisitante,
          telefone: visitante.telefoneVisitante,
          evento: visitante.evento,
        },
        veiculo: veiculo && {
          tipo: veiculo.tipoVeiculoVisitante,
          modelo: veiculo.modeloVeiculoVisitante,
          cor: veiculo.corVeiculoVisitante,
          ano: veiculo.anoVeiculoVisitante,
          placa: veiculo.placaVeiculoVisitante,
        },
      };
    });

  return { items, problems };
}