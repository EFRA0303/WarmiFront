"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState, ValuationType } from "@/lib/types";

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
async function mutate(path: string, method: "POST" | "PATCH" | "PUT", body: object) {
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció. Vuelve a iniciar sesión.");
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
      return failure(
        (await readApiMessage(response)) || "La operación no pudo completarse.",
      );
  } catch {
    return failure("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/valoraciones");
  return null;
}

export async function createValuation(
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const historyId = id(data, "id_historial");
  const staffId = id(data, "id_personal");
  const type = text(data, "tipo") as ValuationType;
  const date = localIso(text(data, "fecha_valoracion"));
  const fieldErrors: Record<string, string> = {};
  if (!historyId) fieldErrors.id_historial = "Selecciona al paciente u origen.";
  if (!staffId) fieldErrors.id_personal = "Selecciona al profesional.";
  if (!(["INICIAL", "EVOLUCION", "FINAL"] as string[]).includes(type))
    fieldErrors.tipo = "Selecciona el tipo de valoración.";
  if (!date) fieldErrors.fecha_valoracion = "Indica una fecha y hora válidas.";
  else if (new Date(date) > new Date())
    fieldErrors.fecha_valoracion = "La valoración no puede ser futura.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const result = await mutate("/clinica/valoraciones", "POST", {
    id_historial: historyId,
    ...(id(data, "id_solicitud")
      ? { id_solicitud: id(data, "id_solicitud") }
      : {}),
    ...(id(data, "id_tratamiento")
      ? { id_tratamiento: id(data, "id_tratamiento") }
      : {}),
    ...(id(data, "id_sesion") ? { id_sesion: id(data, "id_sesion") } : {}),
    id_personal: staffId,
    tipo: type,
    fecha_valoracion: date!,
    observaciones: text(data, "observaciones") || undefined,
  });
  return (
    result ??
    success(
      "Valoración registrada",
      "Ya puedes añadir las medidas clínicas desde la tabla.",
    )
  );
}

export async function updateValuation(
  valuationId: number,
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const result = await mutate(`/clinica/valoraciones/${valuationId}`, "PATCH", {
    observaciones: text(data, "observaciones") || "",
  });
  return result ?? success("Valoración actualizada", "Las observaciones fueron guardadas.");
}

export async function saveValuationMeasures(
  valuationId: number,
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const medidas: Array<{ id_tipo_medida: number; valor: string }> = [];
  const fieldErrors: Record<string, string> = {};
  for (const [name, raw] of data.entries()) {
    if (!name.startsWith("measure_")) continue;
    const measureId = Number(name.slice(8));
    const value = typeof raw === "string" ? raw.trim().replace(",", ".") : "";
    if (!value) continue;
    if (!Number.isInteger(measureId) || measureId < 1 || !/^-?\d+(?:\.\d{1,2})?$/.test(value)) {
      fieldErrors[name] = "Ingresa un número con máximo dos decimales.";
      continue;
    }
    medidas.push({ id_tipo_medida: measureId, valor: value });
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (!medidas.length) return failure("Ingresa al menos una medida.");
  const result = await mutate(
    `/clinica/valoraciones/${valuationId}/medidas`,
    "PUT",
    { medidas },
  );
  return result ?? success("Medidas guardadas", "La evolución clínica quedó actualizada.");
}
