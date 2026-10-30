import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const compiledModule = { exports: {} };
const source = readFileSync(new URL('../lib/service-configuration.ts', import.meta.url), 'utf8');
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: compiledModule.exports, module: compiledModule });
const { readServiceMeasurements, readServiceSupplies } = compiledModule.exports;

test('Configura mediciones obligatorias con varios momentos y productos con cantidades decimales', () => {
  const data = new FormData();
  data.append('medidas', '2');
  data.set('obligatoria_2', 'on');
  data.append('momentos_2', 'INICIAL');
  data.append('momentos_2', 'FINAL');
  data.append('productos', '4');
  data.set('cantidad_4', '2,50');
  assert.equal(JSON.stringify(readServiceMeasurements(data)), JSON.stringify({ ok: true, value: [{ id_tipo_medida: 2, obligatorio: true, momentos: ['INICIAL', 'FINAL'] }] }));
  assert.equal(JSON.stringify(readServiceSupplies(data)), JSON.stringify({ ok: true, value: [{ id_producto: 4, cantidad_referencial: '2.50' }] }));
});

test('Permite servicios sin mediciones ni productos y eliminar asignaciones anteriores', () => {
  assert.equal(JSON.stringify(readServiceMeasurements(new FormData())), '{"ok":true,"value":[]}');
  assert.equal(JSON.stringify(readServiceSupplies(new FormData())), '{"ok":true,"value":[]}');
});

test('Rechaza IDs duplicados o inválidos, cantidades no positivas y momentos vacíos', () => {
  for (const ids of [['1', '1'], ['-1'], ['0'], ['1.5'], ['texto']]) {
    const data = new FormData();
    ids.forEach(id => { data.append('medidas', id); data.append('productos', id); });
    assert.equal(readServiceMeasurements(data).ok, false);
    assert.equal(readServiceSupplies(data).ok, false);
  }
  for (const quantity of ['', '0', '-1', '1.001', 'Infinity', '100000000']) {
    const data = new FormData(); data.set('productos', '1'); data.set('cantidad_1', quantity);
    assert.equal(readServiceSupplies(data).ok, false);
  }
  for (const moments of [[], ['INICIAL', 'INICIAL'], ['OTRO']]) {
    const data = new FormData(); data.set('medidas', '1'); moments.forEach(value => data.append('momentos_1', value));
    assert.equal(readServiceMeasurements(data).ok, false);
  }
});
