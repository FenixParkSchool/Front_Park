---
name: fenixpark-ui-ux
description: Design system e padrões de UI/UX do ParkSchool/Front_Park. Use ao criar, reformular ou ajustar páginas e componentes deste projeto para manter consistência com css/base/variables.css e com Home, Sobre, Login e Esqueci minha senha.
---

# ParkSchool — Design, UI e UX

Aplicar esta skill ao projetar ou reformular páginas do Front_Park. Ela codifica a linguagem visual observada em `css/base/variables.css`, `css/base/typography.css`, componentes compartilhados e nas páginas Home, Sobre, Login e Esqueci-senha. O projeto usa HTML/CSS com Bootstrap 5.3, Font Awesome 6.4 e fontes Google Inter/Sora.

## Fontes de verdade e precedência

1. Ler `css/base/variables.css`, `css/base/typography.css`, `css/styles.css` e os CSS compartilhados no repositório antes de implementar.
2. Tratar variáveis CSS do projeto como fonte de verdade. Reutilizar componentes compartilhados (`buttons.css`, `forms.css`, `navbar.css`, `logos.css`) em vez de introduzir estilos concorrentes.
3. Consultar as páginas de referência: `pages/home.html` + `css/pages/home.css`, `pages/sobre.html` + `css/pages/sobre.css`, `pages/login.html` + `css/pages/login.css`, `pages/esqueci_senha.html` + `css/pages/esqueci-senha.css`.
4. Não inventar valores de marca quando um token equivalente existir. Evitar valores inline, novas cores, sombras, raios ou espaçamentos soltos; quando houver necessidade real, preferir adicionar token reutilizável em vez de espalhar valores.
5. Não alterar o comportamento funcional, rotas ou conteúdo de negócio durante uma tarefa visual, salvo solicitação explícita.

## Linguagem visual

Transmitir uma experiência institucional, confiável, clara e acolhedora para gestão escolar/estacionamento. Usar azul escuro como âncora, superfícies claras, hierarquia tipográfica forte e layout limpo. Reservar fotografia com sobreposição azul para áreas de impacto (hero ou painel lateral), não para competir com formulários e texto. Preferir bordas sutis e elevação discreta em cards. Usar animações curtas e funcionais; evitar excesso de ornamentos.

## Tokens do projeto

Reutilizar os nomes e valores vigentes no arquivo de variáveis. Referência atual observada:

- **Cores da marca:** `--color-primary: #1D397D` (azul escuro); `--color-secondary: #1C4966` (azul petróleo); `--color-tertiary: #64748B` (azul ardósia); `--color-neutral: #B5B5B5`.
- **Interação:** `--color-primary-hover: #264CA6`, `--color-primary-active: #142757`, `--color-primary-light: #E8EEFB`; equivalentes `--color-secondary-hover`, `--color-secondary-active`, `--color-secondary-light`, `--color-tertiary-hover`, `--color-tertiary-active`, `--color-tertiary-light` conforme `variables.css`.
- **Superfícies e texto:** `--bg-body` referencia `--color-gray-50` (#F8FAFC); `--bg-surface` referencia branco; `--text-primary` referencia `--color-gray-900` (#0F172A); `--text-secondary` referencia `--color-gray-600` (#475569); `--text-inverse` branco; `--border-color` `--color-gray-200` (#E2E8F0). Usar escala cinza existente, sem redefini-la.
- **Feedback:** `--color-success` (#10B981), `--color-warning` (#F59E0B), `--color-danger` (#EF4444), `--color-info` aponta para a cor secundária. Acentos azul e violeta: `--color-accent-blue` (#38BDF8), `--color-accent-purple` (#A78BFA). Aplicar semântica correta; não codificar significado somente por cor.
- **Tipografia:** corpo Inter; títulos Sora, com fallbacks definidos em `typography.css`. Usar a escala `--font-size-xs` até `--font-size-4xl` e pesos `--font-weight-*`. Títulos são fortes e preferencialmente em Sora; texto corrido e controles em Inter.
- **Ritmo e forma:** usar `--spacing-*` com escala base 4/8 px; `--gap-*`, `--padding-container`; raios `--radius-sm` (4 px), `--radius-md` (8 px), `--radius-lg` (16 px), `--radius-xl` (24 px), `--radius-pill` e `--radius-circle` conforme o componente.
- **Elevação e movimento:** `--shadow-sm` a `--shadow-xl`, `--shadow-inner`; transições `--transition-fast` (150 ms), `--transition-normal` (250 ms), `--transition-slow` (350 ms). Usar níveis de z-index tokenizados.

Estes valores são um retrato dos tokens atuais, não uma autorização para duplicar variáveis em novos arquivos. Se o CSS do repositório tiver evoluído, prevalece o código atual.

## Padrões observados nas páginas

### Home e Sobre — páginas públicas

- Reutilizar `navbar-home`, `nav-link-home`, `btn-nav-login` e `logo-home`: navbar azul translúcida, efeito blur, fixa ao topo (sticky), links claros e destaque de hover sublinhado. Manter identidade/logo consistente e links claros.
- Na Home, usar hero alto (aproximadamente 90vh) com fotografia em cover, camada/gradiente azul para contraste, título e lead legíveis e chamadas de ação explícitas. Os cards de recursos sobre a imagem usam transparência, borda clara e raio grande. Evitar adicionar overlays além do necessário para legibilidade.
- A página Sobre segue narrativa em seções alternadas (`bg-body`/`bg-surface`) com cabeçalhos centralizados, eyebrow em caixa alta e tracking, título de seção Sora e conteúdo organizado em listas/cards. Cards usam borda neutra, fundo de superfície, raio grande e sombra discreta; feedback/estados podem usar cores semânticas. CTA final pode usar gradiente primary-secondary.
- Usar container e grid responsivo do Bootstrap; espaçamento vertical uniforme entre seções. No rodapé, usar superfície clara, linha superior sutil, links secundários e marca.

### Login — autenticação

- Seguir a composição em duas áreas: painel fotográfico à esquerda em telas `lg` ou maiores e formulário em superfície clara à direita. O painel de imagem desaparece em telas menores; o formulário ocupa a largura e preserva margens internas confortáveis.
- Escurecer foto com overlay semitransparente para o texto branco. Restringir largura do formulário (`.login-wrapper`, hoje 450px), apresentar título e instrução antes dos campos, depois ação principal em largura total.
- Campos levam label visível, ícone opcional alinhado ao input, borda sutil e foco azul com halo discreto. Incluir links de recuperação/criação de conta e checkbox quando a função existir.
- Não depender somente de placeholder para identificar campo. Garantir estados visíveis de foco, validação, erro, loading e desabilitado conforme comportamento existente.

### Esqueci minha senha — recuperação

- Usar composição focada: fundo claro/gradiente (`main-bg`), fotografia opcional bem atenuada ao fundo e cartão central (`esqueci-senha-wrapper`) com borda, sombra e raio grande. A navbar pública mantém a navegação global.
- Manter uma hierarquia curta: ícone ilustrativo em círculo suave, título, explicação sucinta, campo rotulado, botão primário de largura total e link de retorno ao Login.
- Para fluxo em etapas ou código de verificação, manter estados simples e explícitos; o estilo existente de botão/tab e espaçamento monoespaçado para código é exceção funcional, a ser reutilizada apenas se a tela realmente pedir.

## Componentes e estados

- **Botão primário:** usar `.ds-btn-primary`, `.btn-primario` ou `.btn-primary` conforme o contexto existente. Base azul, texto branco, raio médio e padding tokenizado; hover/active/disabled vêm do CSS compartilhado. Não recriar variantes localmente.
- **Botão secundário/outline:** usar `.btn-secundario` ou `.ds-btn-outline`; manter contraste e hover com `--color-primary-light`.
- **Formulários:** usar `.form-label`, `.form-control`, `.form-select`, `.ds-input-group`; raio médio, fundo de superfície, texto primário, placeholder neutro e foco de marca. Preservar associação label/input e feedback textual.
- **Links:** usar classe utilitária de texto primário/secundário existente ou padrão equivalente; dar estado hover/focus discernível e manter decoração ou outro indicativo de interação.
- **Cards:** fundo `--bg-surface` ou `--bg-body` conforme contexto, borda `--border-color`, raio médio/grande, sombra somente quando elevar hierarquia. Em hover, no máximo elevação curta e pequena mudança de borda/sombra.
- **Ícones:** Font Awesome já é usado no projeto. Escolher ícone coerente, manter tamanho e alinhamento com texto; ícone decorativo deve ser ocultado de leitores de tela quando apropriado. Nunca usar ícone sozinho como único rótulo de ação.
- **Acessibilidade:** manter HTML semântico, ordem de foco lógica, alvos adequados, estados `:focus-visible` discerníveis, labels acessíveis, alt útil para imagem informativa e `alt=""` para imagem decorativa. Checar contraste em texto pequeno e não usar cor como único indicador.

## Responsividade e UX

- Começar por telas estreitas e usar breakpoints/classes Bootstrap existentes. Evitar overflow horizontal, campos comprimidos e texto claro sobre imagem sem overlay suficiente.
- Em layouts assimétricos de marketing/autenticação, reduzir ou ocultar mídia decorativa no mobile e preservar primeiro a tarefa principal e sua chamada de ação.
- Favorecer uma ação primária clara por bloco; apresentar ações secundárias como links ou botões outline. Tornar feedback de envio, erro e sucesso explícito e próximo ao campo/ação.
- Respeitar `prefers-reduced-motion` para animações não essenciais quando adicionar movimento. Não depender de hover para revelar informação essencial.

## Fluxo de trabalho ao reformular uma página

1. Localizar rota, HTML, CSS e JavaScript existentes; ler tokens e componentes compartilhados relevantes. Confirmar como a página é carregada por `css/styles.css`.
2. Identificar o tipo de página e mapear sua estrutura e tarefas de usuário. Escolher o padrão correspondente acima; não copiar literalmente um layout de outra categoria.
3. Reutilizar tokens, Bootstrap e componentes já definidos. Criar CSS específico apenas para particularidades da página, com nomes de classe claros e sem regras globais que afetem outras telas.
4. Preservar conteúdo/fluxos e responsividade; melhorar hierarquia, legibilidade, consistência e feedback sem alterar semântica de negócio.
5. Verificar em largura mobile e desktop, interação de teclado/foco, contraste, labels, links/rotas, estados de formulário e console/build quando disponível.
6. Comparar visualmente com Home/Sobre/Login/Esqueci-senha e corrigir divergências de cor, tipografia, espaçamento, borda, sombra e navegação. Não inventar padrão novo sem motivo.

## Evitar

- Cores hex, tipografia, raio, espaçamento ou sombra hardcoded quando houver token equivalente.
- Variações duplicadas de botão/formulário, inline styles persistentes, estilos globais acidentais ou seletores genéricos que alterem páginas existentes.
- Cards pesados, múltiplas sombras, gradientes decorativos em excesso, animação chamativa, navbar divergente ou imagem competindo com formulários.
- Conteúdo com contraste insuficiente, foco invisível, placeholder como substituto de label, botão sem estado de carregamento quando a operação for assíncrona, controles sem rótulo acessível.
