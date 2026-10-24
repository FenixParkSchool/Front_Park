import { visitsRepo } from '../../services/repositories.js';

export const totalVacancies = 42;
export const vacancies = Array.from({ length: totalVacancies }, (_, index) => {
  const number = index + 1;
  const type = number <= 3 ? 'Diretoria' : number <= 6 ? 'PCD' : number <= 9 ? 'Visitantes' : 'Funcionários';
  return { number, type, status: 'available', plate: '' };
});

export const visits = visitsRepo.list().map((visit) => ({
  ...visit,
  id: Number(visit.id), nome: visit.nome, entrada: visit.entrada, motivo: visit.motivo,
  placa: visit.placa, vaga: Number(visit.vaga), status: visit.status === 'confirmed' ? 'confirmed' : visit.status === 'rejected' ? 'rejected' : 'pending',
}));
