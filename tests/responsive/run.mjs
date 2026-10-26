import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// El navegador se inicia por separado con un perfil exclusivo de pruebas.
// Este lanzador administra el servidor ficticio y espera su señal de inicio.
const server = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], { stdio: ['ignore', 'pipe', 'inherit'] });
server.stdout.pipe(process.stdout);
let audit;

try {
  await new Promise((resolve, reject) => {
    let buffer = '';
    const timeout = setTimeout(() => reject(new Error('No inició el servidor visual en 120 segundos')), 120000);
    server.on('error', reject);
    server.on('exit', code => { clearTimeout(timeout); reject(new Error(`El servidor visual terminó: ${code}`)); });
    server.stdout.on('data', chunk => {
      buffer = (buffer + chunk).slice(-2000);
      if (buffer.includes('RESPONSIVE_READY')) { clearTimeout(timeout); resolve(); }
    });
  });
  audit = spawn(process.execPath, [fileURLToPath(new URL('./audit.mjs', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exitCode = await new Promise((resolve, reject) => { audit.on('error', reject); audit.on('exit', code => resolve(code ?? 1)); });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  audit?.kill();
  server.kill();
}
