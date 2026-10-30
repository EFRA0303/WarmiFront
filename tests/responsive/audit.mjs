import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const baseUrl = process.env.RESPONSIVE_BASE_URL || 'http://127.0.0.1:43002';
const debugUrl = process.env.BROWSER_DEBUG_URL || 'http://127.0.0.1:9222';
const output = process.env.RESPONSIVE_OUTPUT || path.join(process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'Temp', 'opencode') : os.tmpdir(), 'warmi-responsive-results');
const viewports = [[1366, 600], [1366, 768], [1280, 600], [1024, 640], [768, 900], [390, 844], [1920, 1080]];

async function routes() {
  const entries = await fs.readdir('app/dashboard', { recursive: true });
  const pages = entries.filter(file => path.basename(file) === 'page.tsx')
    .map(file => '/dashboard/' + path.dirname(file).replaceAll('\\', '/').replaceAll('[id]', '1'))
    .map(route => route.replace(/\/\.$/, ''));
  return [...pages, '/dashboard/agenda?vista=day', '/dashboard/agenda?vista=week', '/dashboard/servicios?tab=structure', '/dashboard/servicios?tab=measures', '/dashboard/servicios?tab=product-categories', '/dashboard/personal/disponibilidad?tab=extra', '/dashboard/personal/disponibilidad?tab=permissions'];
}

async function main() {
  const ready = await fetch(baseUrl + '/__responsive_ready');
  assert.equal(ready.status, 200, 'Inicia primero node tests/responsive/server.mjs');
  await fetch(baseUrl + '/__responsive_sync');
  await fs.mkdir(output, { recursive: true });
  const target = await fetch(debugUrl + '/json/new?about:blank', { method: 'PUT' }).then(response => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const events = new Map();
  const failures = [];
  const results = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (events.has(message.method)) {
      events.get(message.method)();
      events.delete(message.method);
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error(`Timeout: ${method}`)); }, 120000);
    pending.set(requestId, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const navigate = async url => {
    const loaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { events.delete('Page.loadEventFired'); reject(new Error(`No terminó de cargar ${url}`)); }, 120000);
      events.set('Page.loadEventFired', () => { clearTimeout(timeout); resolve(); });
    });
    await send('Page.navigate', { url });
    await loaded;
  };
  const resize = async (width, height) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  };
  const screenshot = async name => {
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await fs.writeFile(path.join(output, name + '.png'), Buffer.from(image.data, 'base64'));
  };
  const check = (condition, message) => { if (!condition) failures.push(message); };
  try {
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setCookie', { name: 'warmi_session', value: 'visual-fixture-only', url: baseUrl, httpOnly: true });
    const allRoutes = await routes();
    const requested = process.argv.filter(argument => argument.startsWith('--route=')).map(argument => argument.slice(8));
    const selected = requested.length ? requested : process.argv.includes('--quick') ? ['/dashboard', '/dashboard/agenda', '/dashboard/pacientes', '/dashboard/usuarios', '/dashboard/horarios-atencion', '/dashboard/empresa', '/dashboard/servicios'] : allRoutes;
    for (const route of selected) {
      await resize(1366, 600);
      await navigate(baseUrl + route);
      await evaluate(`new Promise((resolve, reject) => {
        let attempts = 0;
        const wait = () => {
          if (document.querySelector('.app-main') && document.readyState === 'complete') return setTimeout(resolve, 400);
          if (++attempts > 1000) return reject(new Error('No se cargó la pantalla: ' + location.href + ' ' + document.body?.innerText.slice(0, 300)));
          setTimeout(wait, 100);
        };
        wait();
      })`);
      for (const [width, height] of viewports) {
        await resize(width, height);
        const metrics = await evaluate(`(() => {
          window.scrollTo(0, 0);
          const main = document.querySelector('.app-main');
          const topbar = document.querySelector('.app-topbar').getBoundingClientRect();
          const visible = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
          const services = main.querySelector('.catalog-manager--listing');
          const structure = main.querySelector('.catalog-manager--structure');
          const rect = selector => {
            const element = (services || structure)?.querySelector(selector);
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right, centerY: box.top + box.height / 2, height: box.height };
          };
          return { pathname: location.pathname, width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth, topbarHeight: topbar.height,
            title: main.querySelector('h1,h2')?.textContent,
            error: /Application error|No fue posible|No pudimos conectar|No tienes permiso/.test(main.innerText),
            tables: [...main.querySelectorAll('table')].filter(visible).length,
            serviceControls: services ? { workspaceWidth: main.clientWidth, tabs: rect('.catalog-tabs'), measures: rect('.catalog-measures-shortcut'), measuresInTabs: [...services.querySelectorAll('.catalog-tabs button')].some(button => button.textContent.includes('Mediciones')), measuresActive: services.querySelector('.catalog-measures-shortcut')?.getAttribute('aria-current') === 'page', search: rect('.catalog-toolbar > label'), create: rect('.catalog-create-actions > button') } : null,
            structureControls: structure ? { workspaceWidth: main.clientWidth, tabs: rect('.catalog-tabs'), create: rect('.catalog-create-actions > button') } : null,
            overflow: [...main.querySelectorAll('*')].filter(visible).filter(el => {
              const box = el.getBoundingClientRect();
              if (box.right <= document.documentElement.clientWidth + 1) return false;
              for (let parent = el.parentElement; parent && parent !== main; parent = parent.parentElement) {
                if (['auto','scroll','hidden','clip'].includes(getComputedStyle(parent).overflowX)) return false;
              }
              return true;
            }).slice(0, 5).map(el => el.tagName + '.' + el.className) };
        })()`);
        check(metrics.scrollWidth <= metrics.clientWidth + 1, `${route} ${width}x${height}: desborde horizontal ${JSON.stringify(metrics)}`);
        check(!metrics.error, `${route}: no muestra los datos ficticios`);
        check(metrics.pathname === route.split('?')[0], `${route}: redirección inesperada a ${metrics.pathname}`);
        check(metrics.overflow.length === 0, `${route} ${width}x${height}: contenido recortado ${metrics.overflow.join(', ')}`);
        if (metrics.structureControls) {
          const { workspaceWidth, tabs, create } = metrics.structureControls;
          if (workspaceWidth > 620 && create) {
            check(Math.abs(tabs.centerY - create.centerY) <= 1, `${route} ${width}x${height}: Nueva área no está alineado con las pestañas`);
            check(tabs.right <= create.left + 1, `${route} ${width}x${height}: Nueva área debe estar a la derecha de las pestañas`);
          }
        }
        if (metrics.serviceControls) {
          const { workspaceWidth, tabs, measures, measuresInTabs, measuresActive, search, create } = metrics.serviceControls;
          check(Boolean(measures), `${route} ${width}x${height}: falta el botón independiente de Mediciones`);
          check(!measuresInTabs, `${route} ${width}x${height}: Mediciones no debe estar dentro del bloque de pestañas`);
          check(measuresActive === (route.includes('tab=measures')), `${route} ${width}x${height}: estado activo incorrecto de Mediciones`);
          if (workspaceWidth > 900) {
            check(Math.abs(tabs.centerY - search.centerY) <= 1, `${route} ${width}x${height}: pestañas y búsqueda no están alineadas`);
            check(tabs.right <= search.left + 1, `${route} ${width}x${height}: la búsqueda debe ir después de las pestañas`);
            if (measures) {
              check(Math.abs(tabs.centerY - measures.centerY) <= 1, `${route} ${width}x${height}: Mediciones no está alineado`);
              check(tabs.right <= measures.left + 1 && measures.right <= search.left + 1, `${route} ${width}x${height}: Mediciones debe estar entre las pestañas y la búsqueda`);
            }
            if (create) {
              check(Math.abs(search.centerY - create.centerY) <= 1, `${route} ${width}x${height}: el botón de alta no está alineado`);
              check(search.right <= create.left + 1, `${route} ${width}x${height}: el botón debe ir después de la búsqueda`);
            }
          }
          if (width <= 760) check(search.height >= 44 && search.height <= 50, `${route} ${width}x${height}: altura incorrecta de la búsqueda en móvil`);
        }
        results.push({ route, viewport: [width, height], ...metrics });
        if (width === 390) await screenshot(route.replaceAll(/[^a-z0-9]+/gi, '-') + '-mobile');
      }
      await resize(1366, 600);
      await screenshot(route.replaceAll(/[^a-z0-9]+/gi, '-'));
      if (route === '/dashboard') await evaluate(`document.querySelector('.account-menu__details').open = true`);
      // Solo abrir/cerrar ventanas; nunca enviar formularios ni confirmar operaciones.
      const buttons = await evaluate(`(() => {
        const candidates = [...document.querySelectorAll('.app-main button, .account-menu__dropdown button')].filter(button => {
          const text = button.getAttribute('title') || button.getAttribute('aria-label') || button.textContent;
          return button.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !button.disabled && !(button.form && button.type === 'submit')
            && (/nuev[oa]|crear|registrar|agregar|iniciar|ampliar|editar|configurar|permisos/i.test(text) || button.matches('.user-status-trigger') || button.closest('.account-menu__dropdown'))
            && !/guardar|eliminar|baja|reactivar/i.test(text);
        });
        const unique = new Set();
        return candidates.filter(button => {
          const key = button.getAttribute('title') || button.textContent.trim();
          if (unique.has(key)) return false;
          unique.add(key);
          return true;
        }).slice(0, 8).map((button, i) => { button.dataset.responsiveTest = String(i); return { id: i, label: button.getAttribute('title') || button.textContent.trim() }; });
      })()`);
      for (const button of buttons) {
        await evaluate(`(() => {
          const button = document.querySelector('[data-responsive-test="${button.id}"]');
          if (button?.closest('.account-menu__dropdown')) document.querySelector('.account-menu__details').open = true;
          button?.click();
        })()`);
        await evaluate('new Promise(resolve => setTimeout(resolve, 300))');
        const opened = await evaluate(`!!document.querySelector('dialog[open]')`);
        if (!opened) {
          for (const [width, height] of viewports) {
            await resize(width, height);
            const fits = await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1');
            check(fits, `${route}: ${button.label} ${width}x${height}: formulario en página desbordado`);
          }
          await resize(1366, 600);
          await screenshot(route.replaceAll(/[^a-z0-9]+/gi, '-') + '-inline-' + button.id);
          continue;
        }
        await evaluate(`new Promise(resolve => {
          let attempts = 0;
          const wait = () => !document.querySelector('dialog[open] .user-registration-spinner, dialog[open] .permission-dialog__loading') || ++attempts > 200
            ? resolve() : setTimeout(wait, 100);
          wait();
        })`);
        for (const [width, height] of [[1366, 600], [390, 640]]) {
          await resize(width, height);
          const metrics = await evaluate(`(() => {
            const dialog = document.querySelector('dialog[open]');
            const box = dialog.getBoundingClientRect();
            const fields = [...dialog.querySelectorAll('input,select,textarea')].filter(el => el.getClientRects().length && getComputedStyle(el).opacity !== '0');
            const last = fields.at(-1);
            last?.scrollIntoView({ block: 'center' });
            const lastBox = last?.getBoundingClientRect();
            const close = dialog.querySelector('button[aria-label="Cerrar"]');
            close?.scrollIntoView({ block: 'nearest' });
            const closeBox = close?.getBoundingClientRect();
            return { top: box.top, bottom: box.bottom, left: box.left, right: box.right,
              dataError: /Falta un fixture|No fue posible cargar|No pudimos conectar/.test(dialog.innerText),
              lastAccessible: !lastBox || lastBox.top >= 0 && lastBox.bottom <= innerHeight,
              closeAccessible: !closeBox || closeBox.top >= 0 && closeBox.bottom <= innerHeight,
              contentOverflow: dialog.scrollWidth > dialog.clientWidth + 1,
              horizontalOverflow: [...dialog.querySelectorAll('*')].some(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && !['auto','scroll','hidden'].includes(getComputedStyle(el).overflowX) && ['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) };
          })()`);
          const label = `${route}: ${button.label} ${width}x${height}`;
          check(metrics.top >= 0 && metrics.bottom <= height + 1 && metrics.left >= 0 && metrics.right <= width + 1, `${label}: ventana fuera de pantalla ${JSON.stringify(metrics)}`);
          check(metrics.lastAccessible && metrics.closeAccessible, `${label}: controles inaccesibles ${JSON.stringify(metrics)}`);
          check(!metrics.contentOverflow, `${label}: contenido mas ancho que la ventana`);
          check(!metrics.dataError, `${label}: no se cargaron los datos ficticios del formulario`);
          results.push({ dialog: label, ...metrics });
        }
        await resize(1366, 600);
        await screenshot(route.replaceAll(/[^a-z0-9]+/gi, '-') + '-dialog-' + button.id);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
        await evaluate(`document.querySelector('dialog[open] button[aria-label="Cerrar"]')?.click()`);
      }
      console.log(`Revisado ${route}: ${viewports.length} tamaños, ${buttons.length} botones de apertura`);
    }
    console.log(`Resultado: ${results.length} comprobaciones, ${failures.length} fallos. Capturas e informe: ${output}`);
    for (const failure of failures) console.error(failure);
    if (failures.length) process.exitCode = 1;
  } catch (error) {
    failures.push(error.message);
    throw error;
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ failures, results }, null, 2));
    socket.close();
    await fetch(debugUrl + '/json/close/' + target.id);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
