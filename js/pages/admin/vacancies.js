const categories = {
  administracao: { label: 'Administração', icon: 'bi-diagram-3' },
  pcd: { label: 'PCD', icon: 'bi-universal-access' },
  carga: { label: 'Carga e descarga', icon: 'bi-truck' },
  comum: { label: 'Vagas comuns', icon: 'bi-car-front' },
};

function makeInitialVacancies() {
  return [
    ...Array.from({ length: 3 }, (_, index) => ({ id: `adm-${index + 1}`, category: 'administracao', number: index + 1 })),
    ...Array.from({ length: 3 }, (_, index) => ({ id: `pcd-${index + 1}`, category: 'pcd', number: index + 1 })),
    { id: 'cd-1', category: 'carga', number: 1 },
    ...Array.from({ length: 35 }, (_, index) => ({ id: `com-${index + 1}`, category: 'comum', number: index + 1 })),
  ];
}

const vacancies = makeInitialVacancies();

export function initAdminVacancies() {
  const total = document.getElementById('stat-total');
  const available = document.getElementById('stat-livres');
  const container = document.getElementById('grupos-vagas');
  if (!container) return;

  if (total) total.textContent = String(vacancies.length);
  if (available) available.textContent = String(vacancies.length);

  container.innerHTML = Object.entries(categories).map(([key, category]) => {
    const group = vacancies.filter((vacancy) => vacancy.category === key);
    return `<section class="vagas-grupo">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi ${category.icon} fs-5" aria-hidden="true"></i>
        <h2 class="font-display mb-0 fw-semibold">${category.label}</h2>
        <span class="badge text-bg-light border text-secondary ms-2">${group.length} ${group.length === 1 ? 'vaga' : 'vagas'}</span>
      </div>
      <div class="vagas-grid">${group.map((vacancy) => `<div class="vaga-card livre" title="Vaga livre" aria-label="Vaga ${vacancy.number}, livre">
        <i class="bi ${category.icon} icone-vaga" aria-hidden="true"></i>
        <span class="fw-bold">${vacancy.number}</span><span class="status text-uppercase">Livre</span>
      </div>`).join('')}</div>
    </section>`;
  }).join('');
}

export function getAdminVacancies() {
  return vacancies.map((vacancy) => ({ ...vacancy, status: 'livre' }));
}
