export type LoginState = {
  message?: string;
  fieldErrors?: {
    correo_acceso?: string;
    contrasena?: string;
  };
};

export type PasswordResetState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type AccountActionState = {
  resultId?: string;
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type AuthResponse = {
  access_token: string;
  token_type: "Bearer" | string;
  expires_in: number;
};

export type CurrentUser = {
  id_usuario: number;
  correo_acceso: string;
  nombre_usuario: string | null;
  foto_perfil_ruta: string | null;
  estado: string;
  ultimo_acceso_en: string | null;
  permisos: string[];
  persona: {
    id_persona: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    ci: string | null;
    fecha_nac: string | null;
    genero: Gender;
    telefono1: string;
    telefono2: string | null;
    direccion: string | null;
  };
  rol: {
    id_rol: number;
    nombre: string;
    descripcion: string | null;
  };
};

export type UserStatus = "ACTIVO" | "BAJA" | "BLOQUEADO";
export type UserType = "PACIENTE" | "PERSONAL";
export type GeneralStatus = "ACTIVO" | "BAJA";
export type Gender = "FEMENINO" | "MASCULINO";

export type PersonSummary = {
  id_persona: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  ci: string | null;
  fecha_nac: string | null;
  genero: Gender;
  telefono1: string;
  telefono2: string | null;
  direccion: string | null;
  usuario?: {
    id_usuario: number;
    estado: UserStatus;
    correo_acceso: string;
    foto_perfil_ruta: string | null;
  } | null;
};

export type PatientListItem = {
  id_paciente: number;
  id_persona: number;
  ocupacion: string | null;
  estado: GeneralStatus;
  motivo_baja: string | null;
  created_at: string;
  updated_at: string;
  persona: PersonSummary;
  historial?: {
    id_historial: number;
    id_paciente: number;
    fecha_apertura: string;
    estado: "ACTIVO" | "CERRADO";
    observaciones_generales: string | null;
  } | null;
};

export type StaffListItem = {
  id_personal: number;
  id_usuario: number;
  profesion: string;
  cargo: string;
  fecha_ingreso: string;
  color_agenda: string;
  estado: GeneralStatus;
  motivo_baja: string | null;
  created_at: string;
  updated_at: string;
  usuario: {
    id_usuario: number;
    correo_acceso: string;
    nombre_usuario: string | null;
    foto_perfil_ruta: string | null;
    persona: PersonSummary;
    rol: {
      id_rol: number;
      nombre: string;
      descripcion: string | null;
      estado: GeneralStatus;
    };
  };
};

export type RoleListItem = {
  id_rol: number;
  nombre: string;
  descripcion: string | null;
  estado: GeneralStatus;
};

export type PermissionListItem = {
  id_permiso: number;
  permiso: string;
  descripcion: string | null;
  estado: GeneralStatus;
};

export type RolePermissionAssignment = {
  id_rol: number;
  id_permiso: number;
  permiso: PermissionListItem;
};

export type UserPermissionAssignment = {
  id_usuario: number;
  id_permiso: number;
  permitido: boolean;
  permiso: PermissionListItem;
};

export type RoleWithPermissions = RoleListItem & {
  permissionIds: number[];
};

export type UserPermissionContext = {
  permissions: PermissionListItem[];
  rolePermissionIds: number[];
  exceptions: UserPermissionAssignment[];
};

export type RegistrationState = {
  resultId?: string;
  outcome?: "success" | "error";
  title?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type UserListItem = {
  id_usuario: number;
  id_persona: number;
  id_rol: number;
  correo_acceso: string;
  nombre_usuario: string | null;
  foto_perfil_ruta: string | null;
  estado: UserStatus;
  motivo_estado: string | null;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  ultimo_acceso_en: string | null;
  ultima_actividad_en: string | null;
  en_linea: boolean;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
  persona: {
    id_persona: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    ci: string | null;
    telefono1: string;
  };
  rol: {
    id_rol: number;
    nombre: string;
    descripcion: string | null;
    estado: string;
  };
  creador: {
    id_usuario: number;
    persona: {
      nombre: string;
      ap_paterno: string;
      ap_materno: string | null;
    };
  } | null;
};

export type UserPresenceSnapshot = {
  id_usuario: number;
  en_linea: boolean;
  ultima_actividad_en: string | null;
  ultima_desconexion_en: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type AppointmentStatus =
  | "PROGRAMADA"
  | "EN_ESPERA"
  | "ATENDIDA"
  | "CANCELADA"
  | "NO_ASISTIO";

export type AppointmentListItem = {
  id_cita: number;
  id_paciente: number;
  id_tratamiento: number | null;
  id_personal: number;
  numero_sesion: number | null;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  fecha_llegada: string | null;
  estado: AppointmentStatus;
  observaciones: string | null;
  paciente: {
    id_paciente: number;
    persona: PersonSummary;
  };
  personal: {
    id_personal: number;
    profesion: string;
    cargo: string;
    color_agenda: string;
    usuario: {
      persona: PersonSummary;
    };
  };
  tratamiento: {
    id_tratamiento: number;
    id_servicio: number;
    servicio: {
      id_servicio: number;
      nombre: string;
      duracion_minutos: number;
    };
  } | null;
};

export type AgendaOptions = {
  patients: Array<{
    id_paciente: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    ci: string | null;
  }>;
  staff: Array<{
    id_personal: number;
    id_usuario: number;
    foto_perfil_ruta: string | null;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    profesion: string;
    cargo: string;
    color_agenda: string;
  }>;
  treatments: Array<{
    id_tratamiento: number;
    id_paciente: number;
    id_servicio: number;
    servicio: string;
    duracion_minutos: number;
    sesiones_totales: number;
    siguiente_sesion: number;
    estado: "PENDIENTE" | "EN_CURSO";
  }>;
  staffSchedules: Array<{
    id_horario: number;
    id_personal: number;
    dia_semana: Weekday;
    hora_inicio: string;
    hora_fin: string;
    motivo_pausa_anterior: string | null;
  }>;
  staffExtraSchedules: Array<{
    id_horario_extra: number;
    id_personal: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    motivo: string | null;
  }>;
  staffBlocks: Array<{
    id_bloqueo: number;
    id_personal: number;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    motivo: string | null;
  }>;
  businessHours: BusinessHours;
};

export type BusinessHours = {
  id_configuracion_horario?: number;
  id_empresa?: number;
  intervalo_minutos: number;
  horarios_semanales: Array<{
    id_horario_atencion?: number;
    dia_semana: Weekday;
    hora_inicio: string;
    hora_fin: string;
    motivo_pausa_anterior: string | null;
  }>;
  excepciones: Array<{
    id_excepcion_horario?: number;
    fecha: string;
    tipo: "CERRADO" | "HORARIO_ESPECIAL";
    motivo: string | null;
    tramos: Array<{
      id_tramo_excepcion?: number;
      hora_inicio: string;
      hora_fin: string;
    }>;
  }>;
  feriados: Array<{
    id_feriado?: number;
    tipo: "FIJO" | "DINAMICO";
    nombre: string;
    mes: number | null;
    dia: number | null;
    fecha: string | null;
  }>;
};

export type TreatmentStatus =
  | "PENDIENTE"
  | "EN_CURSO"
  | "FINALIZADO"
  | "CANCELADO";

export type TreatmentListItem = {
  id_tratamiento: number;
  id_historial: number;
  id_paciente: number;
  paciente: string;
  ci: string | null;
  id_servicio: number;
  servicio: string;
  duracion_minutos: number;
  requiere_valoracion: boolean;
  indicado_por: number;
  profesional: string;
  color_agenda: string;
  id_detalle_adquisicion: number | null;
  sesiones_iniciales: number;
  sesiones_agregadas: number;
  sesiones_realizadas: number;
  citas_pendientes: number;
  fecha_inicio: string | null;
  estado: TreatmentStatus;
  observaciones: string | null;
};

export type TreatmentOptions = {
  patients: Array<{
    id_historial: number | null;
    id_paciente: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    ci: string | null;
  }>;
  services: Array<{
    id_servicio: number;
    nombre: string;
    duracion_minutos: number;
    descripcion: string | null;
    requiere_valoracion: boolean;
    categoria: string;
    area: string;
  }>;
  staff: Array<{
    id_personal: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    profesion: string;
    cargo: string;
    color_agenda: string;
  }>;
  acquisitions: Array<{
    id_detalle_adquisicion: number;
    id_paciente: number;
    id_servicio: number;
    nombre_servicio_snapshot: string;
    sesiones_incluidas: number;
    sesiones_disponibles: number;
  }>;
};

export type CatalogArea = {
  id_area: number;
  nombre: string;
  descripcion: string | null;
  estado: GeneralStatus;
};

export type ServiceCategory = {
  id_categoria: number;
  id_area: number;
  nombre: string;
  descripcion: string | null;
  estado: GeneralStatus;
  area?: CatalogArea;
};

export type MeasureType = {
  id_tipo_medida: number;
  nombre: string;
  unidad: string | null;
  estado: GeneralStatus;
};

export type ServiceMeasure = {
  id_servicio: number;
  id_tipo_medida: number;
  obligatorio: boolean;
  tipoMedida: MeasureType;
};

export type CatalogService = {
  id_servicio: number;
  id_categoria: number;
  nombre: string;
  duracion_minutos: number;
  precio: string | number;
  descripcion: string | null;
  requiere_valoracion: boolean;
  estado: GeneralStatus;
  categoria?: ServiceCategory;
  medidas: ServiceMeasure[];
};

export type ServiceCatalogData = {
  areas: CatalogArea[];
  categories: ServiceCategory[];
  services: CatalogService[];
  measures: MeasureType[];
  productCategories: ProductCategory[];
};

export type ProductCategory = {
  id_categoria_producto: number;
  nombre: string;
  descripcion: string | null;
  estado: GeneralStatus;
};

export type Weekday = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";

export type AvailabilityStaff = {
  id_personal: number;
  id_usuario: number;
  foto_perfil_ruta: string | null;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  profesion: string;
  cargo: string;
  color_agenda: string;
  estado: GeneralStatus;
};

export type RegularSchedule = {
  id_horario: number;
  id_personal: number;
  dia_semana: Weekday;
  hora_inicio: string;
  hora_fin: string;
  motivo_pausa_anterior: string | null;
  estado: boolean;
};

export type ExtraSchedule = {
  id_horario_extra: number;
  id_personal: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  autorizado_por: number;
  motivo: string | null;
  estado: "AUTORIZADO" | "CANCELADO";
};

export type StaffBlock = {
  id_bloqueo: number;
  id_personal: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  motivo: string | null;
  estado: boolean;
};

export type AvailabilityData = {
  staff: AvailabilityStaff[];
  schedules: RegularSchedule[];
  extras: ExtraSchedule[];
  blocks: StaffBlock[];
};

export type SessionStatus = "EN_CURSO" | "FINALIZADA" | "CANCELADA";

export type ClinicalSession = {
  id_sesion: number;
  id_tratamiento: number;
  id_cita: number | null;
  atendido_por: number;
  fecha_sesion: string;
  finalizada_en: string | null;
  estado: SessionStatus;
  observaciones: string | null;
  id_paciente: number;
  paciente: string;
  ci: string | null;
  id_servicio: number;
  servicio: string;
  duracion_minutos: number;
  profesional: string;
  color_agenda: string;
  numero_sesion: number | null;
  cita_inicio: string | null;
  cita_fin: string | null;
};

export type SessionOptions = {
  appointments: Array<{
    id_cita: number;
    id_tratamiento: number;
    id_personal: number;
    numero_sesion: number | null;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    id_paciente: number;
    paciente: string;
    ci: string | null;
    servicio: string;
    duracion_minutos: number;
    profesional: string;
  }>;
  treatments: Array<{
    id_tratamiento: number;
    id_paciente: number;
    paciente: string;
    ci: string | null;
    servicio: string;
    sesiones_disponibles: number;
  }>;
  staff: Array<{
    id_personal: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    cargo: string;
    color_agenda: string;
  }>;
};

export type ValuationType = "INICIAL" | "EVOLUCION" | "FINAL";
export type ValuationOrigin =
  | "INDEPENDIENTE"
  | "SOLICITUD"
  | "TRATAMIENTO"
  | "SESION";
export type ValuationMeasure = {
  id_tipo_medida: number;
  nombre: string;
  unidad: string | null;
  valor: string | number;
};
export type ClinicalValuation = {
  id_valoracion: number;
  id_historial: number;
  id_solicitud: number | null;
  id_tratamiento: number | null;
  id_sesion: number | null;
  id_personal: number;
  tipo: ValuationType;
  fecha_valoracion: string;
  observaciones: string | null;
  id_paciente: number;
  paciente: string;
  ci: string | null;
  id_servicio: number | null;
  servicio: string | null;
  profesional: string;
  color_agenda: string;
  origen: ValuationOrigin;
  medidas: ValuationMeasure[];
};
type ValuationSource = {
  id_historial: number;
  id_paciente: number;
  id_servicio: number;
  servicio: string;
  paciente: string;
};
export type ValuationOptions = {
  patients: Array<{
    id_historial: number;
    id_paciente: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    ci: string | null;
  }>;
  staff: Array<{
    id_personal: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    profesion: string;
    cargo: string;
    color_agenda: string;
  }>;
  requests: Array<ValuationSource & { id_solicitud: number; estado: string }>;
  treatments: Array<
    ValuationSource & { id_tratamiento: number; estado: TreatmentStatus }
  >;
  sessions: Array<
    ValuationSource & {
      id_sesion: number;
      id_tratamiento: number;
      estado: SessionStatus;
      fecha_sesion: string;
    }
  >;
  measureTypes: Array<{
    id_tipo_medida: number;
    nombre: string;
    unidad: string | null;
  }>;
  serviceMeasures: Array<{
    id_servicio: number;
    id_tipo_medida: number;
    obligatorio: boolean;
  }>;
};

export type ServiceRequestStatus =
  | "PENDIENTE"
  | "VALORADO"
  | "ACEPTADO"
  | "DESCARTADO";
export type ServiceRequest = {
  id_solicitud: number;
  id_historial: number;
  id_servicio: number;
  fecha_solicitud: string;
  motivo: string | null;
  estado: ServiceRequestStatus;
  id_paciente: number;
  paciente: string;
  ci: string | null;
  servicio: string;
  requiere_valoracion: boolean;
  categoria: string;
  area: string;
  valoraciones: number;
  ultima_valoracion: string | null;
};
export type ServiceRequestOptions = {
  patients: Array<{
    id_historial: number;
    id_paciente: number;
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
    ci: string | null;
  }>;
  services: Array<{
    id_servicio: number;
    nombre: string;
    descripcion: string | null;
    duracion_minutos: number;
    requiere_valoracion: boolean;
    categoria: string;
    area: string;
  }>;
};

export type HistoryStatus = "ACTIVO" | "CERRADO";
export type ClinicalHistoryListItem = {
  id_historial: number;
  id_paciente: number;
  fecha_apertura: string;
  estado: HistoryStatus;
  observaciones_generales: string | null;
  ocupacion: string | null;
  estado_paciente: GeneralStatus;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  ci: string | null;
  fecha_nac: string | null;
  genero: Gender;
  telefono1: string;
  telefono2: string | null;
  id_usuario: number | null;
  correo_acceso: string | null;
  foto_perfil_ruta: string | null;
  solicitudes: number;
  tratamientos: number;
  valoraciones: number;
  sesiones_finalizadas: number;
  ultima_actividad: string;
};
export type ClinicalHistorySummary = {
  history: ClinicalHistoryListItem & { direccion: string | null };
  requests: Array<{
    id_solicitud: number;
    fecha_solicitud: string;
    motivo: string | null;
    estado: ServiceRequestStatus;
    id_servicio: number;
    servicio: string;
  }>;
  treatments: Array<{
    id_tratamiento: number;
    fecha_inicio: string | null;
    estado: TreatmentStatus;
    observaciones: string | null;
    sesiones_iniciales: number;
    sesiones_agregadas: number;
    sesiones_finalizadas: number;
    id_servicio: number;
    servicio: string;
    profesional: string;
  }>;
  sessions: Array<{
    id_sesion: number;
    id_tratamiento: number;
    id_cita: number | null;
    fecha_sesion: string;
    finalizada_en: string | null;
    estado: SessionStatus;
    observaciones: string | null;
    servicio: string;
    profesional: string;
  }>;
  valuations: Array<{
    id_valoracion: number;
    tipo: ValuationType;
    fecha_valoracion: string;
    observaciones: string | null;
    id_solicitud: number | null;
    id_tratamiento: number | null;
    id_sesion: number | null;
    servicio: string | null;
    profesional: string;
    medidas: ValuationMeasure[];
  }>;
  appointments: Array<{
    id_cita: number;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    estado: string;
    numero_sesion: number | null;
    observaciones: string | null;
    servicio: string | null;
    profesional: string;
  }>;
};
export type HistoryPatientOption = {
  id_paciente: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  ci: string | null;
};

export type PackageServiceItem = {
  id_servicio: number;
  servicio: string;
  sesiones_incluidas: number;
  duracion_minutos: number;
  categoria: string;
  area: string;
};
export type CommercialPackage = {
  id_paquete: number;
  nombre: string;
  descripcion: string | null;
  precio: string | number;
  estado: GeneralStatus;
  servicios: PackageServiceItem[];
  adquisiciones: number;
};
export type PackageOptions = {
  services: Array<{
    id_servicio: number;
    nombre: string;
    descripcion: string | null;
    duracion_minutos: number;
    requiere_valoracion: boolean;
    categoria: string;
    area: string;
  }>;
};

export type DiscountType = "PORCENTAJE" | "MONTO_FIJO";
export type PromotionStatus =
  | "PROGRAMADA"
  | "ACTIVA"
  | "FINALIZADA"
  | "CANCELADA";
export type CommercialPromotion = {
  id_promocion: number;
  nombre: string;
  descripcion: string | null;
  tipo_descuento: DiscountType;
  valor_descuento: string | number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: PromotionStatus;
  servicios: PackageServiceItem[];
  adquisiciones: number;
};
export type PromotionOptions = PackageOptions;

export type LotStatus = "DISPONIBLE" | "AGOTADO" | "VENCIDO" | "BAJA";
export type InventoryMovementType = "ENTRADA_COMPRA" | "CONSUMO_SESION" | "VENTA" | "AJUSTE_ENTRADA" | "AJUSTE_SALIDA" | "MERMA" | "VENCIMIENTO";
export type InventoryProduct = {
  id_producto: number; id_categoria_producto: number; categoria_producto: string;
  nombre: string; marca: string | null; sku: string | null; codigo_barras: string | null;
  descripcion: string | null; unidad_medida: string; presentacion: string;
  contenido_presentacion: string | number; precio_venta: string | number | null;
  imagen_url: string | null; es_insumo: boolean; es_vendible: boolean;
  stock_minimo: string | number; estado: GeneralStatus; lotes: number; stock_actual: string | number;
};
export type InventoryLot = {
  id_lote: number; id_producto: number; numero_lote: string | null;
  cantidad_inicial: string | number; fecha_ingreso: string; fecha_vencimiento: string | null;
  costo_unitario: string | number | null; estado: LotStatus; producto: string;
  unidad_medida: string; stock_actual: string | number;
};
export type InventoryMovement = {
  id_movimiento: number; id_lote: number; id_producto: number; tipo: InventoryMovementType;
  cantidad: string | number; fecha_movimiento: string; observaciones: string | null;
  numero_lote: string | null; producto: string; unidad_medida: string; registrado_por_nombre: string;
};
export type InventoryOptions = {
  products: Array<{ id_producto: number; nombre: string; unidad_medida: string; es_insumo: boolean; es_vendible: boolean }>;
  lots: Array<{ id_lote: number; id_producto: number; numero_lote: string | null; fecha_vencimiento: string | null; estado: LotStatus; producto: string; unidad_medida: string; stock_actual: string | number }>;
  productCategories: ProductCategory[];
};
export type SaleNoteStatus = "EMITIDA" | "ANULADA";
export type PaymentStatus = "REGISTRADO" | "ANULADO";
export type PaymentMethod = "EFECTIVO" | "QR" | "TRANSFERENCIA" | "TARJETA" | "OTRO";
export type SaleNote = { id_nota_venta: number; id_adquisicion: number | null; id_paciente: number | null; numero_nota: string; fecha_emision: string; subtotal: string | number; descuento: string | number; total: string | number; estado: SaleNoteStatus; observaciones: string | null; paciente: string; emitido_por_nombre: string; detalles: number; pagado: string | number; saldo: string | number };
export type SalePayment = { id_pago: number; id_nota_venta: number; monto: string | number; metodo_pago: PaymentMethod; fecha_pago: string; estado: PaymentStatus; observaciones: string | null; numero_nota: string; total_nota: string | number; paciente: string; registrado_por_nombre: string };
export type SalesOptions = {
  patients: Array<{ id_paciente: number; nombre: string; ap_paterno: string; ap_materno: string | null; ci: string | null }>;
  acquisitions: Array<{ id_adquisicion: number; id_paciente: number; total: string | number; fecha_adquisicion: string; concepto: string }>;
  items: Array<{ id: number; nombre: string; tipo: "SERVICIO" | "PRODUCTO" | "PAQUETE"; unidad_medida?: string; precio?: string | number }>;
  notes: Array<{ id_nota_venta: number; numero_nota: string; total: string | number; paciente: string; saldo: string | number }>;
};
export type AcquisitionStatus = "ACTIVA" | "COMPLETADA" | "CANCELADA";
export type Acquisition = { id_adquisicion:number; id_paciente:number; id_paquete:number|null; id_promocion:number|null; fecha_adquisicion:string; precio_original:string|number; descuento:string|number; total:string|number; estado:AcquisitionStatus; paciente:string; ci:string|null; origen:string; sesiones_incluidas:number; sesiones_asignadas:number; sesiones_realizadas:number; detalles:Array<{id_detalle_adquisicion:number;id_servicio:number;servicio:string;sesiones_incluidas:number;precio_unitario:string|number;subtotal:string|number}> };
export type AcquisitionOptions = { patients:Array<{id_paciente:number;nombre:string;ap_paterno:string;ap_materno:string|null;ci:string|null}>; offers:Array<{id:number;nombre:string;tipo:"PAQUETE"|"PROMOCION";precio?:string|number;tipo_descuento?:DiscountType;valor_descuento?:string|number;servicios:Array<{id_servicio:number;servicio:string;sesiones_incluidas:number;precio:string|number}>}> };
export type StockOperation = { id_consumo?:number;id_salida?:number;id_sesion?:number;id_detalle?:number;cantidad:string|number;registrado_en?:string;fecha_movimiento:string;observaciones:string|null;producto:string;unidad_medida:string;numero_lote:string|null;referencia:string };
export type InventoryOperationOptions = { sessions:Array<{id_sesion:number;fecha_sesion:string;servicio:string;paciente:string}>; saleDetails:Array<{id_detalle:number;id_producto:number;producto:string;cantidad:string|number;numero_nota:string;cantidad_salida:string|number;pendiente:string|number}>; lots:InventoryOptions["lots"] };
export type Company = { id_empresa:number;nombre_comercial:string;razon_social:string|null;nit:string|null;actividad_economica:string|null;telefono1:string|null;telefono2:string|null;correo:string|null;direccion:string|null;sitio_web:string|null;logo_url:string|null;moneda:string;eslogan_principal:string|null;titulo_login:string|null;descripcion_corta:string|null;imagen_fondo_login_url:string|null;imagen_fondo_panel_login_url:string|null };
export type CompanyBranding = { name:string;tagline:string;loginTitle:string;shortDescription:string;hasLogo:boolean;hasLoginBackground:boolean;hasLoginPanelBackground:boolean };
export type CurrencyOption = { code:string;name:string;countries:string };
export type DocumentConfig={id_configuracion:number;id_empresa:number;encabezado:string|null;pie_pagina:string|null;mostrar_logo:boolean;mostrar_direccion:boolean;mostrar_telefono:boolean;mostrar_correo:boolean};
export type AuditEventItem={id_auditoria:string;id_usuario_accion:number;id_usuario_afectado:number|null;accion:string;entidad:string;id_registro:string|null;descripcion:string|null;ip:string|null;user_agent:string|null;fecha:string;usuario_accion:string;usuario_afectado:string};
export type AccessItem={id_acceso:string;id_usuario:number|null;identificador_intento:string|null;fecha_login:string;fecha_logout:string|null;login_exitoso:boolean;motivo_fallo:string|null;ip:string|null;user_agent:string|null;usuario?:{id_usuario:number;persona?:{nombre:string;ap_paterno:string;ap_materno:string|null}}|null};
export type AuditConfig={id_configuracion:number;codigo_evento:string;nombre:string;descripcion:string|null;categoria:string;habilitado:boolean;es_obligatorio:boolean;created_at:string;updated_at:string};
export type NotificationStatus="PENDIENTE"|"ENVIADA"|"ERROR"|"CANCELADA";
export type AppointmentNotification={id_notificacion:number;id_cita:number;tipo:"CONFIRMACION"|"RECORDATORIO"|"REPROGRAMACION"|"CANCELACION";canal:"EMAIL"|"WHATSAPP"|"SMS"|"SISTEMA";programada_para:string;enviada_en:string|null;estado:NotificationStatus;fecha_hora_inicio:string;paciente:string;servicio:string};
export type NotificationOption={id_cita:number;fecha_hora_inicio:string;estado:string;paciente:string;servicio:string};
