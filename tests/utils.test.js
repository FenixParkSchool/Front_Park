import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, isValidPlate, normalizePlate } from '../js/shared/utils.js';

test('normaliza placa removendo separadores e convertendo para maiúsculas', () => {
  assert.equal(normalizePlate('abc-1234'), 'ABC1234');
});

test('aceita placas antigas e padrão Mercosul', () => {
  assert.equal(isValidPlate('ABC-1234'), true);
  assert.equal(isValidPlate('ABC1D23'), true);
});

test('rejeita placas inválidas', () => {
  assert.equal(isValidPlate('AB123'), false);
  assert.equal(isValidPlate('123-ABCD'), false);
});

test('escapa conteúdo inserido em HTML', () => {
  assert.equal(escapeHtml('<script title="x">&\'"'), '&lt;script title=&quot;x&quot;&gt;&amp;&#39;&quot;');
});
