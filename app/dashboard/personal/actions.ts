"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { Gender, GeneralStatus, RegistrationState } from "@/lib/types";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: string) {
  return value || null;
}

export async function registerStaff(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const required = [
    "nombre",
    "ap_paterno",
    "telefono1",
    "correo_acceso",
    "profesion",
    "cargo",
    "fecha_ingreso",
  ] as const;
  const fieldErrors: Record<string, string> = {};
  for (const field of required) {
    if (!text(formData, field)) fieldErrors[field] = "Este campo es obligatorio.";
  }
  const genero = text(formData, "genero") as Gender;
  if (!new Set<Gender>(["FEMENINO", "MASCULINO"]).has(genero))
    fieldErrors.genero = "Selecciona el género.";
  const roleId = Number(text(formData, "id_rol"));
  if (!Number.isInteger(roleId) || roleId < 1)
    fieldErrors.id_rol = "Selecciona un rol.";
  const password = text(formData, "contrasena");
  const confirmation = text(formData, "confirmar_contrasena");
  const colorAgenda = text(formData, "color_agenda").toUpperCase();
  const profilePhoto = formData.get("foto_perfil");
  if (!/^#[0-9A-F]{6}$/.test(colorAgenda))
    fieldErrors.color_agenda = "Selecciona un color válido.";
  if (profilePhoto instanceof File && profilePhoto.size > 0) {
    if (profilePhoto.size > 5 * 1024 * 1024)
      fieldErrors.foto_perfil = "La imagen no puede superar los 5 MB.";
    else if (!["image/jpeg", "image/png", "image/webp"].includes(profilePhoto.type))
      fieldErrors.foto_perfil = "Usa una imagen JPG, PNG o WEBP.";
  }
  if (password.length < 12 || password.length > 72)
    fieldErrors.contrasena = "Debe tener entre 12 y 72 caracteres.";
  else if (password !== confirmation)
    fieldErrors.confirmar_contrasena = "Las contraseñas no coinciden.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token) return {
    resultId: randomUUID(),
    outcome: "error",
    title: "La sesión venció",
    message: "Vuelve a iniciar sesión para crear al empleado.",
  };

  try {
    const response = await fetch(backendUrl("/personal/registro-completo"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        persona: {
          nombre: text(formData, "nombre"),
          ap_paterno: text(formData, "ap_paterno"),
          ap_materno: optional(text(formData, "ap_materno")),
          ci: optional(text(formData, "ci")),
          fecha_nac: optional(text(formData, "fecha_nac")),
          genero,
          telefono1: text(formData, "telefono1"),
          telefono2: optional(text(formData, "telefono2")),
          direccion: optional(text(formData, "direccion")),
        },
        usuario: {
          id_rol: roleId,
          correo_acceso: text(formData, "correo_acceso").toLowerCase(),
          nombre_usuario: optional(text(formData, "nombre_usuario")),
          contrasena: password,
        },
        personal: {
          profesion: text(formData, "profesion"),
          cargo: text(formData, "cargo"),
          fecha_ingreso: text(formData, "fecha_ingreso"),
          color_agenda: colorAgenda,
        },
      }),
      cache: "no-store",
    });
    if (!response.ok)
      return {
        resultId: randomUUID(),
        outcome: "error",
        title: "Empleado no creado",
        message: (await readApiMessage(response)) || "No fue posible registrar al empleado.",
      };
    const created = (await response.json()) as { usuario?: { id_usuario?: number } };
    if (profilePhoto instanceof File && profilePhoto.size > 0 && created.usuario?.id_usuario) {
      const photoData = new FormData();
      photoData.set("foto", profilePhoto);
      const photoResponse = await fetch(backendUrl(`/usuarios/${created.usuario.id_usuario}/foto-perfil`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: photoData,
        cache: "no-store",
      });
      if (!photoResponse.ok) {
        revalidatePath("/dashboard/personal");
        return {
          resultId: randomUUID(),
          outcome: "success",
          title: "Empleado creado con una advertencia",
          message: `La cuenta fue creada, pero la foto no pudo guardarse: ${(await readApiMessage(photoResponse)) || "vuelve a intentarlo desde la edición"}.`,
        };
      }
    }
  } catch {
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "Servidor no disponible",
      message: "No pudimos conectar con el servidor. Inténtalo nuevamente.",
    };
  }

  revalidatePath("/dashboard/personal");
  const fullName = [text(formData, "nombre"), text(formData, "ap_paterno"), text(formData, "ap_materno")].filter(Boolean).join(" ");
  return {
    resultId: randomUUID(),
    outcome: "success",
    title: "Empleado creado",
    message: `${fullName} fue registrado correctamente.`,
  };
}

export async function updateStaff(
  staffId: number,
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  if (!Number.isInteger(staffId) || staffId < 1) {
    return { resultId: randomUUID(), outcome: "error", title: "Empleado inválido", message: "No se pudo identificar al empleado." };
  }

  const required = ["nombre", "ap_paterno", "telefono1", "correo_acceso", "profesion", "cargo", "fecha_ingreso"] as const;
  const fieldErrors: Record<string, string> = {};
  for (const field of required) if (!text(formData, field)) fieldErrors[field] = "Este campo es obligatorio.";
  const genero = text(formData, "genero") as Gender;
  const colorAgenda = text(formData, "color_agenda").toUpperCase();
  const profilePhoto = formData.get("foto_perfil");
  if (!new Set<Gender>(["FEMENINO", "MASCULINO"]).has(genero)) fieldErrors.genero = "Selecciona el género.";
  if (!/^#[0-9A-F]{6}$/.test(colorAgenda)) fieldErrors.color_agenda = "Selecciona un color válido.";
  if (profilePhoto instanceof File && profilePhoto.size > 0) {
    if (profilePhoto.size > 5 * 1024 * 1024) fieldErrors.foto_perfil = "La imagen no puede superar los 5 MB.";
    else if (!["image/jpeg", "image/png", "image/webp"].includes(profilePhoto.type)) fieldErrors.foto_perfil = "Usa una imagen JPG, PNG o WEBP.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token) return { resultId: randomUUID(), outcome: "error", title: "La sesión venció", message: "Vuelve a iniciar sesión para guardar los cambios." };

  try {
    const response = await fetch(backendUrl(`/personal/${staffId}/actualizacion-completa`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: {
          nombre: text(formData, "nombre"),
          ap_paterno: text(formData, "ap_paterno"),
          ap_materno: optional(text(formData, "ap_materno")),
          ci: optional(text(formData, "ci")),
          fecha_nac: optional(text(formData, "fecha_nac")),
          genero,
          telefono1: text(formData, "telefono1"),
          telefono2: optional(text(formData, "telefono2")),
          direccion: optional(text(formData, "direccion")),
        },
        usuario: {
          correo_acceso: text(formData, "correo_acceso").toLowerCase(),
          nombre_usuario: optional(text(formData, "nombre_usuario")),
        },
        personal: {
          profesion: text(formData, "profesion"),
          cargo: text(formData, "cargo"),
          fecha_ingreso: text(formData, "fecha_ingreso"),
          color_agenda: colorAgenda,
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) return { resultId: randomUUID(), outcome: "error", title: "Cambios no guardados", message: (await readApiMessage(response)) || "No fue posible actualizar al empleado." };
    const updated = (await response.json()) as { usuario?: { id_usuario?: number } };
    if (profilePhoto instanceof File && profilePhoto.size > 0 && updated.usuario?.id_usuario) {
      const photoData = new FormData();
      photoData.set("foto", profilePhoto);
      const photoResponse = await fetch(backendUrl(`/usuarios/${updated.usuario.id_usuario}/foto-perfil`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: photoData,
        cache: "no-store",
      });
      if (!photoResponse.ok) {
        revalidatePath("/dashboard/personal");
        return {
          resultId: randomUUID(),
          outcome: "success",
          title: "Datos actualizados con una advertencia",
          message: `Los datos se guardaron, pero la foto no pudo actualizarse: ${(await readApiMessage(photoResponse)) || "inténtalo nuevamente"}.`,
        };
      }
    }
  } catch {
    return { resultId: randomUUID(), outcome: "error", title: "Servidor no disponible", message: "No pudimos conectar con el servidor. Inténtalo nuevamente." };
  }

  revalidatePath("/dashboard/personal");
  const fullName = [text(formData, "nombre"), text(formData, "ap_paterno"), text(formData, "ap_materno")].filter(Boolean).join(" ");
  return { resultId: randomUUID(), outcome: "success", title: "Empleado actualizado", message: `Los datos de ${fullName} se actualizaron correctamente.` };
}

export async function changeStaffStatus(
  staffId: number,
  status: GeneralStatus,
  reason: string,
  updateAccess: boolean,
): Promise<RegistrationState> {
  if (!updateAccess) {
    return { resultId: randomUUID(), outcome: "error", title: "Acceso no sincronizado", message: "El estado del empleado debe actualizarse junto con su cuenta de usuario." };
  }
  if (!Number.isInteger(staffId) || staffId < 1 || !new Set<GeneralStatus>(["ACTIVO", "BAJA"]).has(status)) {
    return { resultId: randomUUID(), outcome: "error", title: "Solicitud inválida", message: "No se pudo identificar al empleado o el estado solicitado." };
  }
  const normalizedReason = reason.trim();
  if (status === "BAJA" && !normalizedReason) {
    return { resultId: randomUUID(), outcome: "error", title: "Motivo requerido", message: "Indica el motivo antes de dar de baja al empleado." };
  }

  const token = await getSessionToken();
  if (!token) return { resultId: randomUUID(), outcome: "error", title: "La sesión venció", message: "Vuelve a iniciar sesión para cambiar el estado." };

  try {
    const response = await fetch(backendUrl(`/personal/${staffId}/estado`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: status,
        motivo_baja: status === "BAJA" ? normalizedReason : undefined,
      }),
      cache: "no-store",
    });
    if (!response.ok) return { resultId: randomUUID(), outcome: "error", title: "Estado no actualizado", message: (await readApiMessage(response)) || "No fue posible cambiar el estado del empleado." };
  } catch {
    return { resultId: randomUUID(), outcome: "error", title: "Servidor no disponible", message: "No pudimos conectar con el servidor. Inténtalo nuevamente." };
  }

  revalidatePath("/dashboard/personal");
  return { resultId: randomUUID(), outcome: "success", title: "Estado actualizado", message: status === "ACTIVO" ? "El empleado y su cuenta fueron reactivados correctamente." : "El empleado y su cuenta fueron dados de baja correctamente." };
}
