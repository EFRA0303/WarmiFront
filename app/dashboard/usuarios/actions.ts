"use server";

import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { UserStatus } from "@/lib/types";

export type UpdateUserResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const validStatuses = new Set<UserStatus>(["ACTIVO", "BLOQUEADO", "BAJA"]);

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
