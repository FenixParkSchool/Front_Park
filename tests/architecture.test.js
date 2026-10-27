import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const pagesDirectory = join(projectRoot, 'pages');
const pages = [join(projectRoot, 'index.html'), ...readdirSync(pagesDirectory)
  .filter((name) => name.endsWith('.html'))
  .map((name) => join(pagesDirectory, name))];
const collectSourceFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const sourcePath = join(directory, entry.name);
  if (entry.isDirectory()) return collectSourceFiles(sourcePath);
  return /\.(?:js|css)$/u.test(entry.name) ? [sourcePath] : [];
});
const sourceFiles = [
  ...pages,
  ...collectSourceFiles(join(projectRoot, 'js')),
  ...collectSourceFiles(join(projectRoot, 'css')),
];

test('todas as páginas HTML identificam seu módulo e carregam o entrypoint main.js', () => {
  assert.ok(pages.length >= 1);
  for (const pagePath of pages) {
    const page = basename(pagePath);
    const html = readFileSync(pagePath, 'utf8');
    assert.match(html, /<body[^>]+data-page="[A-Za-z0-9_-]+"/u, `${page} precisa declarar data-page`);
    assert.match(html, /<script\s+type="module"\s+src="(?:\.\.\/)?js\/main\.js"/u, `${page} precisa carregar main.js`);
  }
});

test('fontes do frontend são UTF-8, textos não têm acentos substituídos e páginas carregam recursos tipográficos', () => {
  for (const sourcePath of sourceFiles) {
    const filename = sourcePath.slice(projectRoot.length + 1);
    const bytes = readFileSync(sourcePath);
    const source = bytes.toString('utf8');

    assert.equal(Buffer.from(source, 'utf8').compare(bytes), 0, `${filename} precisa estar salvo em UTF-8 válido`);
    assert.doesNotMatch(
      source.replace(/https?:\/\/[^\s"'<>]+/gu, ''),
      /[\p{L}]\?{1,2}[\p{L}]/u,
      `${filename} contém um caractere de substituição no meio de uma palavra`,
    );

    if (filename.endsWith('.html')) {
      assert.match(source, /<meta\s+charset=["']?utf-8["']?\s*\/?\s*>/iu, `${filename} precisa declarar UTF-8`);
      assert.match(source, /fonts\.googleapis\.com/u, `${filename} precisa carregar Inter/Sora`);

      if (/\bfa-(?:solid|regular|brands)\b/u.test(source)) {
        assert.match(source, /font-awesome\/6\.4\.2/u, `${filename} usa Font Awesome e precisa carregá-lo`);
      }
      if (/\bbi\s+bi-/u.test(source)) {
        assert.match(source, /bootstrap-icons@/u, `${filename} usa Bootstrap Icons e precisa carregá-los`);
      }
    }
  }
});

test('páginas não usam handlers inline nem apontam para scripts JavaScript inexistentes', () => {
  for (const pagePath of pages) {
    const page = basename(pagePath);
    const html = readFileSync(pagePath, 'utf8');
    assert.doesNotMatch(html, /\son(?:click|submit|input|change|keyup)\s*=/iu, `${page} ainda contém handler inline`);
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+\.html)"/giu)) {
      if (match[1].startsWith('http')) continue;
      assert.ok(existsSync(resolve(dirname(pagePath), match[1])), `${page} aponta para página inexistente: ${match[1]}`);
    }
    for (const match of html.matchAll(/<script[^>]+src="([^"]+\.js)"/giu)) {
      if (match[1].startsWith('http')) continue;
      const target = resolve(dirname(pagePath), match[1]);
      assert.ok(existsSync(target), `${page} aponta para script ausente: ${match[1]}`);
    }
  }
});
