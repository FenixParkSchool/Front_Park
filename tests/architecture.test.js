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

test('todas as páginas HTML identificam seu módulo e carregam o entrypoint main.js', () => {
  assert.ok(pages.length >= 1);
  for (const pagePath of pages) {
    const page = basename(pagePath);
    const html = readFileSync(pagePath, 'utf8');
    assert.match(html, /<body[^>]+data-page="[A-Za-z0-9_-]+"/u, `${page} precisa declarar data-page`);
    assert.match(html, /<script\s+type="module"\s+src="(?:\.\.\/)?js\/main\.js"/u, `${page} precisa carregar main.js`);
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
