"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState, Weekday } from "@/lib/types";

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const positiveId = (data: FormData, name: string) => {
  const value = Number(text(data, name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
};
const failure = (message: string): RegistrationState => ({ resultId: randomUUID(), outcome: "error", title: "No se pudo guardar", message });
const success = (title: string, message: string): RegistrationState => ({ resultId: randomUUID(), outcome: "success", title, message });
const localIso = (value: string) => value ? `${value.length === 16 ? value : value.slice(0, 16)}:00-04:00` : "";

async function mutate(path: string, method: "POST" | "PATCH" | "PUT", body: object) {
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció. Vuelve a iniciar sesión.");
  try {
    const response = await fetch(backendUrl(path), {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return failure((await readApiMessage(response)) || "La operación no pudo completarse.");
  } catch {
    return failure("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/personal/disponibilidad");
  revalidatePath("/dashboard/agenda");
  return null;
}

export async function saveRegularSchedule(scheduleId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const staffId = positiveId(data, "id_personal");
  const day = text(data, "dia_semana") as Weekday;
  const start = text(data, "hora_inicio");
  const end = text(data, "hora_fin");
  const fieldErrors: Record<string, string> = {};
  if (!scheduleId && !staffId) fieldErrors.id_personal = "Selecciona un especialista.";
  if (!day) fieldErrors.dia_semana = "Selecciona un día.";
  if (!start) fieldErrors.hora_inicio = "Selecciona la hora inicial.";
  if (!end || end <= start) fieldErrors.hora_fin = "La hora final debe ser posterior a la inicial.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const body = { ...(!scheduleId ? { id_personal: staffId } : {}), dia_semana: day, hora_inicio: start, hora_fin: end, ...(scheduleId ? { estado: text(data, "estado") === "true" } : {}) };
  const result = await mutate(scheduleId ? `/disponibilidad/horarios/${scheduleId}` : "/disponibilidad/horarios", scheduleId ? "PATCH" : "POST", body);
  return result ?? success(scheduleId ? "Horario actualizado" : "Horario registrado", "La agenda utilizará este tramo para validar nuevas citas.");
}

export async function saveStaffWeek(_state: RegistrationState, data: FormData): Promise<RegistrationState> {
  void _state;
  const staffId = positiveId(data, "id_personal");
  const rawSchedules = text(data, "horarios");
  const fieldErrors: Record<string, string> = {};
  if (!staffId) fieldErrors.id_personal = "Selecciona un especialista.";
  let schedules: Array<{ dia_semana: Weekday; hora_inicio: string; hora_fin: string; motivo_pausa_anterior?: string }> = [];
  try {
    const parsed = JSON.parse(rawSchedules) as unknown;
    if (!Array.isArray(parsed)) throw new Error("invalid");
    schedules = parsed.map((item) => {
      if (!item || typeof item !== "object") throw new Error("invalid");
      const range = item as Record<string, unknown>;
      const dia_semana = String(range.dia_semana ?? "") as Weekday;
      const hora_inicio = String(range.hora_inicio ?? "");
      const hora_fin = String(range.hora_fin ?? "");
      const motivo_pausa_anterior = String(range.motivo_pausa_anterior ?? "").trim();
      if (!dia_semana || !hora_inicio || !hora_fin || hora_fin <= hora_inicio) throw new Error("invalid");
      return { dia_semana, hora_inicio, hora_fin, ...(motivo_pausa_anterior ? { motivo_pausa_anterior } : {}) };
    });
  } catch {
    fieldErrors.horarios = "Revisa los días y las horas configuradas.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const result = await mutate(`/disponibilidad/horarios/personal/${staffId}`, "PUT", { horarios: schedules });
  return result ?? success("Semana laboral actualizada", schedules.length ? "Los horarios habituales del empleado quedaron configurados." : "El empleado quedó sin horarios habituales activos.");
}

export async function saveExtraSchedule(extraId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const staffId = positiveId(data, "id_personal");
  const date = text(data, "fecha");
  const start = text(data, "hora_inicio");
  const end = text(data, "hora_fin");
  const fieldErrors: Record<string, string> = {};
  if (!extraId && !staffId) fieldErrors.id_personal = "Selecciona un especialista.";
  if (!date) fieldErrors.fecha = "Selecciona una fecha.";
  if (!start) fieldErrors.hora_inicio = "Selecciona la hora inicial.";
  if (!end || end <= start) fieldErrors.hora_fin = "La hora final debe ser posterior a la inicial.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const body = { ...(!extraId ? { id_personal: staffId } : {}), fecha: date, hora_inicio: start, hora_fin: end, motivo: text(data, "motivo") || null, ...(extraId ? { estado: text(data, "estado") } : {}) };
  const result = await mutate(extraId ? `/disponibilidad/horarios-extra/${extraId}` : "/disponibilidad/horarios-extra", extraId ? "PATCH" : "POST", body);
  return result ?? success(extraId ? "Horario extraordinario actualizado" : "Horario extraordinario autorizado", "La excepción quedó aplicada a la fecha seleccionada.");
}

export async function saveStaffBlock(blockId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const staffId = positiveId(data, "id_personal");
  const rawStart = text(data, "fecha_hora_inicio");
  const rawEnd = text(data, "fecha_hora_fin");
  const fieldErrors: Record<string, string> = {};
  if (!blockId && !staffId) fieldErrors.id_personal = "Selecciona un especialista.";
  if (!rawStart) fieldErrors.fecha_hora_inicio = "Selecciona el inicio del bloqueo.";
  if (!rawEnd || rawEnd <= rawStart) fieldErrors.fecha_hora_fin = "La finalización debe ser posterior al inicio.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const body = { ...(!blockId ? { id_personal: staffId } : {}), fecha_hora_inicio: localIso(rawStart), fecha_hora_fin: localIso(rawEnd), motivo: text(data, "motivo") || null, ...(blockId ? { estado: text(data, "estado") === "true" } : {}) };
  const result = await mutate(blockId ? `/disponibilidad/bloqueos/${blockId}` : "/disponibilidad/bloqueos", blockId ? "PATCH" : "POST", body);
  return result ?? success(blockId ? "Bloqueo actualizado" : "Bloqueo registrado", "Agenda impedirá reservas dentro de este periodo mientras permanezca activo.");
}

export async function deleteStaffBlock(blockId: number, _state: RegistrationState, _data: FormData): Promise<RegistrationState> {
  void _state;
  void _data;
  if (!Number.isInteger(blockId) || blockId < 1) return { ...failure("El bloqueo seleccionado no es válido."), title: "No se pudo eliminar" };
  const token = await getSessionToken();
  if (!token) return { ...failure("La sesión venció. Vuelve a iniciar sesión."), title: "No se pudo eliminar" };
  try {
    const response = await fetch(backendUrl(`/disponibilidad/bloqueos/${blockId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return { ...failure((await readApiMessage(response)) || "La operación no pudo completarse."), title: "No se pudo eliminar" };
  } catch {
    return { ...failure("No pudimos conectar con el servidor."), title: "No se pudo eliminar" };
  }
  revalidatePath("/dashboard/personal/disponibilidad");
  revalidatePath("/dashboard/agenda");
  return success("Bloqueo eliminado", "El periodo dejó de estar bloqueado y vuelve a estar disponible para la agenda.");
}
