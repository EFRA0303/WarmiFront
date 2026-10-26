# Pruebas visuales de responsividad

Estas pruebas abren las páginas reales de Next.js con una **API ficticia local**.
No necesitan credenciales, no leen `.env.local` ni consultan el backend real.
La API de prueba rechaza todas las escrituras. No se envían formularios.

## Alcance

- Todas las rutas de `app/dashboard/**/page.tsx`, incluido el detalle de historial.
- Pestañas de catálogo/disponibilidad y vistas de día/semana/mes de la agenda.
- Tamaños: 1366 × 600, 1366 × 768, 1280 × 600, 1024 × 640, 768 × 900,
  390 × 844 y 1920 × 1080.
- Desbordamiento horizontal de página y contención de tablas.
- Apertura/cierre de formularios de creación y edición disponibles en los datos
  ficticios, límites de las ventanas y acceso a sus controles por desplazamiento.

No sustituyen las pruebas funcionales, de permisos o con datos reales. Los
estados que no se abren con los fixtures necesitan una revisión adicional.

La auditoría verifica distribución y accesibilidad por desplazamiento, no la
ausencia de todos los errores de consola. Se observó un aviso previo de
hidratación en `user-status-action.tsx`: Node y Chrome usan espacios distintos
al formatear `a. m.`/`p. m.` con `Intl`. Ese formateo no se modificó en esta tarea.

## Ejecución en Windows

Requiere Node.js 22 o superior, dependencias instaladas y Chrome o Edge.
Ejecutar desde `frontend-warmi/`.

1. En una terminal, iniciar el entorno aislado y esperar `RESPONSIVE_READY`:

   ```powershell
   node tests/responsive/server.mjs
   ```

   Usa los puertos locales 43002 (frontend) y 43003 (API ficticia). La copia de
   código y sus archivos generados quedan en `.next/visual-workspaces/`, fuera
   del control de versiones. No interrumpe el sistema de los puertos 3000/3001.

2. En otra terminal, abrir un navegador de pruebas con un perfil independiente:

   ```powershell
   $profile = Join-Path $env:LOCALAPPDATA 'Temp\opencode\warmi-responsive-browser'
   Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--headless=new', '--remote-debugging-port=9222', "--user-data-dir=$profile", '--no-first-run', 'about:blank'
   ```

   No usar el perfil personal ni iniciar sesión con cuentas reales.

3. Ejecutar la auditoría:

   ```powershell
   node tests/responsive/audit.mjs
   # Revisión abreviada de siete pantallas:
   node tests/responsive/audit.mjs --quick
   ```

   El código de salida es distinto de cero si falla una comprobación.
   Las capturas e informe JSON se guardan en
   `%LOCALAPPDATA%\Temp\opencode\warmi-responsive-results\`.

4. Al terminar, detener el servidor de pruebas con `Ctrl+C` y cerrar únicamente
   el navegador del perfil de pruebas.

Como alternativa al servidor manual, después de abrir el navegador de pruebas
se puede ejecutar `node tests/responsive/run.mjs`. Este comando inicia su propio
servidor aislado, espera a que esté listo, ejecuta la auditoría y lo detiene.
No debe usarse mientras ya esté ocupado el puerto 43002 por otro servidor de pruebas.

Para revisar solo una pantalla: `node tests/responsive/run.mjs --route=/dashboard/agenda`.

Variables opcionales: `RESPONSIVE_PORT`, `RESPONSIVE_API_PORT`,
`RESPONSIVE_BASE_URL`, `BROWSER_DEBUG_URL` y `RESPONSIVE_OUTPUT`.

## Organización de estilos

`components/dashboard-shell.css` define la estructura y
`components/dashboard-responsive.css` los ajustes compartidos del área interna.
Las reglas usan `.app-shell` para no alterar el login y consultas de contenedor
para medir el espacio que queda después del menú lateral. No se usa zoom ni se
ocultan columnas o acciones para hacerlas caber.

Los formularios largos y las tablas pueden necesitar desplazamiento: el
objetivo es mantener toda su información accesible, no forzar una pantalla
completa dentro de 600 píxeles.
