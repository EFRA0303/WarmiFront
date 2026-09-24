export type LoginState = {
  message?: string;
  fieldErrors?: {
    correo_acceso?: string;
    contrasena?: string;
  };
};

export type AuthResponse = {
  access_token: string;
  token_type: "Bearer" | string;
};

export type CurrentUser = {
  id_usuario: number;
  correo_acceso: string;
  nombre_usuario: string | null;
  estado: string;
  ultimo_acceso_en: string | null;
  persona: {
    nombre: string;
    ap_paterno: string;
    ap_materno: string | null;
  };
  rol: {
    id_rol: number;
    nombre: string;
    descripcion: string | null;
  };
};
