import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

function load(path, mocks = {}) {
  const compiled = { exports: {} };
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const dependencies = { react: React, 'react/jsx-runtime': jsxRuntime, 'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) }, ...mocks };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module: compiled, exports: compiled.exports, URLSearchParams, require(name) {
    if (name.endsWith('.css')) return {};
    if (name in dependencies) return dependencies[name];
    throw new Error(`Dependencia sin simular: ${name}`);
  } });
  return compiled.exports;
}
const helpers = load('../lib/patient-care.ts');
const careComponents = load('../components/patient-care-navigation.tsx', { '@/lib/patient-care': helpers });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('El contexto clínico solo acepta IDs enteros positivos y compone enlaces escapados', () => {
  for (const value of [undefined, '', '0', '-1', '1.2', 'texto', '1e3', '2147483648', '9007199254740992']) assert.equal(helpers.careId(value), undefined);
  assert.equal(helpers.careId(['7', '9']), 7);
  assert.equal(helpers.careHref('/dashboard/sesiones', { id_paciente: 2, id_tratamiento: 7 }, { search: 'Ana & Luz', page: 2 }), '/dashboard/sesiones?id_paciente=2&id_tratamiento=7&search=Ana+%26+Luz&page=2');
});

test('La entrada elige una pantalla autorizada sin conceder permisos nuevos', () => {
  assert.equal(helpers.careEntryPath(['tratamientos.leer']), '/dashboard/tratamientos');
  assert.equal(helpers.careEntryPath(['clinica.leer']), '/dashboard/sesiones');
  assert.equal(helpers.careEntryPath(['catalogo.leer']), null);
});

test('La entrada redirige según permisos y solo conserva un contexto de paciente válido', async () => {
  for (const [permissions, expected] of [[['tratamientos.leer'], '/dashboard/tratamientos?id_paciente=2'], [['clinica.leer'], '/dashboard/sesiones?id_paciente=2'], [['catalogo.leer'], '/dashboard']]) {
    const { default: Entry } = load('../app/dashboard/atencion/page.tsx', {
      '@/lib/patient-care': helpers,
      '@/lib/auth': { getCurrentUser: async () => ({ permisos: permissions }) },
      'next/navigation': { redirect: path => { throw new Error(path); } },
    });
    await assert.rejects(Entry({ searchParams: Promise.resolve({ id_paciente: '2', id_tratamiento: '7', next: 'https://example.invalid' }) }), error => error.message === expected);
  }
});

test('Las pestañas conservan paciente y servicio y se filtran por permisos', () => {
  const html = render(careComponents.PatientCareNavigation, { active: 'sessions', permissions: ['clinica.leer'], context: { id_paciente: 2, id_tratamiento: 7, id_sesion: 3 } });
  assert.match(html, /href="\/dashboard\/sesiones\?id_paciente=2&amp;id_tratamiento=7" aria-current="page"/);
  assert.match(html, /href="\/dashboard\/valoraciones\?id_paciente=2&amp;id_tratamiento=7&amp;id_sesion=3"/);
  assert.doesNotMatch(html, /href="\/dashboard\/tratamientos|href="\/dashboard\/agenda|href="\/dashboard\/historiales/);
  const links = render(careComponents.PatientCareRecordLinks, { permissions: ['clinica.leer', 'historiales.leer'], patientId: 2, treatmentId: 7, historyId: 8 });
  assert.match(links, /\/dashboard\/historiales\/8/);
  assert.match(links, /Ver sesiones/);
});

test('La página de sesiones envía el contexto a la API y lo conserva en filtros y paginación', async () => {
  let received;
  const { default: Page } = load('../app/dashboard/sesiones/page.tsx', {
    '@/lib/patient-care': helpers, '@/components/patient-care-navigation': careComponents,
    'next/navigation': { redirect: path => { throw new Error(path); } },
    '@/components/icons': new Proxy({}, { get: () => () => null }),
    '@/components/directory-table-actions': { DirectoryTableActions: () => null },
    '@/components/dynamic-search-input': { DynamicSearchInput: () => null },
    '@/components/session-dialogs': { NewSessionDialog: () => null, SessionActions: () => null },
    '@/components/session-controls': { SessionStatusFilter: () => null },
    '@/lib/auth': { getCurrentUser: async () => ({ permisos: ['clinica.leer'] }) },
    '@/lib/sessions': { getSessions: async query => { received = query; return { ok: true, value: { data: [{ id_sesion: 3, id_tratamiento: 7, id_paciente: 2, paciente: 'Paciente', servicio: 'Servicio', estado: 'EN_CURSO', fecha_sesion: '2026-10-30T10:00:00-04:00', duracion_minutos: 60 }], total: 21, limit: 10 } }; }, getSessionOptions: async () => ({ ok: true, value: { appointments: [], treatments: [], staff: [] } }) },
  });
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ id_paciente: '2', id_tratamiento: '7', estado: 'EN_CURSO' }) }));
  assert.equal(received.id_paciente, 2);
  assert.equal(received.id_tratamiento, 7);
  assert.match(html, /name="id_paciente" value="2"/);
  assert.match(html, /name="id_tratamiento" value="7"/);
  assert.match(html, /id_paciente=2&amp;id_tratamiento=7&amp;estado=EN_CURSO&amp;page=2/);
});

test('La página de valoraciones filtra también por sesión y fija su origen de registro', async () => {
  let received;
  let dialogProps;
  const { default: Page } = load('../app/dashboard/valoraciones/page.tsx', {
    '@/lib/patient-care': helpers, '@/components/patient-care-navigation': careComponents,
    'next/navigation': { redirect: path => { throw new Error(path); } },
    '@/components/icons': new Proxy({}, { get: () => () => null }),
    '@/components/directory-table-actions': { DirectoryTableActions: () => null },
    '@/components/dynamic-search-input': { DynamicSearchInput: () => null },
    '@/components/valuation-controls': { ValuationTypeFilter: () => null },
    '@/components/valuation-dialogs': { NewValuationDialog: props => { dialogProps = props; return null; }, ValuationActions: () => null },
    '@/lib/auth': { getCurrentUser: async () => ({ permisos: ['clinica.leer', 'clinica.crear'] }) },
    '@/lib/valuations': { getValuations: async query => { received = query; return { ok: true, value: { data: [], total: 0, limit: 10 } }; }, getValuationOptions: async () => ({ ok: true, value: { patients: [], requests: [], treatments: [], sessions: [{ id_sesion: 3, id_tratamiento: 7, id_paciente: 2 }, { id_sesion: 4, id_tratamiento: 9, id_paciente: 8 }], staff: [] } }) },
  });
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ id_paciente: '2', id_tratamiento: '7', id_sesion: '3' }) }));
  assert.equal(received.id_sesion, 3);
  assert.equal(received.id_tratamiento, 7);
  assert.equal(dialogProps.defaultSource, 'session:3');
  assert.equal(dialogProps.options.sessions.length, 1);
  assert.match(html, /name="id_sesion" value="3"/);
});

test('Atender desde Agenda conserva cita, paciente y servicio y no exige permiso de edición de agenda', () => {
  const { AppointmentActions } = load('../components/agenda-dialogs.tsx', {
    react: { ...React, useState: value => [value, () => {}], useTransition: () => [false, () => {}] },
    'next/navigation': { useRouter: () => ({}) }, '@/lib/patient-care': helpers,
    '@/components/icons': new Proxy({}, { get: () => () => null }),
    '@/components/submission-result-dialog': { SubmissionResultDialog: () => null },
    '@/app/dashboard/agenda/actions': {},
  });
  const appointment = { id_cita: 3, id_paciente: 2, id_tratamiento: 7, estado: 'EN_ESPERA' };
  const tree = AppointmentActions({ appointment, options: {}, canEdit: false, canAttend: true });
  const html = renderToStaticMarkup(React.Children.toArray(tree.props.children)[0]);
  assert.match(html, /href="\/dashboard\/sesiones\?id_paciente=2&amp;id_tratamiento=7&amp;atender=3"/);
  assert.match(html, /Atender/);
  assert.doesNotMatch(html, /Editar cita|Cancelar|Atendida/);
  const blocked = AppointmentActions({ appointment, options: {}, canEdit: true, canAttend: false });
  assert.doesNotMatch(renderToStaticMarkup(React.Children.toArray(blocked.props.children)[0]), /Atender|Atendida/);
});

test('El formulario de inicio abre con la cita indicada sin volver a elegir al paciente', () => {
  const { NewSessionDialog } = load('../components/session-dialogs.tsx', {
    react: { ...React, useActionState: () => [{}, () => {}, false] },
    '@/components/icons': new Proxy({}, { get: () => () => null }),
    '@/components/submission-result-dialog': { SubmissionResultDialog: () => null },
    '@/app/dashboard/sesiones/actions': {},
  });
  const appointment = { id_cita: 3, id_tratamiento: 7, id_personal: 5, paciente: 'Paciente de prueba', servicio: 'Servicio de prueba', profesional: 'Profesional', fecha_hora_inicio: '2026-10-30T10:00:00-04:00' };
  const html = render(NewSessionDialog, { defaultAppointmentId: 3, options: { appointments: [appointment], treatments: [], staff: [] } });
  assert.match(html, /value="3" selected=""/);
  assert.match(html, /name="id_tratamiento" value="7"/);
  assert.match(html, /name="atendido_por" value="5"/);
  assert.match(html, /Paciente de prueba/);
});

test('El detalle de una cita diaria muestra Atender sin habilitar acciones administrativas', () => {
  const { AppointmentDetailDialog } = load('../components/agenda-dialogs.tsx', {
    'next/navigation': { useRouter: () => ({}) }, '@/lib/patient-care': helpers,
    '@/components/icons': new Proxy({}, { get: () => () => null }),
    '@/components/submission-result-dialog': { SubmissionResultDialog: () => null },
    '@/app/dashboard/agenda/actions': {},
  });
  const appointment = { id_cita: 3, id_paciente: 2, id_tratamiento: 7, numero_sesion: 1, estado: 'EN_ESPERA', fecha_hora_inicio: '2026-10-30T10:00:00-04:00', fecha_hora_fin: '2026-10-30T11:00:00-04:00', paciente: { persona: { nombre: 'Paciente', ap_paterno: 'Prueba' } }, personal: { usuario: { persona: { nombre: 'Profesional', ap_paterno: 'Prueba' } } }, tratamiento: { servicio: { nombre: 'Servicio de prueba' } } };
  const html = render(AppointmentDetailDialog, { appointment, options: {}, canEdit: false, canAttend: true, onClose: () => {} });
  assert.match(html, /Paciente Prueba/);
  assert.match(html, /En espera/);
  assert.match(html, /Atender/);
  assert.match(html, /id_paciente=2&amp;id_tratamiento=7&amp;atender=3/);
  assert.doesNotMatch(html, /Editar cita|Reprogramar cita/);
});
