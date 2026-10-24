import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const pages = [
  'admin', 'cadastro_veiculo', 'esqueci_senha', 'login',
  'registrar', 'reserva_vaga', 'sobre', 'tela-vigilante', 'tela_termos',
];
const input = Object.fromEntries(pages.map((page) => [page, fileURLToPath(new URL(`./pages/${page}.html`, import.meta.url))]));
input.home = fileURLToPath(new URL('./index.html', import.meta.url));

export default defineConfig({
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
