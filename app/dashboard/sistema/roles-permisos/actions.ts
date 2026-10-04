"use server";

import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";

export type AccessMutationResult = { ok: true; message: string } | { ok: false; message: string };

function validIds(ids: number[]) {
  return Array.isArray(ids) && ids.every((id) => Number.isInteger(id) && id > 0) && new Set(ids).size === ids.length;
}

async function mutate(path: string, method: "POST" | "PUT", body: unknown): Promise<AccessMutationResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, message: "Tu sesión venció. Vuelve a iniciar sesión." };
  try {
    const response = await fetch(backendUrl(path), {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, message: (await readApiMessage(response)) || "No fue posible guardar los cambios." };
    revalidatePath("/dashboard/sistema/roles-permisos");
    return { ok: true, message: "Los cambios se guardaron correctamente." };
  } catch {
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}

export async function createRoleWithPermissions(input: { nombre: string; descripcion: string | null; permissionIds: number[] }) {
  const nombre = input.nombre.trim();
  const descripcion = input.descripcion?.trim() || null;
  if (!nombre || nombre.length > 60 || (descripcion?.length ?? 0) > 255 || !validIds(input.permissionIds)) return { ok: false, message: "Revisa el nombre, la descripción y los permisos seleccionados." } satisfies AccessMutationResult;
  return mutate("/roles/registro-completo", "POST", { rol: { nombre, descripcion }, id_permisos: input.permissionIds });
}

export async function updateRoleWithPermissions(roleId: number, input: { nombre: string; descripcion: string | null; permissionIds: number[] }) {
  const nombre = input.nombre.trim();
  const descripcion = input.descripcion?.trim() || null;
  if (!Number.isInteger(roleId) || roleId < 1 || !nombre || nombre.length > 60 || (descripcion?.length ?? 0) > 255 || !validIds(input.permissionIds)) return { ok: false, message: "Revisa el nombre, la descripción y los permisos seleccionados." } satisfies AccessMutationResult;
  return mutate(`/roles/${roleId}/registro-completo`, "PUT", { rol: { nombre, descripcion }, id_permisos: input.permissionIds });
}

export async function createPermission(input: { permiso: string; descripcion: string | null }) {
  const permiso = input.permiso.trim().toLowerCase();
  const descripcion = input.descripcion?.trim() || null;
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(permiso) || permiso.length > 80 || (descripcion?.length ?? 0) > 255) return { ok: false, message: "Usa un código como modulo.accion, en minúsculas y sin espacios." } satisfies AccessMutationResult;
  return mutate("/permisos", "POST", { permiso, descripcion });
}

export async function updateUserPermissionExceptions(userId: number, exceptions: Array<{ id_permiso: number; permitido: boolean }>) {
  if (!Number.isInteger(userId) || userId < 1 || !Array.isArray(exceptions) || !validIds(exceptions.map((item) => item.id_permiso)) || exceptions.some((item) => typeof item.permitido !== "boolean")) return { ok: false, message: "La configuración de permisos no es válida." } satisfies AccessMutationResult;
  const result = await mutate(`/permisos/usuarios/${userId}`, "PUT", { excepciones: exceptions });
  if (result.ok) revalidatePath("/dashboard", "layout");
  return result;
}
