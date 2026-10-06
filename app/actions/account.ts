"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { backendUrl, readApiMessage } from "@/lib/backend";
import { deleteSession, getSessionToken } from "@/lib/auth";
import type { AccountActionState, Gender } from "@/lib/types";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: string) {
  return value || null;
}

export async function updateOwnProfile(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const fieldErrors: Record<string, string> = {};
  for (const field of ["nombre", "ap_paterno", "telefono1"] as const) {
    if (!text(formData, field)) fieldErrors[field] = "Este campo es obligatorio.";
  }
  const genero = text(formData, "genero") as Gender;
  const profilePhoto = formData.get("foto_perfil");
  if (!new Set<Gender>(["FEMENINO", "MASCULINO"]).has(genero))
    fieldErrors.genero = "Selecciona el género.";
  if (profilePhoto instanceof File && profilePhoto.size > 0) {
    if (profilePhoto.size > 5 * 1024 * 1024)
      fieldErrors.foto_perfil = "La imagen no puede superar los 5 MB.";
    else if (!["image/jpeg", "image/png", "image/webp"].includes(profilePhoto.type))
      fieldErrors.foto_perfil = "Usa una imagen JPG, PNG o WEBP.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token)
    return {
      resultId: randomUUID(),
      message: "Tu sesión venció. Vuelve a iniciar sesión.",
    };

  try {
    const response = await fetch(backendUrl("/auth/me/personal"), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: text(formData, "nombre"),
        ap_paterno: text(formData, "ap_paterno"),
        ap_materno: optional(text(formData, "ap_materno")),
        ci: optional(text(formData, "ci")),
        fecha_nac: optional(text(formData, "fecha_nac")),
        genero,
        telefono1: text(formData, "telefono1"),
        telefono2: optional(text(formData, "telefono2")),
        direccion: optional(text(formData, "direccion")),
      }),
      cache: "no-store",
    });
    if (!response.ok)
      return {
        resultId: randomUUID(),
        message:
          (await readApiMessage(response)) ||
          "No fue posible actualizar tus datos personales.",
      };
    if (profilePhoto instanceof File && profilePhoto.size > 0) {
      const photoData = new FormData();
      photoData.set("foto", profilePhoto);
      const photoResponse = await fetch(backendUrl("/auth/me/foto-perfil"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: photoData,
        cache: "no-store",
      });
      if (!photoResponse.ok)
        return {
          resultId: randomUUID(),
          message: `Tus datos se guardaron, pero la foto no pudo actualizarse: ${(await readApiMessage(photoResponse)) || "inténtalo nuevamente"}.`,
        };
    }
  } catch {
    return {
      resultId: randomUUID(),
      message: "No pudimos conectar con el servidor.",
    };
  }

  revalidatePath("/dashboard", "layout");
  return {
    resultId: randomUUID(),
    success: true,
    message: "Tus datos personales se actualizaron correctamente.",
  };
}

export async function changeOwnPassword(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const current = text(formData, "contrasena_actual");
  const next = text(formData, "nueva_contrasena");
  const confirmation = text(formData, "confirmar_contrasena");
  const fieldErrors: Record<string, string> = {};

  if (!current) fieldErrors.contrasena_actual = "Ingresa tu contraseña actual.";
  if (next.length < 12 || next.length > 72)
    fieldErrors.nueva_contrasena = "Debe tener entre 12 y 72 caracteres.";
  if (next !== confirmation)
    fieldErrors.confirmar_contrasena = "Las contraseñas no coinciden.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token)
    return {
      resultId: randomUUID(),
      message: "Tu sesión venció. Vuelve a iniciar sesión.",
    };

  try {
    const response = await fetch(backendUrl("/auth/change-password"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contrasena_actual: current,
        nueva_contrasena: next,
      }),
      cache: "no-store",
    });
    if (!response.ok)
      return {
        resultId: randomUUID(),
        message:
          (await readApiMessage(response)) ||
          "No fue posible cambiar la contraseña.",
      };
  } catch {
    return {
      resultId: randomUUID(),
      message: "No pudimos conectar con el servidor.",
    };
  }

  await deleteSession();
  return {
    resultId: randomUUID(),
    success: true,
    message: "Contraseña actualizada. Volverás al inicio de sesión.",
  };
}
