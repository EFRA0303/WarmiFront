import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function actions(file) {
  const calls = [], invalidations = [], compiledModule = { exports: {} };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: compiledModule.exports, module: compiledModule, Date, FormData, File,
    fetch: async (url, request) => { calls.push({ url, ...JSON.parse(request.body) }); return { ok: true }; },
    require: name => ({
      'node:crypto': { randomUUID: () => 'resultado' },
      'next/cache': { revalidatePath: path => invalidations.push(path) },
      '@/lib/auth': { getSessionToken: async () => 'fixture' },
      '@/lib/backend': { backendUrl: path => path, readApiMessage: async () => '' },
      '@/lib/configuration-access': {},
    })[name],
  });
  return { ...compiledModule.exports, calls, invalidations };
}
const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, String(value)); return data; };

test('La nota de productos conserva UUID, usa numeración automática y no envía adquisición', async () => {
  const a = actions('../app/dashboard/ventas/actions.ts');
  const data = form({ clave_operacion: 'uuid-estable', fecha_emision: '2026-10-30T10:00', detail_count: 1, item_0: 'PRODUCTO:4', cantidad_0: 2, precio_0: 50, id_adquisicion: 99 });
  assert.equal((await a.createSaleNote({}, data)).outcome, 'success');
  assert.equal(a.calls[0].clave_operacion, 'uuid-estable');
  assert.equal(a.calls[0].numero_nota, undefined);
  assert.equal(a.calls[0].id_adquisicion, undefined);
  assert.equal(a.calls[0].detalles[0].id_producto, 4);
  data.set('cantidad_0', '0.5');
  assert.ok((await a.createSaleNote({}, data)).fieldErrors.cantidad_0);
  data.set('item_0', 'SERVICIO:4');
  assert.ok((await a.createSaleNote({}, data)).fieldErrors.item_0);
});

test('Los pagos transmiten UUID y las anulaciones su motivo; entrega es una acción separada', async () => {
  const a = actions('../app/dashboard/ventas/actions.ts');
  await a.createPayment({}, form({ clave_operacion: 'uuid-pago', id_nota_venta: 2, monto: '10.10', fecha_pago: '2026-10-30T10:00', metodo_pago: 'QR' }));
  await a.cancelPayment(3, 'Error de registro');
  await a.cancelSaleNote(2, 'Error de selección');
  await a.deliverSaleProducts(2);
  assert.equal(a.calls[0].clave_operacion, 'uuid-pago');
  assert.equal(a.calls[1].motivo_anulacion, 'Error de registro');
  assert.equal(a.calls[2].motivo_anulacion, 'Error de selección');
  assert.equal(a.calls[3].url, '/ventas/notas/2/entregar');
  assert.ok(a.invalidations.includes('/dashboard/inventario'));
});

test('La adquisición directa envía servicio y UUID, pero nunca registra un pago implícito', async () => {
  const a = actions('../app/dashboard/operaciones/actions.ts');
  const result = await a.createAcquisition({}, form({ clave_operacion: 'uuid-compra', id_paciente: 1, offer: 'SERVICIO:4', fecha_adquisicion: '2026-10-30T10:00', service_count: 1, service_id_0: 4, sessions_0: 10, price_0: 15 }));
  assert.equal(result.outcome, 'success');
  assert.match(result.message, /primer abono/);
  assert.equal(a.calls.length, 1);
  assert.equal(a.calls[0].url, '/adquisiciones');
  assert.equal(a.calls[0].clave_operacion, 'uuid-compra');
  assert.equal(a.calls[0].id_paquete, undefined);
  assert.equal(a.calls[0].detalles[0].id_servicio, 4);
});

test('Los movimientos manuales exigen motivo y conservan la clave de operación', async () => {
  const a = actions('../app/dashboard/inventario/actions.ts');
  const data = form({ clave_operacion: 'uuid-stock', id_lote: 1, tipo: 'AJUSTE_ENTRADA', cantidad: 10, fecha_movimiento: '2026-10-30T10:00' });
  assert.ok((await a.createMovement({}, data)).fieldErrors.observaciones);
  data.set('observaciones', 'Conteo físico autorizado');
  assert.equal((await a.createMovement({}, data)).outcome, 'success');
  assert.equal(a.calls[0].clave_operacion, 'uuid-stock');
});
