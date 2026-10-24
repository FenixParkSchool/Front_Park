# Front_Park

Front-end multipágina do projeto parkschool. Desenvolvido com HTML, CSS e JavaScript (ES Modules), empacotado e compilado utilizando o [Vite](https://vitejs.dev/).

## Desenvolvimento e Validação

Comandos disponíveis para gerenciar o ciclo de vida da aplicação:

*   **`npm install`**: Instala todas as dependências do projeto.
*   **`npm run dev`**: Inicia o servidor local de desenvolvimento do Vite.
*   **`npm test`**: Roda os testes automatizados utilizando o runner nativo `node:test`.
*   **`npm run build`**: Valida as referências e gera as dez páginas otimizadas para produção no diretório `dist/`.
*   **`npm run preview`**: Serve localmente a build de produção (ideal para testes antes do deploy).

##  Arquitetura

A arquitetura do projeto baseia-se em carregamento dinâmico e forte modularização:

*   **Páginas e Módulos:** Cada arquivo HTML declara a página atual através do atributo `body[data-page]` e carrega o script principal `js/main.js` como módulo (ex: na raiz `index.html`).

*   **Carregamento Dinâmico:** O `main.js` importa o Bootstrap e carrega dinamicamente o inicializador correspondente à página atual.

*   **Boas Práticas:** Evite o uso de handlers inline no HTML (ex: `onclick`). Em vez disso, exponha apenas a função `init()` no módulo de cada página.

*   **Estrutura de Diretórios:**
    *   `js/pages/<página>/`: Módulos específicos de cada página. 
    *   `js/shared/`: Funcionalidades comuns compartilhadas pela aplicação.
    *   `js/services/`: Lógica de persistência e chamadas externas.

*   **Domínios Funcionais:** Áreas mais complexas, como a **Administração** e a **Tela do Vigilante**, são divididas logicamente por domínio funcional para facilitar a manutenção.

## Configuração e Comunicação de Dados

*   **Variáveis de Ambiente:** Para apontar para um servidor backend diferente em produção ou staging, configure a variável `VITE_API_BASE_URL` no ambiente do Vite (utilizando um arquivo `.env`).

