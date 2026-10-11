"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState } from "@/lib/types";

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const id = (data: FormData, name: string) => {
  const value = Number(text(data, name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
};
const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const localIso = (value: string) =>
  localDateTimePattern.test(value) ? `${value}:00-04:00` : null;
const failure = (message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "error",
  title: "No se pudo completar",
  message,
});
const success = (title: string, message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "success",
  title,
  message,
});

async function mutate(path: string, method: "POST" | "PATCH", body?: object) {
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció. Vuelve a iniciar sesión.");
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
      return failure(
        (await readApiMessage(response)) || "La operación no pudo completarse.",
      );
  } catch {
    return failure("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/sesiones");
  revalidatePath("/dashboard/tratamientos");
  revalidatePath("/dashboard/agenda");
  return null;
}

export async function startSession(
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const treatmentId = id(data, "id_tratamiento");
  const staffId = id(data, "atendido_por");
  const appointmentId = id(data, "id_cita");
  const startedAt = text(data, "fecha_sesion");
  const startedAtIso = localIso(startedAt);
  const fieldErrors: Record<string, string> = {};
  if (!treatmentId)
    fieldErrors.id_tratamiento = "Selecciona una cita o tratamiento.";
  if (!staffId)
    fieldErrors.atendido_por = "Selecciona al profesional que atenderá.";
  if (!startedAtIso)
    fieldErrors.fecha_sesion = "Indica una fecha y hora de inicio válidas.";
  else if (new Date(startedAtIso) > new Date())
    fieldErrors.fecha_sesion =
      "La sesión no puede comenzar en una fecha futura.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const result = await mutate("/clinica/sesiones", "POST", {
    id_tratamiento: treatmentId,
    ...(appointmentId ? { id_cita: appointmentId } : {}),
    atendido_por: staffId,
    fecha_sesion: startedAtIso!,
    observaciones: text(data, "observaciones") || undefined,
  });
  return (
    result ??
    success(
      "Sesión iniciada",
      "La atención está en curso y puede finalizarse cuando corresponda.",
    )
  );
}

export async function updateSessionNotes(
  sessionId: number,
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  if (!Number.isInteger(sessionId) || sessionId < 1)
    return failure("No se pudo identificar la sesión.");
  const result = await mutate(`/clinica/sesiones/${sessionId}`, "PATCH", {
    observaciones: text(data, "observaciones") || "",
  });
  return (
    result ??
    success(
      "Observaciones actualizadas",
      "La información clínica de la sesión fue guardada.",
    )
  );
}
export async function finishSession(sessionId: number) {
  if (!Number.isInteger(sessionId) || sessionId < 1)
    return failure("No se pudo identificar la sesión.");
  const result = await mutate(
    `/clinica/sesiones/${sessionId}/finalizar`,
    "PATCH",
  );
  return (
    result ??
    success(
      "Sesión finalizada",
      "La cita quedó atendida y el progreso del tratamiento fue actualizado.",
    )
  );
}
export async function cancelSession(sessionId: number) {
  if (!Number.isInteger(sessionId) || sessionId < 1)
    return failure("No se pudo identificar la sesión.");
  const result = await mutate(
    `/clinica/sesiones/${sessionId}/cancelar`,
    "PATCH",
  );
  return (
    result ??
    success(
      "Sesión cancelada",
      "El registro se conserva y no consume una sesión del tratamiento.",
    )
  );
}
