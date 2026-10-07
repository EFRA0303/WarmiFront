"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { AppointmentStatus, RegistrationState } from "@/lib/types";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function boliviaDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00-04:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function mutateAppointment(
  path: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  successTitle: string,
  successMessage: string,
): Promise<RegistrationState> {
  const token = await getSessionToken();
  if (!token)
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "La sesión venció",
      message: "Vuelve a iniciar sesión para modificar la agenda.",
    };

  try {
    const response = await fetch(backendUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok)
      return {
        resultId: randomUUID(),
        outcome: "error",
        title: "Agenda no actualizada",
        message:
          (await readApiMessage(response)) || "No fue posible guardar el cambio.",
      };
  } catch {
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "Servidor no disponible",
      message: "No pudimos conectar con el servidor.",
    };
  }

  revalidatePath("/dashboard/agenda");
  return {
    resultId: randomUUID(),
    outcome: "success",
    title: successTitle,
    message: successMessage,
  };
}

function appointmentPayload(formData: FormData) {
  const idPaciente = positiveInteger(text(formData, "id_paciente"));
  const idPersonal = positiveInteger(text(formData, "id_personal"));
  const start = boliviaDateTime(text(formData, "fecha_hora_inicio"));
  const end = boliviaDateTime(text(formData, "fecha_hora_fin"));
  const treatment = positiveInteger(text(formData, "id_tratamiento"));
  const session = positiveInteger(text(formData, "numero_sesion"));
  const observations = text(formData, "observaciones");
  const fieldErrors: Record<string, string> = {};

  if (!idPaciente) fieldErrors.id_paciente = "Selecciona un paciente.";
  if (!idPersonal) fieldErrors.id_personal = "Selecciona un profesional.";
  if (!start) fieldErrors.fecha_hora_inicio = "Selecciona una fecha y hora válidas.";
  if (!end) fieldErrors.fecha_hora_fin = "Selecciona una fecha y hora válidas.";
  if (start && end && new Date(start) >= new Date(end))
    fieldErrors.fecha_hora_fin = "La hora final debe ser posterior a la inicial.";
  if (observations.length > 255)
    fieldErrors.observaciones = "Las observaciones admiten hasta 255 caracteres.";
  if (treatment && !session)
    fieldErrors.numero_sesion = "Indica el número de sesión del tratamiento.";

  return {
    fieldErrors,
    body: {
      id_paciente: idPaciente,
      id_personal: idPersonal,
      fecha_hora_inicio: start,
      fecha_hora_fin: end,
      id_tratamiento: treatment,
      numero_sesion: session,
      ...(observations ? { observaciones: observations } : {}),
    },
  };
}

export async function createAppointment(
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const { fieldErrors, body } = appointmentPayload(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return mutateAppointment(
    "/agenda/citas",
    "POST",
    body,
    "Cita programada",
    "La cita fue agregada correctamente a la agenda.",
  );
}

export async function updateAppointment(
  id: number,
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  if (!Number.isInteger(id) || id < 1)
    return { fieldErrors: { form: "No se pudo identificar la cita." } };
  const { fieldErrors, body } = appointmentPayload(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return mutateAppointment(
    `/agenda/citas/${id}`,
    "PATCH",
    body,
    "Cita actualizada",
    "Los datos de la cita se guardaron correctamente.",
  );
}

export async function reprogramAppointment(
  id: number,
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const start = boliviaDateTime(text(formData, "inicio_nuevo"));
  const end = boliviaDateTime(text(formData, "fin_nuevo"));
  const reason = text(formData, "motivo");
  const requestedBy = text(formData, "solicitado_por_tipo");
  const fieldErrors: Record<string, string> = {};
  if (!start) fieldErrors.inicio_nuevo = "Selecciona el nuevo inicio.";
  if (!end) fieldErrors.fin_nuevo = "Selecciona el nuevo final.";
  if (start && end && new Date(start) >= new Date(end))
    fieldErrors.fin_nuevo = "La hora final debe ser posterior a la inicial.";
  if (!["PACIENTE", "PERSONAL", "SISTEMA"].includes(requestedBy))
    fieldErrors.solicitado_por_tipo = "Selecciona quién solicitó el cambio.";
  if (reason.length > 255) fieldErrors.motivo = "El motivo admite hasta 255 caracteres.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  return mutateAppointment(
    `/agenda/citas/${id}/reprogramaciones`,
    "POST",
    {
      inicio_nuevo: start,
      fin_nuevo: end,
      solicitado_por_tipo: requestedBy,
      ...(reason ? { motivo: reason } : {}),
    },
    "Cita reprogramada",
    "El nuevo horario y su historial fueron guardados.",
  );
}

export async function changeAppointmentStatus(
  id: number,
  status: AppointmentStatus,
): Promise<RegistrationState> {
  const allowed = new Set<AppointmentStatus>([
    "EN_ESPERA",
    "ATENDIDA",
    "CANCELADA",
    "NO_ASISTIO",
  ]);
  if (!Number.isInteger(id) || id < 1 || !allowed.has(status))
    return {
      resultId: randomUUID(),
      outcome: "error",
      title: "Solicitud inválida",
      message: "No se pudo identificar el cambio solicitado.",
    };
  return mutateAppointment(
    `/agenda/citas/${id}`,
    "PATCH",
    { estado: status },
    status === "CANCELADA" ? "Cita cancelada" : "Estado actualizado",
    status === "CANCELADA"
      ? "La cita fue cancelada sin eliminar su historial."
      : "El estado de la cita fue actualizado.",
  );
}
