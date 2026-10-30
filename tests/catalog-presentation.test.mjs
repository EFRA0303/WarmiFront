import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const data = { areas: [], categories: [], services: [], measures: [], productCategories: [] };

function loadComponent(relativePath, mocks = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  } });
  const compiledModule = { exports: {} };
  const dependencies = { react: React, 'react/jsx-runtime': jsxRuntime, ...mocks };
  runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, require(name) {
    if (name.endsWith('.css')) return {};
    if (name in dependencies) return dependencies[name];
    throw new Error(`Dependencia sin simular: ${name}`);
  } }, { filename: filename.pathname });
  return compiledModule.exports;
}

const { ServiceCatalogManager } = loadComponent('../components/service-catalog-manager.tsx', {
  '@/components/icons': new Proxy({}, { get: () => () => null }),
  '@/components/submission-result-dialog': { SubmissionResultDialog: () => null },
  '@/app/dashboard/servicios/actions': {},
});
const { default: ServicesPage } = loadComponent('../app/dashboard/servicios/page.tsx', {
  'next/navigation': { redirect: path => { throw new Error(`Redirección inesperada: ${path}`); } },
  '@/components/service-catalog-manager': { ServiceCatalogManager },
  '@/lib/auth': { getCurrentUser: async () => ({ permisos: ['catalogo.leer'] }) },
  '@/lib/catalog': { getServiceCatalog: async () => ({ ok: true, value: data }) },
  '@/lib/configuration-access': { isConfigurationAdmin: () => true },
});

const renderCatalog = props => renderToStaticMarkup(React.createElement(ServiceCatalogManager, { data, canCreate: false, canEdit: false, ...props }));
const activeTab = html => /<button class="catalog-measures-shortcut"[^>]*aria-current="page"/.test(html) ? 'Mediciones' : html.match(/<button class="active"[^>]*>([^<]+)/)?.[1].trim();

test('Áreas y categorías solo muestra las pestañas de estructura y Servicios', () => {
  const html = renderCatalog();
  const labels = [...html.matchAll(/<button\b[^>]*>([^<]+)<span>/g)].map(([, label]) => label.trim());
  assert.deepEqual(labels, ['Áreas y categorías', 'Servicios']);
  assert.equal(activeTab(html), 'Áreas y categorías');
});

test('La guía presenta Área → Categorías → Servicios con numeración consecutiva', () => {
  const html = renderCatalog();
  const guide = html.split('<div class="catalog-structure__guide">')[1].split('<div class="catalog-area-grid">')[0];
  const steps = [...guide.matchAll(/<span>(\d)<\/span><strong>([^<]+)<\/strong>/g)].map(([, number, label]) => `${number} ${label}`);
  assert.deepEqual(steps, ['1 Área', '2 Categorías', '3 Servicios']);
  assert.equal((guide.match(/<i aria-hidden="true">→<\/i>/g) || []).length, 2);
});

test('El encabezado del catálogo ya no dice Configuración', async () => {
  const html = renderToStaticMarkup(await ServicesPage({ searchParams: Promise.resolve({}) }));
  const header = html.split('<header class="directory-heading">')[1].split('</header>')[0];
  assert.match(header, /<h1>Catálogo<\/h1>/);
  assert.doesNotMatch(header, /CONFIGURACIÓN/);
  assert.equal(activeTab(html), 'Áreas y categorías');
});

test('Los enlaces directos de Servicios y Mediciones mantienen su pestaña', async () => {
  for (const [tab, label] of [['services', 'Servicios'], ['measures', 'Mediciones'], ['structure', 'Áreas y categorías']]) {
    const html = renderToStaticMarkup(await ServicesPage({ searchParams: Promise.resolve({ tab }) }));
    assert.equal(activeTab(html), label);
  }
});

test('La vista independiente de categorías de productos se conserva sin pestañas del catálogo', () => {
  const html = renderCatalog({ view: 'product-categories', initialTab: 'product-categories' });
  assert.doesNotMatch(html, /class="catalog-tabs"/);
  assert.match(html, /<th>Categoría de producto<\/th>/);
  assert.doesNotMatch(html, /class="catalog-structure__guide"/);
});

test('Servicios muestra una fila de pestañas, mediciones, búsqueda y alta', () => {
  const html = renderCatalog({ initialTab: 'services', canCreate: true });
  assert.match(html, /class="catalog-manager catalog-manager--listing"/);
  assert.equal(activeTab(html), 'Servicios');
  const tabsIndex = html.indexOf('class="catalog-tabs"');
  const measuresIndex = html.indexOf('class="catalog-measures-shortcut"');
  const searchIndex = html.indexOf('placeholder="Buscar servicio, categoría o área..."');
  const createIndex = html.indexOf('Nuevo servicio');
  assert.ok(tabsIndex >= 0 && measuresIndex > tabsIndex && searchIndex > measuresIndex && createIndex > searchIndex);
  const tabsMarkup = html.split('<div class="catalog-tabs">')[1].split('</div>')[0];
  assert.doesNotMatch(tabsMarkup, /Mediciones/);
  assert.equal((html.match(/class="catalog-measures-shortcut"/g) || []).length, 1);
  for (const initialTab of ['structure', 'product-categories']) {
    assert.doesNotMatch(renderCatalog({ initialTab }), /catalog-manager--listing|catalog-measures-shortcut/);
  }
});

test('Mediciones mantiene el botón separado, el buscador y Nueva medición en la misma fila', () => {
  const html = renderCatalog({ initialTab: 'measures', canCreate: true });
  assert.match(html, /class="catalog-manager catalog-manager--listing"/);
  assert.equal(activeTab(html), 'Mediciones');
  const tabsMarkup = html.split('<div class="catalog-tabs">')[1].split('</div>')[0];
  assert.doesNotMatch(tabsMarkup, /Mediciones|class="active"/);
  assert.match(tabsMarkup, /Áreas y categorías/);
  assert.match(tabsMarkup, /Servicios/);
  const tabsIndex = html.indexOf('class="catalog-tabs"');
  const measuresIndex = html.indexOf('class="catalog-measures-shortcut"');
  const searchIndex = html.indexOf('placeholder="Buscar medición o unidad..."');
  const createIndex = html.indexOf('Nueva medición');
  assert.ok(tabsIndex >= 0 && measuresIndex > tabsIndex && searchIndex > measuresIndex && createIndex > searchIndex);
  assert.equal((html.match(/class="catalog-measures-shortcut"/g) || []).length, 1);
  assert.match(html, /<th>Medición<\/th><th>Unidad<\/th><th>Servicios asociados<\/th>/);
  assert.doesNotMatch(html, /Nuevo servicio|Buscar servicio, categoría o área/);
});

test('Mediciones conserva el buscador y el botón separado sin permiso de creación', () => {
  const html = renderCatalog({ initialTab: 'measures', canCreate: false });
  assert.match(html, /class="catalog-manager catalog-manager--listing"/);
  assert.match(html, /placeholder="Buscar medición o unidad..."/);
  assert.match(html, /class="catalog-measures-shortcut"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /Nueva medición/);
});

test('Servicios conserva la búsqueda y las pestañas para quien no puede crear', () => {
  const html = renderCatalog({ initialTab: 'services', canCreate: false });
  assert.match(html, /class="catalog-tabs"/);
  assert.match(html, /placeholder="Buscar servicio, categoría o área..."/);
  assert.match(html, /class="catalog-measures-shortcut"/);
  assert.doesNotMatch(html, /Nuevo servicio/);
});

test('El botón separado de Mediciones abre la vista de tipos de medida y limpia la búsqueda', () => {
  const updates = [];
  const { ServiceCatalogManager: InteractiveCatalog } = loadComponent('../components/service-catalog-manager.tsx', {
    react: { ...React, useState: value => [value, next => updates.push(next)], useMemo: create => create() },
    '@/components/icons': new Proxy({}, { get: () => () => null }),
    '@/components/submission-result-dialog': { SubmissionResultDialog: () => null },
    '@/app/dashboard/servicios/actions': {},
  });
  const tree = InteractiveCatalog({ data, initialTab: 'services', canCreate: false, canEdit: false });
  const shortcut = React.Children.toArray(tree.props.children).find(child => React.isValidElement(child) && child.props.className === 'catalog-measures-shortcut');
  assert.ok(shortcut);
  assert.equal(shortcut.props.type, 'button');
  shortcut.props.onClick();
  assert.deepEqual(updates, ['measures', '']);
});

test('Áreas y categorías alinea las pestañas con Nueva área sin agregar buscador', () => {
  const html = renderCatalog({ initialTab: 'structure', canCreate: true });
  assert.match(html, /class="catalog-manager catalog-manager--structure"/);
  assert.equal(activeTab(html), 'Áreas y categorías');
  const tabsIndex = html.indexOf('class="catalog-tabs"');
  const createIndex = html.indexOf('Nueva área');
  const guideIndex = html.indexOf('class="catalog-structure__guide"');
  assert.ok(tabsIndex >= 0 && createIndex > tabsIndex && guideIndex > createIndex);
  assert.doesNotMatch(html, /placeholder="Buscar|catalog-measures-shortcut|Mediciones/);
  for (const initialTab of ['services', 'measures', 'product-categories']) {
    assert.doesNotMatch(renderCatalog({ initialTab }), /catalog-manager--structure/);
  }
});

test('Áreas y categorías conserva las pestañas y la guía sin permiso de creación', () => {
  const html = renderCatalog({ initialTab: 'structure', canCreate: false });
  assert.match(html, /class="catalog-tabs"/);
  assert.match(html, /class="catalog-structure__guide"/);
  assert.doesNotMatch(html, /Nueva área|Mediciones|catalog-measures-shortcut/);
});

test('Crear y editar servicio muestran el precio total sin cambiar el campo ni su valor', () => {
  for (const item of [undefined, { id_servicio: 1, id_categoria: 1, nombre: 'Servicio de prueba', precio: '450.50', estado: 'ACTIVO' }]) {
    const { ServiceCatalogManager: CatalogWithEditor } = loadComponent('../components/service-catalog-manager.tsx', {
      react: { ...React, useState: value => [value === null ? { kind: 'service', item } : value, () => {}], useActionState: () => [{}, () => {}, false] },
      '@/components/icons': new Proxy({}, { get: () => () => null }),
      '@/components/submission-result-dialog': { SubmissionResultDialog: () => null },
      '@/app/dashboard/servicios/actions': { saveService: () => {} },
    });
    const html = renderToStaticMarkup(React.createElement(CatalogWithEditor, { data, initialTab: 'services', canCreate: true, canEdit: true }));
    assert.match(html, /<span>Precio total del servicio \(Bs\) \*<\/span>/);
    assert.doesNotMatch(html, /Precio por sesión/);
    const input = html.match(/<input\b[^>]*name="precio"[^>]*>/)?.[0];
    assert.ok(input);
    assert.match(input, /type="number"/);
    assert.match(input, /min="0"/);
    assert.match(input, /step="0\.01"/);
    assert.ok(input.includes(`value="${item?.precio ?? 0}"`));
  }
});
