import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Comprueba la configuración real sin iniciar sesión ni consultar el backend.
const source = ts.createSourceFile('dashboard-shell.tsx', readFileSync(new URL('../components/dashboard-shell.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let navigationArray;
const helpers = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'navigation') navigationArray = node.initializer;
  if (ts.isFunctionDeclaration(node) && ['itemVisible', 'branchActive'].includes(node.name?.text)) helpers.push(node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(navigationArray);
const arrayText = navigationArray.getText(source);
const icons = Object.fromEntries([...arrayText.matchAll(/icon:\s*(\w+)/g)].map(([, name]) => [name, null]));
const javascript = ts.transpileModule(`const navigation = ${arrayText};\n${helpers.join('\n')}\n({ navigation, itemVisible, branchActive });`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
const { navigation, itemVisible, branchActive } = runInNewContext(javascript, { ...icons, URLSearchParams });
const attention = navigation.find(item => item.label === 'Atención');
const clinicalAttention = navigation.find(item => item.label === 'Atención clínica');
const packagesAndPromotions = navigation.find(item => item.label === 'Paquetes y promociones');
const configuration = navigation.find(item => item.label === 'Configuración');
const catalog = attention.children.find(item => item.label === 'Catálogo');

test('Catálogo solo incluye Área y categoría y Servicios en Atención, debajo de Personal', () => {
  const personalIndex = navigation.findIndex(item => item.label === 'Personal');
  assert.equal(navigation[personalIndex + 1], attention);
  assert.equal(attention.soon, undefined);
  assert.equal(configuration.children.some(item => item.label === 'Catálogo'), false);
  assert.equal(catalog.children.map(item => item.label).join('|'), 'Área y categoría|Servicios');
  assert.equal(catalog.children.map(item => item.href).join('|'), '/dashboard/servicios?tab=structure|/dashboard/servicios?tab=services');
});

test('Catálogo conserva el permiso de lectura y la restricción administrativa', () => {
  assert.equal(itemVisible(attention, ['catalogo.leer'], true), true);
  assert.equal(itemVisible(catalog, ['catalogo.leer'], true), true);
  assert.equal(itemVisible(catalog, ['catalogo.leer'], false), false);
  assert.equal(itemVisible(catalog, ['clinica.leer', 'tratamientos.leer'], true), false);
  assert.equal(itemVisible(configuration, ['catalogo.leer'], true), false);
  assert.equal(itemVisible(configuration, ['empresa.leer'], true), true);
});

test('Las pestañas del catálogo activan Atención y no Configuración', () => {
  for (const tab of ['structure', 'services', 'measures']) {
    assert.equal(branchActive(catalog, '/dashboard/servicios', `tab=${tab}`), true);
    assert.equal(branchActive(attention, '/dashboard/servicios', `tab=${tab}`), true);
    assert.equal(branchActive(configuration, '/dashboard/servicios', `tab=${tab}`), false);
  }
  assert.equal(branchActive(configuration, '/dashboard/empresa', ''), true);
  assert.equal(branchActive(attention, '/dashboard/empresa', ''), false);
});

test('Solicitudes de servicio se copia a Atención y se conserva en Atención clínica', () => {
  const copiedRequest = attention.children.find(item => item.label === 'Solicitudes de servicio');
  const originalRequest = clinicalAttention.children.find(item => item.label === 'Solicitudes de servicio');
  assert.ok(copiedRequest);
  assert.ok(originalRequest);
  assert.deepEqual(copiedRequest, originalRequest);
  assert.equal(copiedRequest.href, '/dashboard/solicitudes');
  assert.equal(copiedRequest.permission, 'clinica.leer');
  assert.equal(attention.children.map(item => item.label).join('|'), 'Solicitudes de servicio|Paquetes|Promociones|Adquisiciones de pacientes|Catálogo');
  assert.equal(clinicalAttention.children.map(item => item.label).join('|'), 'Solicitudes de servicio|Tratamientos|Sesiones|Valoraciones y medidas');
  assert.equal(branchActive(attention, '/dashboard/solicitudes', ''), true);
  assert.equal(branchActive(clinicalAttention, '/dashboard/solicitudes', ''), true);
});

test('El acceso a solicitudes no requiere permisos del catálogo ni rol administrativo', () => {
  const request = attention.children.find(item => item.label === 'Solicitudes de servicio');
  assert.equal(itemVisible(attention, ['clinica.leer'], false), true);
  assert.equal(itemVisible(request, ['clinica.leer'], false), true);
  assert.equal(itemVisible(catalog, ['clinica.leer'], false), false);
  assert.equal(itemVisible(request, ['catalogo.leer'], true), false);
  assert.equal(itemVisible(attention, [], true), false);
});

test('Las tres opciones comerciales se copian a Atención sin quitar las originales', () => {
  const labels = ['Paquetes', 'Promociones', 'Adquisiciones de pacientes'];
  assert.equal(packagesAndPromotions.children.map(item => item.label).join('|'), labels.join('|'));
  for (const label of labels) {
    const original = packagesAndPromotions.children.find(item => item.label === label);
    const copied = attention.children.find(item => item.label === label);
    assert.ok(original);
    assert.ok(copied);
    assert.deepEqual(copied, original);
    assert.equal(branchActive(attention, original.href, ''), true);
    assert.equal(branchActive(packagesAndPromotions, original.href, ''), true);
  }
});

test('Las opciones comerciales mantienen sus permisos y restricciones de administración', () => {
  const packages = attention.children.find(item => item.label === 'Paquetes');
  const promotions = attention.children.find(item => item.label === 'Promociones');
  const acquisitions = attention.children.find(item => item.label === 'Adquisiciones de pacientes');
  assert.equal(itemVisible(attention, ['comercial.leer'], true), true);
  for (const item of [packages, promotions]) {
    assert.equal(itemVisible(item, ['comercial.leer'], true), true);
    assert.equal(itemVisible(item, ['comercial.leer'], false), false);
    assert.equal(itemVisible(item, ['clinica.leer'], true), false);
  }
  assert.equal(itemVisible(attention, ['adquisiciones.leer'], false), true);
  assert.equal(itemVisible(acquisitions, ['adquisiciones.leer'], false), true);
  assert.equal(itemVisible(acquisitions, ['comercial.leer'], true), false);
});
