"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState, ServiceRequestStatus } from "@/lib/types";

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const id = (data: FormData, name: string) => {
  const value = Number(text(data, name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
};
const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const localIso = (value: string) => localDateTimePattern.test(value) ? `${value}:00-04:00` : null;
const failure = (message: string): RegistrationState => ({ resultId: randomUUID(), outcome: "error", title: "No se pudo completar", message });
const success = (title: string, message: string): RegistrationState => ({ resultId: randomUUID(), outcome: "success", title, message });
async function mutate(path: string, method: "POST" | "PATCH", body: object) {
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
  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/dashboard/valoraciones");
  return null;
}
export async function createServiceRequest(_state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const historyId = id(data, "id_historial");
  const serviceId = id(data, "id_servicio");
  const date = localIso(text(data, "fecha_solicitud"));
  const fieldErrors: Record<string, string> = {};
  if (!historyId) fieldErrors.id_historial = "Selecciona al paciente.";
  if (!serviceId) fieldErrors.id_servicio = "Selecciona el servicio solicitado.";
  if (!date) fieldErrors.fecha_solicitud = "Indica una fecha y hora válidas.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const result = await mutate("/clinica/solicitudes", "POST", {
    id_historial: historyId,
    id_servicio: serviceId,
    fecha_solicitud: date!,
    motivo: text(data, "motivo") || undefined,
  });
  return result ?? success("Solicitud registrada", "La solicitud quedó pendiente de revisión clínica.");
}
export async function updateServiceRequest(requestId: number, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const result = await mutate(`/clinica/solicitudes/${requestId}`, "PATCH", { motivo: text(data, "motivo") || "" });
  return result ?? success("Solicitud actualizada", "El motivo de la solicitud fue guardado.");
}
export async function changeServiceRequestStatus(requestId: number, estado: ServiceRequestStatus): Promise<RegistrationState> {
  if (!(new Set(["ACEPTADO", "DESCARTADO"])).has(estado)) return failure("El estado solicitado no es válido.");
  const result = await mutate(`/clinica/solicitudes/${requestId}`, "PATCH", { estado });
  return result ?? success(estado === "ACEPTADO" ? "Solicitud aceptada" : "Solicitud descartada", estado === "ACEPTADO" ? "La solicitud está lista para continuar con la atención." : "La solicitud se conserva como descartada.");
}
