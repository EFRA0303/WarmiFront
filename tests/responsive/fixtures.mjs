// Datos ficticios: estas pruebas nunca consultan la API ni la base real.
const now = new Date().toISOString();
const person = { id_persona: 1, nombre: 'Usuario', ap_paterno: 'De Prueba', ap_materno: 'Responsiva', ci: 'PRUEBA-001', fecha_nac: '1990-01-01', genero: 'FEMENINO', telefono1: '+59170000000', telefono2: null, direccion: 'Dirección de prueba' };
const role = { id_rol: 1, nombre: 'ROOT', descripcion: 'Rol ficticio de pruebas visuales', estado: 'ACTIVO' };
const domains = ['agenda', 'personas', 'pacientes', 'historiales', 'clinica', 'tratamientos', 'personal', 'disponibilidad', 'comercial', 'adquisiciones', 'ventas', 'inventario', 'usuarios', 'roles', 'permisos', 'empresa', 'catalogo', 'auditoria', 'accesos-usuario', 'configuracion-auditoria'];
const permissions = [...domains.flatMap(domain => ['leer', 'crear', 'actualizar', 'editar', 'eliminar'].map(action => `${domain}.${action}`)), 'roles.asignar', 'permisos.asignar'];
const user = { id_usuario: 1, id_persona: 1, id_rol: 1, correo_acceso: 'prueba@example.invalid', nombre_usuario: 'prueba_visual', foto_perfil_ruta: null, estado: 'ACTIVO', ultimo_acceso_en: now, ultima_actividad_en: now, ultima_desconexion_en: null, en_linea: true, permisos: permissions, persona: person, rol: role, creador: null, intentos_fallidos: 0, bloqueado_hasta: null, motivo_estado: null, created_at: now, updated_at: now };
const patient = { id_paciente: 1, id_persona: 1, ocupacion: 'Dato de prueba', estado: 'ACTIVO', motivo_baja: null, created_at: now, updated_at: now, persona: person, historial: { id_historial: 1, estado: 'ACTIVO', fecha_apertura: now, observaciones_generales: 'Observación ficticia' } };
const staff = { ...person, id_personal: 1, id_usuario: 1, foto_perfil_ruta: null, profesion: 'Fisioterapia', cargo: 'Profesional de prueba', color_agenda: '#0d9488', estado: 'ACTIVO' };
const schedule = { id_horario: 1, id_personal: 1, dia_semana: 'LUNES', hora_inicio: '08:00', hora_fin: '18:00', motivo_pausa_anterior: null, estado: true };
const businessHours = { intervalo_minutos: 30, horarios_semanales: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map((dia_semana, i) => ({ ...schedule, id_horario_atencion: i + 1, dia_semana })), excepciones: [{ id_excepcion_horario: 1, fecha: '2026-12-24', tipo: 'HORARIO_ESPECIAL', motivo: 'Horario ficticio de prueba', tramos: [{ hora_inicio: '08:00', hora_fin: '12:00' }] }], feriados: [{ id_feriado: 1, tipo: 'FIJO', nombre: 'Feriado fijo de prueba', mes: 1, dia: 1, fecha: null }, { id_feriado: 2, tipo: 'DINAMICO', nombre: 'Feriado dinámico de prueba', mes: null, dia: null, fecha: '2026-12-01' }] };
const area = { id_area: 1, nombre: 'Área de prueba', descripcion: 'Descripción para revisar la distribución', estado: 'ACTIVO' };
const category = { id_categoria: 1, id_area: 1, nombre: 'Categoría de prueba', descripcion: 'Descripción de prueba', estado: 'ACTIVO', area };
const measure = { id_tipo_medida: 1, nombre: 'Medida de prueba', unidad: 'cm', estado: 'ACTIVO' };
const service = { id_servicio: 1, id_categoria: 1, nombre: 'Servicio de prueba con nombre descriptivo', descripcion: 'Texto de prueba para comprobar el espacio disponible', duracion_minutos: 60, precio: '150.00', requiere_valoracion: true, estado: 'ACTIVO', categoria: category, medidas: [{ id_servicio: 1, id_tipo_medida: 1, obligatorio: true, tipoMedida: measure }] };
const productCategory = { id_categoria_producto: 1, nombre: 'Categoría de productos de prueba', descripcion: 'Descripción ficticia', estado: 'ACTIVO' };
const product = { id_producto: 1, id_categoria_producto: 1, categoria_producto: productCategory.nombre, nombre: 'Producto de prueba', marca: 'Marca de prueba', sku: 'PRUEBA-001', codigo_barras: null, descripcion: 'Descripción ficticia', unidad_medida: 'ml', presentacion: 'Frasco', contenido_presentacion: 100, precio_venta: 50, imagen_url: null, es_insumo: true, es_vendible: true, stock_minimo: 5, estado: 'ACTIVO', lotes: 1, stock_actual: 80 };
const lot = { id_lote: 1, id_producto: 1, numero_lote: 'LOTE-PRUEBA', cantidad_inicial: 100, fecha_ingreso: now.slice(0, 10), fecha_vencimiento: '2027-12-31', costo_unitario: 20, estado: 'DISPONIBLE', producto: product.nombre, unidad_medida: 'ml', stock_actual: 80 };
const clinical = { id_historial: 1, id_paciente: 1, paciente: 'Paciente De Prueba Responsiva', ci: person.ci, id_servicio: 1, servicio: service.nombre, duracion_minutos: 60, profesional: 'Profesional De Prueba', color_agenda: '#0d9488', observaciones: 'Observación ficticia para revisar los textos', fecha_inicio: now };
const treatment = { ...clinical, id_tratamiento: 1, indicado_por: 1, requiere_valoracion: true, id_detalle_adquisicion: null, sesiones_iniciales: 10, sesiones_agregadas: 0, sesiones_realizadas: 2, sesiones_disponibles: 8, citas_pendientes: 1, estado: 'EN_CURSO' };
const request = { ...clinical, id_solicitud: 1, fecha_solicitud: now, motivo: 'Motivo ficticio de prueba', estado: 'PENDIENTE', requiere_valoracion: true, categoria: category.nombre, area: area.nombre, valoraciones: 1, ultima_valoracion: now };
const session = { ...clinical, id_sesion: 1, id_tratamiento: 1, id_cita: 1, atendido_por: 1, fecha_sesion: now, finalizada_en: null, estado: 'EN_CURSO', numero_sesion: 3, cita_inicio: now, cita_fin: now };
const valuation = { ...clinical, id_valoracion: 1, id_solicitud: 1, id_tratamiento: null, id_sesion: null, id_personal: 1, tipo: 'INICIAL', fecha_valoracion: now, origen: 'SOLICITUD', medidas: [{ ...measure, valor: 70 }] };
const appointment = { id_cita: 1, id_paciente: 1, id_personal: 1, id_tratamiento: 1, numero_sesion: 3, fecha_hora_inicio: now, fecha_hora_fin: new Date(Date.now() + 3600000).toISOString(), fecha_llegada: null, estado: 'PROGRAMADA', observaciones: 'Observación ficticia', paciente: patient, personal: { ...staff, usuario: user }, tratamiento: { ...treatment, servicio: service } };
const history = { ...person, id_historial: 1, id_paciente: 1, id_usuario: 1, correo_acceso: user.correo_acceso, foto_perfil_ruta: null, fecha_apertura: now, estado: 'ACTIVO', observaciones_generales: 'Observaciones de prueba', ocupacion: 'Dato ficticio', estado_paciente: 'ACTIVO', solicitudes: 1, tratamientos: 1, valoraciones: 1, sesiones_finalizadas: 2, ultima_actividad: now };
const packageService = { id_servicio: 1, servicio: service.nombre, sesiones_incluidas: 10, duracion_minutos: 60, categoria: category.nombre, area: area.nombre };
const commercialPackage = { id_paquete: 1, nombre: 'Paquete de prueba', descripcion: 'Descripción ficticia', precio: 1200, estado: 'ACTIVO', servicios: [packageService], adquisiciones: 1 };
const acquisition = { ...clinical, id_adquisicion: 1, id_paquete: 1, id_promocion: null, fecha_adquisicion: now, precio_original: 1500, descuento: 300, total: 1200, estado: 'ACTIVA', origen: 'PAQUETE', sesiones_incluidas: 10, sesiones_asignadas: 10, sesiones_realizadas: 2, detalles: [{ ...packageService, id_detalle_adquisicion: 1, precio_unitario: 120, subtotal: 1200 }] };
const note = { ...clinical, id_nota_venta: 1, id_adquisicion: 1, numero_nota: 'NV-PRUEBA-001', fecha_emision: now, subtotal: 1500, descuento: 300, total: 1200, estado: 'EMITIDA', emitido_por_nombre: 'Usuario De Prueba', detalles: 1, pagado: 600, saldo: 600 };
const company = { id_empresa: 1, nombre_comercial: 'WARMI SPA', razon_social: 'Empresa ficticia de pruebas', nit: 'PRUEBA-001', actividad_economica: 'Bienestar', telefono1: person.telefono1, telefono2: null, correo: 'prueba@example.invalid', direccion: 'Dirección ficticia para pruebas visuales', sitio_web: 'https://example.invalid', logo_url: null, moneda: 'BOB', eslogan_principal: 'Cuida de ti, por dentro y por fuera.', titulo_login: 'Warmi SPA', descripcion_corta: 'Pruebas visuales sin datos reales', imagen_fondo_login_url: null, imagen_fondo_panel_login_url: null };
const permissionItems = permissions.map((permiso, index) => ({ id_permiso: index + 1, permiso, descripcion: `Permiso de prueba: ${permiso}`, estado: 'ACTIVO' }));
const options = { patients: [{ ...person, id_paciente: 1, id_historial: 1 }], staff: [staff], services: [{ ...service, categoria: category.nombre, area: area.nombre }], treatments: [treatment], appointments: [{ ...clinical, ...appointment, paciente: clinical.paciente }], requests: [request], sessions: [session], acquisitions: [], offers: [], items: [{ id: 1, nombre: service.nombre, tipo: 'SERVICIO', precio: 150 }], notes: [note], products: [product], lots: [lot], productCategories: [productCategory], saleDetails: [], measureTypes: [measure], serviceMeasures: [{ id_servicio: 1, id_tipo_medida: 1, obligatorio: true }], staffSchedules: [schedule], staffExtraHours: [], staffPermissions: [], businessHours };
const records = {
  '/pacientes': patient,
  '/personal': { ...staff, usuario: user, fecha_ingreso: '2025-01-01', created_at: now, updated_at: now, motivo_baja: null },
  '/usuarios': { ...user, id_rol: 2, rol: { ...role, id_rol: 2, nombre: 'FISIOTERAPEUTA' } },
  '/roles': { ...role, id_rol: 2, nombre: 'FISIOTERAPEUTA' },
  '/permisos': permissionItems[0],
  '/historiales': history,
  '/clinica/solicitudes': request,
  '/clinica/tratamientos': treatment,
  '/clinica/sesiones': session,
  '/clinica/valoraciones': valuation,
  '/agenda/citas': appointment,
  '/catalogo/areas': area,
  '/catalogo/categorias': category,
  '/catalogo/servicios': service,
  '/catalogo/tipos-medida': measure,
  '/catalogo/categorias-producto': productCategory,
  '/comercial/paquetes': commercialPackage,
  '/comercial/promociones': { ...commercialPackage, id_promocion: 1, tipo_descuento: 'PORCENTAJE', valor_descuento: 20, fecha_inicio: now, fecha_fin: '2027-01-01', estado: 'ACTIVA' },
  '/adquisiciones': acquisition,
  '/ventas/notas': note,
  '/ventas/pagos': { ...clinical, id_pago: 1, id_nota_venta: 1, monto: 600, metodo_pago: 'EFECTIVO', fecha_pago: now, estado: 'REGISTRADO', numero_nota: note.numero_nota, total_nota: 1200, registrado_por_nombre: 'Usuario De Prueba' },
  '/inventario/productos': product,
  '/inventario/lotes': lot,
  '/inventario/movimientos': { ...lot, id_movimiento: 1, tipo: 'ENTRADA_COMPRA', cantidad: 100, fecha_movimiento: now, observaciones: 'Movimiento ficticio', registrado_por_nombre: 'Usuario De Prueba' },
  '/inventario/consumos-sesion': { ...lot, id_consumo: 1, id_sesion: 1, cantidad: 2, registrado_en: now, fecha_movimiento: now, observaciones: 'Consumo ficticio', referencia: 'Sesión de prueba' },
  '/inventario/salidas-venta': { ...lot, id_salida: 1, id_detalle: 1, cantidad: 2, fecha_movimiento: now, observaciones: 'Salida ficticia', referencia: note.numero_nota },
  '/empresa': company,
  '/empresa/configuraciones-documentos/listar': { id_configuracion: 1, id_empresa: 1, encabezado: 'Encabezado ficticio', pie_pagina: 'Pie ficticio', mostrar_logo: true, mostrar_direccion: true, mostrar_telefono: true, mostrar_correo: true },
  '/auditoria': { id_auditoria: '1', id_usuario_accion: 1, id_usuario_afectado: null, accion: 'CONSULTA', entidad: 'prueba', id_registro: '1', descripcion: 'Evento ficticio', ip: '127.0.0.1', user_agent: 'Navegador de prueba', fecha: now, usuario_accion: 'Usuario De Prueba', usuario_afectado: '' },
  '/accesos-usuario': { id_acceso: '1', id_usuario: 1, identificador_intento: user.correo_acceso, fecha_login: now, fecha_logout: null, login_exitoso: true, motivo_fallo: null, ip: '127.0.0.1', user_agent: 'Navegador de prueba', usuario: user },
  '/configuracion-auditoria': { id_configuracion: 1, codigo_evento: 'PRUEBA', nombre: 'Evento de prueba', descripcion: 'Descripción ficticia', categoria: 'SEGURIDAD', habilitado: true, es_obligatorio: false, created_at: now, updated_at: now },
  '/agenda/notificaciones': { ...clinical, id_notificacion: 1, id_cita: 1, tipo: 'RECORDATORIO', canal: 'EMAIL', programada_para: now, enviada_en: null, estado: 'PENDIENTE', fecha_hora_inicio: now },
  '/disponibilidad/horarios': schedule,
  '/disponibilidad/horarios-extras': { ...schedule, id_horario_extra: 1, fecha: now.slice(0, 10), autorizado_por: 1, motivo: 'Prueba visual', estado: 'AUTORIZADO' },
  '/disponibilidad/permisos': { id_permiso: 1, id_personal: 1, fecha_hora_inicio: now, fecha_hora_fin: now, motivo: 'Prueba visual', estado: true },
};

function fixture(url) {
  const pathname = url.pathname;
  if (pathname === '/auth/me') return user;
  if (pathname === '/empresa/identidad-publica') return { nombre_comercial: company.nombre_comercial, eslogan_principal: company.eslogan_principal, titulo_login: company.titulo_login, descripcion_corta: company.descripcion_corta };
  if (pathname === '/empresa/horario-atencion') return businessHours;
  if (pathname === '/empresa/monedas/listar') return [{ code: 'BOB', name: 'Boliviano', countries: 'Bolivia' }];
  if (pathname === '/disponibilidad/opciones') return [staff];
  if (pathname === '/historiales/pacientes-disponibles') return options.patients;
  if (pathname === '/historiales/opciones') return options.patients;
  if (pathname === '/historiales/1/resumen') return { history, requests: [request], treatments: [treatment], sessions: [session], valuations: [valuation], appointments: [{ ...appointment, servicio: service.nombre, profesional: clinical.profesional }] };
  if (pathname === '/agenda/notificaciones-opciones/listar') return [{ ...appointment, paciente: clinical.paciente, servicio: service.nombre }];
  if (pathname.includes('opciones')) return options;
  if (pathname === '/usuarios/presencia') return [{ id_usuario: 1, en_linea: true, ultima_actividad_en: now }];
  if (/^\/roles\/\d+\/permisos$/.test(pathname)) return permissionItems.map(permiso => ({ id_rol: Number(pathname.split('/')[2]), id_permiso: permiso.id_permiso, permiso }));
  if (/^\/usuarios\/\d+\/permisos$/.test(pathname)) return [];
  if (/^\/permisos\/usuarios\/\d+$/.test(pathname)) return [];
  if (pathname === '/permisos') return { data: permissionItems, total: permissionItems.length, page: 1, limit: 100 };
  const record = records[pathname];
  if (!record) throw new Error(`Falta un fixture para ${pathname}`);
  const single = ['/roles', '/empresa', '/configuracion-auditoria', '/empresa/configuraciones-documentos/listar'].includes(pathname);
  const data = Array.from({ length: single ? 1 : 8 }, (_, index) => {
    const copy = structuredClone(record);
    for (const key of Object.keys(copy)) {
      if (/^id_/.test(key) && copy[key] === 1) copy[key] = index + 1;
      if (/^id_/.test(key) && copy[key] === '1') copy[key] = String(index + 1);
    }
    return copy;
  });
  return { data, total: data.length, page: 1, limit: Number(url.searchParams.get('limit')) || 10 };
}

export { fixture };
