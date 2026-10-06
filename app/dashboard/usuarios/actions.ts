"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  PaginatedResponse,
  PatientListItem,
  PermissionListItem,
  RegistrationState,
  RoleListItem,
  RolePermissionAssignment,
  UserPermissionAssignment,
  UserPermissionContext,
  UserStatus,
} from "@/lib/types";

export type UpdateUserResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const validStatuses = new Set<UserStatus>(["ACTIVO", "BLOQUEADO", "BAJA"]);

export type PatientUserCandidate = {
  id_paciente: number;
  id_persona: number;
  nombre_completo: string;
  ci: string | null;
};

export type UserCreationOptions = {
  patients: PatientUserCandidate[];
  roles: RoleListItem[];
};

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

type PermissionContextResult =
  | { ok: true; value: UserPermissionContext }
  | { ok: false; message: string };

async function authorizedGet<T>(path: string, token: string) {
  try {
    const response = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false as const,
        message:
          (await readApiMessage(response)) ||
          "No fue posible cargar los permisos del usuario.",
      };
    }

    return { ok: true as const, value: (await response.json()) as T };
  } catch {
    return {
      ok: false as const,
      message: "No pudimos conectar con el servidor.",
    };
  }
}

export async function getUserCreationOptions(): Promise<
  { ok: true; value: UserCreationOptions } | { ok: false; message: string }
> {
  const token = await getSessionToken();
  if (!token) {
    return {
      ok: false,
      message: "Tu sesión venció. Vuelve a iniciar sesión para continuar.",
    };
  }

  const [patientsResult, rolesResult] = await Promise.all([
    authorizedGet<PaginatedResponse<PatientListItem>>(
      "/pacientes?page=1&limit=100&estado=ACTIVO",
      token,
    ),
    authorizedGet<PaginatedResponse<RoleListItem>>(
      "/roles?page=1&limit=100&estado=ACTIVO",
      token,
    ),
  ]);

  if (!patientsResult.ok) return patientsResult;
  if (!rolesResult.ok) return rolesResult;

  return {
    ok: true,
    value: {
      patients: patientsResult.value.data
        .filter((patient) => !patient.persona.usuario)
        .map((patient) => ({
          id_paciente: patient.id_paciente,
          id_persona: patient.id_persona,
          nombre_completo: [
            patient.persona.nombre,
            patient.persona.ap_paterno,
            patient.persona.ap_materno,
          ]
            .filter(Boolean)
            .join(" "),
          ci: patient.persona.ci,
        })),
      roles: rolesResult.value.data,
    },
  };
}

export async function registerPatientUser(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const fieldErrors: Record<string, string> = {};
  const personId = Number(formText(formData, "id_persona"));
  const roleId = Number(formText(formData, "id_rol"));
  const email = formText(formData, "correo_acceso").toLowerCase();
  const username = formText(formData, "nombre_usuario");
  const password = formText(formData, "contrasena");
  const confirmation = formText(formData, "confirmar_contrasena");

  if (!Number.isInteger(personId) || personId < 1)
    fieldErrors.id_persona = "Selecciona un paciente.";
  if (!Number.isInteger(roleId) || roleId < 1)
    fieldErrors.id_rol = "Selecciona un rol.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150)
    fieldErrors.correo_acceso = "Ingresa un correo válido.";
  if (username.length > 50)
    fieldErrors.nombre_usuario = "No puede superar 50 caracteres.";
  if (password.length < 12 || password.length > 72)
    fieldErrors.contrasena = "Debe tener entre 12 y 72 caracteres.";
  else if (password !== confirmation)
    fieldErrors.confirmar_contrasena = "Las contraseñas no coinciden.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token) {
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "La sesión venció",
      message: "Vuelve a iniciar sesión para crear el usuario.",
    };
  }

  try {
    const response = await fetch(backendUrl("/usuarios/paciente"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_persona: personId,
        id_rol: roleId,
        correo_acceso: email,
        nombre_usuario: username || null,
        contrasena: password,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        resultId: randomUUID(),
        outcome: "error",
        title: "Usuario no creado",
        message:
          (await readApiMessage(response)) ||
          "No fue posible crear la cuenta del paciente.",
      };
    }
  } catch {
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "Servidor no disponible",
      message: "No pudimos conectar con el servidor. Inténtalo nuevamente.",
    };
  }

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/pacientes");
  return {
    resultId: randomUUID(),
    outcome: "success",
    title: "Usuario creado",
    message: "La cuenta de acceso del paciente fue creada correctamente.",
  };
}

export async function getUserPermissionContext(
  userId: number,
  roleId: number,
): Promise<PermissionContextResult> {
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(roleId) ||
    roleId <= 0
  ) {
    return { ok: false, message: "El usuario o el rol no son válidos." };
  }

  const token = await getSessionToken();
  if (!token) {
    return {
      ok: false,
      message: "Tu sesión venció. Vuelve a iniciar sesión para continuar.",
    };
  }

  const [permissionsResult, roleResult, userResult] = await Promise.all([
    authorizedGet<PaginatedResponse<PermissionListItem>>(
      "/permisos?page=1&limit=100&estado=ACTIVO",
      token,
    ),
    authorizedGet<RolePermissionAssignment[]>(
      `/roles/${roleId}/permisos`,
      token,
    ),
    authorizedGet<UserPermissionAssignment[]>(
      `/permisos/usuarios/${userId}`,
      token,
    ),
  ]);

  if (!permissionsResult.ok) return permissionsResult;
  if (!roleResult.ok) return roleResult;
  if (!userResult.ok) return userResult;

  return {
    ok: true,
    value: {
      permissions: permissionsResult.value.data,
      rolePermissionIds: roleResult.value.map((item) => item.id_permiso),
      exceptions: userResult.value,
    },
  };
}

export async function updateUser(
  userId: number,
  input: {
    correo_acceso: string;
    nombre_usuario: string | null;
  },
): Promise<UpdateUserResult> {
  const email = input.correo_acceso.trim().toLowerCase();
  const username = input.nombre_usuario?.trim() || null;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    email.length > 150 ||
    (username?.length ?? 0) > 50 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ok: false, message: "Los datos enviados no son válidos." };
  }

  const token = await getSessionToken();
  if (!token) {
    return {
      ok: false,
      message: "Tu sesión venció. Vuelve a iniciar sesión para continuar.",
    };
  }

  try {
    const response = await fetch(backendUrl(`/usuarios/${userId}`), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correo_acceso: email,
        nombre_usuario: username,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        message:
          (await readApiMessage(response)) ||
          "No fue posible actualizar el usuario.",
      };
    }

    revalidatePath("/dashboard/usuarios");
    return { ok: true, message: "El usuario se actualizó correctamente." };
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar con el servidor. Verifica que el backend esté activo.",
    };
  }
}

export async function changeUserAccessState(
  userId: number,
  input: {
    estado: UserStatus;
    bloqueado_hasta?: string;
    motivo?: string;
  },
): Promise<UpdateUserResult> {
  const reason = input.motivo?.trim();
  const requiresReason = input.estado === "BLOQUEADO" || input.estado === "BAJA";
  const blockedUntil = input.bloqueado_hasta
    ? new Date(input.bloqueado_hasta)
    : null;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !validStatuses.has(input.estado) ||
    (requiresReason && (!reason || reason.length < 3 || reason.length > 255)) ||
    (input.estado === "BLOQUEADO" &&
      (!blockedUntil ||
        Number.isNaN(blockedUntil.getTime()) ||
        blockedUntil.getTime() <= Date.now()))
  ) {
    return { ok: false, message: "Completa correctamente los datos del cambio de estado." };
  }

  const token = await getSessionToken();
  if (!token) {
    return {
      ok: false,
      message: "Tu sesión venció. Vuelve a iniciar sesión para continuar.",
    };
  }

  try {
    const response = await fetch(backendUrl(`/usuarios/${userId}/estado`), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        estado: input.estado,
        bloqueado_hasta:
          input.estado === "BLOQUEADO" ? blockedUntil?.toISOString() : undefined,
        motivo: requiresReason ? reason : undefined,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        message:
          (await readApiMessage(response)) ||
          "No fue posible cambiar el estado del usuario.",
      };
    }

    revalidatePath("/dashboard/usuarios");
    return { ok: true, message: "El estado del usuario se actualizó correctamente." };
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar con el servidor. Verifica que el backend esté activo.",
    };
  }
}
