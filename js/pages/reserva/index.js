import { reservationsRepo } from '../../services/repositories.js';
import { isValidPlate, normalizePlate } from '../../shared/utils.js';

export function init() {
  const form = document.getElementById('formReserva');
  const vacancy = document.getElementById('n_vaga');
  const plate = document.getElementById('placaVeiculo_visitante');
  const type = document.getElementById('tipo_vaga');
  const reason = document.getElementById('motivo_vaga');
  const date = document.getElementById('data_vaga');
  const start = document.getElementById('hora_entrada');
  const end = document.getElementById('hora_saida');
  if (!form || !vacancy || !plate || !type || !reason || !date || !start || !end) return;

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  date.min = todayString;
  plate.addEventListener('input', () => {
    const raw = normalizePlate(plate.value).slice(0, 7);
    plate.value = raw.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(raw) ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const vacancyNumber = vacancy.value.trim();
    const plateValue = plate.value.trim().toUpperCase();
    const reasonValue = reason.value.trim();
    if (!/^\d+$/.test(vacancyNumber)) { window.alert('Digite um número de vaga válido.'); vacancy.focus(); return; }
    if (!isValidPlate(plateValue)) { window.alert('Placa inválida. Use ABC-1234 ou ABC1D23.'); plate.focus(); return; }
    if (!type.value) { window.alert('Selecione o tipo da vaga.'); type.focus(); return; }
    if (reasonValue.length < 3) { window.alert('Informe o motivo da reserva.'); reason.focus(); return; }
    if (!date.value || date.value < todayString) { window.alert('Selecione uma data válida, a partir de hoje.'); date.focus(); return; }
    if (!start.value || !end.value) { window.alert('Informe o horário de entrada e saída.'); return; }
    if (start.value >= end.value) { window.alert('O horário de saída deve ser maior que o horário de entrada.'); end.focus(); return; }

    const reservations = reservationsRepo.list();
    const conflict = reservations.some((reservation) => String(reservation.vaga) === vacancyNumber && reservation.data === date.value && start.value < reservation.horaSaida && end.value > reservation.horaEntrada);
    if (conflict) { window.alert(`A vaga ${vacancyNumber} já está reservada nesse horário.`); return; }
    const created = { id: Date.now(), vaga: vacancyNumber, placa: plateValue, tipoVaga: type.value, motivo: reasonValue, data: date.value, horaEntrada: start.value, horaSaida: end.value };
    reservationsRepo.save([...reservations, created]);
    window.alert(`Reserva cadastrada com sucesso!\n\nVaga: ${vacancyNumber}\nPlaca: ${plateValue}\nTipo: ${type.value}\nMotivo: ${reasonValue}\nData: ${date.value}\nHorário: ${start.value} às ${end.value}`);
    form.reset();
    date.min = todayString;
  });
}
