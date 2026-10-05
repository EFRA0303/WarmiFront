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

export async function registerPatient(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const nombre = text(formData, "nombre");
  const apPaterno = text(formData, "ap_paterno");
  const telefono = text(formData, "telefono1");
  const genero = text(formData, "genero") as Gender;
  const fieldErrors: Record<string, string> = {};

  if (!nombre) fieldErrors.nombre = "Ingresa el nombre.";
  if (!apPaterno) fieldErrors.ap_paterno = "Ingresa el apellido paterno.";
  if (!telefono) fieldErrors.telefono1 = "Ingresa un teléfono de contacto.";
  if (!new Set<Gender>(["FEMENINO", "MASCULINO"]).has(genero))
    fieldErrors.genero = "Selecciona el género.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token) return {
    resultId: randomUUID(),
    outcome: "error",
    title: "La sesión venció",
    message: "Vuelve a iniciar sesión para registrar al paciente.",
  };

  try {
    const response = await fetch(backendUrl("/pacientes/registro-completo"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        persona: {
          nombre,
          ap_paterno: apPaterno,
          ap_materno: optional(text(formData, "ap_materno")),
          ci: optional(text(formData, "ci")),
          fecha_nac: optional(text(formData, "fecha_nac")),
          genero,
          telefono1: telefono,
          telefono2: optional(text(formData, "telefono2")),
          direccion: optional(text(formData, "direccion")),
        },
        ocupacion: optional(text(formData, "ocupacion")),
      }),
      cache: "no-store",
    });
    if (!response.ok)
      return {
        resultId: randomUUID(),
        outcome: "error",
        title: "Paciente no registrado",
        message: (await readApiMessage(response)) || "No fue posible registrar al paciente.",
      };
  } catch {
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "Servidor no disponible",
      message: "No pudimos conectar con el servidor. Inténtalo nuevamente.",
    };
  }

  revalidatePath("/dashboard/pacientes");
  const fullName = [nombre, apPaterno, text(formData, "ap_materno")].filter(Boolean).join(" ");
  return {
    resultId: randomUUID(),
    outcome: "success",
    title: "Paciente registrado",
    message: `${fullName} fue registrado correctamente.`,
  };
}

export async function updatePatient(
  patientId: number,
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  if (!Number.isInteger(patientId) || patientId < 1) {
    return { resultId: randomUUID(), outcome: "error", title: "Paciente inválido", message: "No se pudo identificar al paciente." };
  }

  const nombre = text(formData, "nombre");
  const apPaterno = text(formData, "ap_paterno");
  const telefono = text(formData, "telefono1");
  const genero = text(formData, "genero") as Gender;
  const fieldErrors: Record<string, string> = {};
  if (!nombre) fieldErrors.nombre = "Ingresa el nombre.";
  if (!apPaterno) fieldErrors.ap_paterno = "Ingresa el apellido paterno.";
  if (!telefono) fieldErrors.telefono1 = "Ingresa un teléfono de contacto.";
  if (!new Set<Gender>(["FEMENINO", "MASCULINO"]).has(genero)) fieldErrors.genero = "Selecciona el género.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const token = await getSessionToken();
  if (!token) return { resultId: randomUUID(), outcome: "error", title: "La sesión venció", message: "Vuelve a iniciar sesión para guardar los cambios." };

  try {
    const response = await fetch(backendUrl(`/pacientes/${patientId}/actualizacion-completa`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: {
          nombre,
          ap_paterno: apPaterno,
          ap_materno: optional(text(formData, "ap_materno")),
          ci: optional(text(formData, "ci")),
          fecha_nac: optional(text(formData, "fecha_nac")),
          genero,
          telefono1: telefono,
          telefono2: optional(text(formData, "telefono2")),
          direccion: optional(text(formData, "direccion")),
        },
        paciente: { ocupacion: optional(text(formData, "ocupacion")) },
      }),
      cache: "no-store",
    });
    if (!response.ok) return { resultId: randomUUID(), outcome: "error", title: "Cambios no guardados", message: (await readApiMessage(response)) || "No fue posible actualizar al paciente." };
  } catch {
    return { resultId: randomUUID(), outcome: "error", title: "Servidor no disponible", message: "No pudimos conectar con el servidor. Inténtalo nuevamente." };
  }

  revalidatePath("/dashboard/pacientes");
  return { resultId: randomUUID(), outcome: "success", title: "Paciente actualizado", message: `Los datos de ${[nombre, apPaterno, text(formData, "ap_materno")].filter(Boolean).join(" ")} se actualizaron correctamente.` };
}

export async function changePatientStatus(
  patientId: number,
  status: GeneralStatus,
  reason: string,
  updateAccess: boolean,
): Promise<RegistrationState> {
  if (!Number.isInteger(patientId) || patientId < 1 || !new Set<GeneralStatus>(["ACTIVO", "BAJA"]).has(status)) {
    return { resultId: randomUUID(), outcome: "error", title: "Solicitud inválida", message: "No se pudo identificar el paciente o el estado solicitado." };
  }
  const normalizedReason = reason.trim();
  if (status === "BAJA" && !normalizedReason) {
    return { resultId: randomUUID(), outcome: "error", title: "Motivo requerido", message: "Indica el motivo antes de dar de baja al paciente." };
  }

  const token = await getSessionToken();
  if (!token) return { resultId: randomUUID(), outcome: "error", title: "La sesión venció", message: "Vuelve a iniciar sesión para cambiar el estado." };

  try {
    const response = await fetch(backendUrl(`/pacientes/${patientId}/${updateAccess ? "estado-acceso" : "estado"}`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: status,
        motivo_baja: status === "BAJA" ? normalizedReason : undefined,
      }),
      cache: "no-store",
    });
    if (!response.ok) return { resultId: randomUUID(), outcome: "error", title: "Estado no actualizado", message: (await readApiMessage(response)) || "No fue posible cambiar el estado del paciente." };
  } catch {
    return { resultId: randomUUID(), outcome: "error", title: "Servidor no disponible", message: "No pudimos conectar con el servidor. Inténtalo nuevamente." };
  }

  revalidatePath("/dashboard/pacientes");
  return { resultId: randomUUID(), outcome: "success", title: "Estado actualizado", message: updateAccess ? "El paciente y su cuenta se actualizaron correctamente." : status === "ACTIVO" ? "El paciente fue reactivado correctamente." : "El paciente fue dado de baja correctamente." };
}
