import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const pages = [
  'admin', 'cadastro_veiculo', 'esqueci_senha', 'login',
  'registrar', 'reserva_vaga', 'sobre', 'tela-vigilante', 'tela_termos',
];
const input = Object.fromEntries(pages.map((page) => [page, fileURLToPath(new URL(`./pages/${page}.html`, import.meta.url))]));
input.home = fileURLToPath(new URL('./index.html', import.meta.url));

function htmlUtf8Headers() {
  const addCharset = (_request, response, next) => {
    const writeHead = response.writeHead;

    response.writeHead = function writeHeadWithUtf8Charset(...args) {
      const contentType = response.getHeader('Content-Type');
      if (typeof contentType === 'string' && /^text\/html(?:;|$)/iu.test(contentType) && !/;\s*charset=/iu.test(contentType)) {
        response.setHeader('Content-Type', `${contentType}; charset=utf-8`);
      }
      return writeHead.apply(this, args);
    };

    next();
  };

  return {
    name: 'parkschool-html-utf8-headers',
    configureServer(server) {
      server.middlewares.use(addCharset);
    },
    configurePreviewServer(server) {
      server.middlewares.use(addCharset);
    },
  };
}

export default defineConfig({
  plugins: [htmlUtf8Headers()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input,
    },
  },
});
