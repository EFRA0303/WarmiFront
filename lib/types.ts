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
