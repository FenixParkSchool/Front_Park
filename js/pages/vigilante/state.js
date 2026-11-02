export const totalVacancies = 42;
export const vacancies = Array.from({ length: totalVacancies }, (_, index) => {
  const number = index + 1;
  const type = number <= 3 ? 'Diretoria' : number <= 6 ? 'PCD' : number <= 9 ? 'Visitantes' : 'Funcionários';
  return { number, type, status: 'available', plate: '' };
});