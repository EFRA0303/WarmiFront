import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import next from 'next';
import { fixture } from './fixtures.mjs';

let activeFixture = fixture;

const port = Number(process.env.RESPONSIVE_PORT || 43002);
const apiPort = Number(process.env.RESPONSIVE_API_PORT || 43003);
// Solo este proceso usa la API ficticia. No se modifica .env.local.
process.env.BACKEND_URL = `http://127.0.0.1:${apiPort}`;

const api = http.createServer((request, response) => {
  if (request.method !== 'GET') { response.writeHead(405).end(); return; }
  try {
    const data = activeFixture(new URL(request.url, `http://127.0.0.1:${apiPort}`));
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
  } catch (error) {
    console.error(error.message);
    response.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: error.message }));
  }
});

async function main() {
  await new Promise(resolve => api.listen(apiPort, '127.0.0.1', resolve));
  // Next/webpack en Windows necesita que el workspace y las dependencias
  // esten en la misma unidad. .next ya esta excluido de Git y del dev real.
  const temporaryRoot = path.join(process.cwd(), '.next', 'visual-workspaces');
  await fs.mkdir(temporaryRoot, { recursive: true });
  const workspace = process.env.RESPONSIVE_WORKSPACE || await fs.mkdtemp(path.join(temporaryRoot, 'warmi-visual-'));
  const changed = async (source, destination) => {
    if ((await fs.stat(source)).isDirectory()) return true;
    try { return !(await fs.readFile(source)).equals(await fs.readFile(destination)); }
    catch (error) { if (error.code === 'ENOENT') return true; throw error; }
  };
  const sync = async () => {
    for (const directory of ['app', 'components', 'lib', 'public']) await fs.cp(path.join(process.cwd(), directory), path.join(workspace, directory), { recursive: true, filter: changed });
    for (const file of ['package.json', 'tsconfig.json', 'postcss.config.mjs']) {
      const source = path.join(process.cwd(), file);
      const destination = path.join(workspace, file);
      if (await changed(source, destination)) await fs.copyFile(source, destination);
    }
  };
  await sync();
  try {
    await fs.symlink(path.join(process.cwd(), 'node_modules'), path.join(workspace, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const app = next({ dev: true, webpack: true, dir: workspace, hostname: '127.0.0.1', port, conf: {
    devIndicators: false,
  } });
  await app.prepare();
  const handler = app.getRequestHandler();
  const server = http.createServer(async (request, response) => {
    // Las acciones de lectura pueden cargar formularios; la API ficticia
    // rechaza TODAS las escrituras, incluso si se enviara un formulario.
    if (!['GET', 'POST'].includes(request.method)) { response.writeHead(405).end(); return; }
    if (request.url === '/__responsive_ready') { response.writeHead(200).end('ready'); return; }
    if (request.url === '/__responsive_sync') {
      await sync();
      activeFixture = (await import(`./fixtures.mjs?revision=${Date.now()}`)).fixture;
      response.writeHead(200).end('synced');
      return;
    }
    handler(request, response);
  });
  server.listen(port, '127.0.0.1', () => console.log(`RESPONSIVE_READY http://127.0.0.1:${port}`));
  const close = async () => { server.close(); api.close(); await app.close(); process.exit(0); };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

main().catch(error => { console.error(error); process.exit(1); });
