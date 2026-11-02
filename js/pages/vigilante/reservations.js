const [reservasRes, vagasRes, visitantesRes, veiculosRes] = await Promise.allSettled([
  api('/reserva-vagas'), api('/vagas'), api('/visitantes'), api('/veiculoVisitantes'),
]);
// sem reservas não há o que mostrar: repassa o erro (ex.: 403)
if (reservasRes.status === 'rejected') throw reservasRes.reason;
const reservas = reservasRes.value;
const vagas = vagasRes.status === 'fulfilled' ? vagasRes.value : [];
const visitantes = visitantesRes.status === 'fulfilled' ? visitantesRes.value : [];
const veiculos = veiculosRes.status === 'fulfilled' ? veiculosRes.value : [];