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

test('Se elimina el grupo Atención clínica y se conserva Solicitudes de servicio en Atención', () => {
  assert.equal(navigation.some(item => item.label === 'Atención clínica'), false);
  const requests = attention.children.filter(item => item.label === 'Solicitudes de servicio');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].href, '/dashboard/solicitudes');
  assert.equal(requests[0].permission, 'clinica.leer');
  assert.equal(attention.children.map(item => item.label).join('|'), 'Solicitudes de servicio|Servicios del paciente|Paquetes|Promociones|Adquisiciones de pacientes|Catálogo');
  assert.equal(branchActive(attention, '/dashboard/solicitudes', ''), true);
});

test('Retirar el menú no elimina las páginas clínicas existentes', () => {
  for (const route of ['tratamientos', 'sesiones', 'valoraciones']) {
    assert.ok(readFileSync(new URL(`../app/dashboard/${route}/page.tsx`, import.meta.url), 'utf8').includes('export default'));
  }
});

test('Servicios del paciente agrupa las rutas clínicas sin reintroducir menús independientes', () => {
  const care = attention.children.find(item => item.label === 'Servicios del paciente');
  assert.equal(care.href, '/dashboard/atencion');
  assert.equal(itemVisible(care, ['tratamientos.leer'], false), true);
  assert.equal(itemVisible(care, ['clinica.leer'], false), true);
  assert.equal(itemVisible(care, ['catalogo.leer'], true), false);
  assert.equal(itemVisible(attention, ['tratamientos.leer'], false), true);
  for (const path of ['/dashboard/atencion', '/dashboard/tratamientos', '/dashboard/sesiones', '/dashboard/valoraciones']) {
    assert.equal(branchActive(care, path, ''), true);
    assert.equal(branchActive(attention, path, ''), true);
  }
  assert.equal(branchActive(care, '/dashboard/sesiones-extra', ''), false);
  for (const label of ['Tratamientos', 'Sesiones', 'Valoraciones y medidas', 'Atención clínica']) assert.equal(navigation.some(item => item.label === label), false);
});

test('El acceso a solicitudes no requiere permisos del catálogo ni rol administrativo', () => {
  const request = attention.children.find(item => item.label === 'Solicitudes de servicio');
  assert.equal(itemVisible(attention, ['clinica.leer'], false), true);
  assert.equal(itemVisible(request, ['clinica.leer'], false), true);
  assert.equal(itemVisible(catalog, ['clinica.leer'], false), false);
  assert.equal(itemVisible(request, ['catalogo.leer'], true), false);
  assert.equal(itemVisible(attention, [], true), false);
});

test('Se elimina el grupo Paquetes y promociones y se conservan sus tres accesos en Atención', () => {
  assert.equal(navigation.some(item => item.label === 'Paquetes y promociones'), false);
  for (const [label, href] of [['Paquetes', '/dashboard/paquetes'], ['Promociones', '/dashboard/promociones'], ['Adquisiciones de pacientes', '/dashboard/adquisiciones']]) {
    const items = attention.children.filter(item => item.label === label);
    assert.equal(items.length, 1);
    assert.equal(items[0].href, href);
    assert.equal(branchActive(attention, href, ''), true);
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
