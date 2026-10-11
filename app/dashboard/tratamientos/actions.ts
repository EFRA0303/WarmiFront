"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState, TreatmentStatus } from "@/lib/types";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(formData: FormData, name: string) {
  const value = Number(text(formData, name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function failure(title: string, message: string): RegistrationState {
  return { resultId: randomUUID(), outcome: "error", title, message };
}

async function mutate(path: string, method: "POST" | "PATCH", body?: object) {
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció", "Vuelve a iniciar sesión para continuar.");
  try {
    const response = await fetch(backendUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!response.ok)
      return failure("Operación no completada", (await readApiMessage(response)) || "No fue posible guardar el cambio.");
  } catch {
    return failure("Servidor no disponible", "No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/tratamientos");
  revalidatePath("/dashboard/agenda");
  return null;
}

export async function createTreatment(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const idHistorial = positiveInteger(formData, "id_historial");
  const idServicio = positiveInteger(formData, "id_servicio");
  const indicadoPor = positiveInteger(formData, "indicado_por");
  const sesiones = positiveInteger(formData, "sesiones_iniciales");
  const fieldErrors: Record<string, string> = {};
  if (!idHistorial) fieldErrors.id_historial = "Selecciona un paciente.";
  if (!idServicio) fieldErrors.id_servicio = "Selecciona un servicio.";
  if (!indicadoPor) fieldErrors.indicado_por = "Selecciona al profesional.";
  if (!sesiones) fieldErrors.sesiones_iniciales = "Ingresa una cantidad válida.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const idDetalle = positiveInteger(formData, "id_detalle_adquisicion");
  const result = await mutate("/clinica/tratamientos", "POST", {
    id_historial: idHistorial,
    id_servicio: idServicio,
    indicado_por: indicadoPor,
    id_detalle_adquisicion: idDetalle,
    sesiones_iniciales: sesiones,
    fecha_inicio: text(formData, "fecha_inicio") || undefined,
    observaciones: text(formData, "observaciones") || undefined,
  });
  return result ?? {
    resultId: randomUUID(),
    outcome: "success",
    title: "Tratamiento creado",
    message: "El tratamiento quedó disponible para reservar sus sesiones en Agenda.",
  };
}

export async function updateTreatment(
  id: number,
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  if (!Number.isInteger(id) || id < 1) return failure("Tratamiento inválido", "No se pudo identificar el tratamiento.");
  const status = text(formData, "estado") as TreatmentStatus;
  const allowed = new Set<TreatmentStatus>(["PENDIENTE", "EN_CURSO", "FINALIZADO"]);
  if (!allowed.has(status)) return { fieldErrors: { estado: "Selecciona un estado válido." } };
  const result = await mutate(`/clinica/tratamientos/${id}`, "PATCH", {
    fecha_inicio: text(formData, "fecha_inicio") || undefined,
    estado: status,
    observaciones: text(formData, "observaciones") || undefined,
  });
  return result ?? { resultId: randomUUID(), outcome: "success", title: "Tratamiento actualizado", message: "Los cambios se guardaron correctamente." };
}

export async function extendTreatment(
  id: number,
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const sessions = positiveInteger(formData, "sesiones_agregadas");
  const professional = positiveInteger(formData, "autorizado_por");
  const fieldErrors: Record<string, string> = {};
  if (!sessions) fieldErrors.sesiones_agregadas = "Ingresa cuántas sesiones se agregarán.";
  if (!professional) fieldErrors.autorizado_por = "Selecciona quién autoriza.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const result = await mutate(`/clinica/tratamientos/${id}/ampliaciones`, "POST", {
    sesiones_agregadas: sessions,
    autorizado_por: professional,
    fecha_ampliacion: new Date().toISOString(),
    motivo: text(formData, "motivo") || undefined,
  });
  return result ?? { resultId: randomUUID(), outcome: "success", title: "Sesiones ampliadas", message: `Se agregaron ${sessions} sesiones al tratamiento.` };
}

export async function cancelTreatment(id: number): Promise<RegistrationState> {
  if (!Number.isInteger(id) || id < 1) return failure("Tratamiento inválido", "No se pudo identificar el tratamiento.");
  const result = await mutate(`/clinica/tratamientos/${id}/cancelar`, "PATCH");
  return result ?? { resultId: randomUUID(), outcome: "success", title: "Tratamiento cancelado", message: "El tratamiento se canceló y ya no estará disponible para nuevas reservas." };
}
