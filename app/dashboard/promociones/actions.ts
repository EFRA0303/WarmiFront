"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { PromotionStatus, RegistrationState } from "@/lib/types";

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const failure = (message: string): RegistrationState => ({
  resultId: randomUUID(), outcome: "error", title: "No se pudo completar", message,
});
const success = (title: string, message: string): RegistrationState => ({
  resultId: randomUUID(), outcome: "success", title, message,
});

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
  revalidatePath("/dashboard/promociones");
  return null;
}

function isoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-04:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function promotionData(data: FormData, includeRules = true) {
  const nombre = text(data, "nombre");
  const descripcion = text(data, "descripcion");
  const fieldErrors: Record<string, string> = {};
  if (!nombre) fieldErrors.nombre = "Ingresa el nombre de la promoción.";
  const body: Record<string, string | undefined> = { nombre, descripcion: descripcion || undefined };
  if (includeRules) {
    const tipo = text(data, "tipo_descuento");
    const valor = text(data, "valor_descuento").replace(",", ".");
    const inicio = isoDate(text(data, "fecha_inicio"));
    const fin = isoDate(text(data, "fecha_fin"));
    if (!new Set(["PORCENTAJE", "MONTO_FIJO"]).has(tipo)) fieldErrors.tipo_descuento = "Selecciona un tipo de descuento.";
    if (!/^\d+(?:\.\d{1,2})?$/.test(valor) || (tipo === "PORCENTAJE" && Number(valor) > 100)) fieldErrors.valor_descuento = tipo === "PORCENTAJE" ? "El porcentaje debe estar entre 0 y 100." : "Ingresa un monto válido.";
    if (!inicio) fieldErrors.fecha_inicio = "Selecciona una fecha y hora de inicio.";
    if (!fin) fieldErrors.fecha_fin = "Selecciona una fecha y hora de finalización.";
    if (inicio && fin && new Date(inicio) >= new Date(fin)) fieldErrors.fecha_fin = "La finalización debe ser posterior al inicio.";
    Object.assign(body, { tipo_descuento: tipo, valor_descuento: valor, fecha_inicio: inicio || undefined, fecha_fin: fin || undefined });
  }
  return { fieldErrors, body };
}

export async function createPromotion(_state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const parsed = promotionData(data);
  if (Object.keys(parsed.fieldErrors).length) return { fieldErrors: parsed.fieldErrors };
  const result = await mutate("/comercial/promociones", "POST", parsed.body);
  return result ?? success("Promoción creada", "La promoción quedó programada. Ahora puedes configurar sus servicios.");
}

export async function updatePromotion(id: number, status: PromotionStatus, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const parsed = promotionData(data, status === "PROGRAMADA");
  if (Object.keys(parsed.fieldErrors).length) return { fieldErrors: parsed.fieldErrors };
  const result = await mutate(`/comercial/promociones/${id}`, "PATCH", parsed.body);
  return result ?? success("Promoción actualizada", "Los cambios fueron guardados.");
}

export async function changePromotionStatus(id: number, estado: PromotionStatus): Promise<RegistrationState> {
  if (!new Set(["ACTIVA", "FINALIZADA", "CANCELADA"]).has(estado)) return failure("Estado no válido.");
  const result = await mutate(`/comercial/promociones/${id}`, "PATCH", { estado });
  const labels = { ACTIVA: "activada", FINALIZADA: "finalizada", CANCELADA: "cancelada", PROGRAMADA: "programada" };
  return result ?? success(`Promoción ${labels[estado]}`, "El estado comercial se actualizó correctamente.");
}

export async function savePromotionServices(id: number, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const servicios: Array<{ id_servicio: number; sesiones_incluidas: number }> = [];
  const fieldErrors: Record<string, string> = {};
  for (const [name, raw] of data.entries()) {
    if (!name.startsWith("service_")) continue;
    const serviceId = Number(name.slice(8));
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    const sessions = Number(value);
    if (!Number.isInteger(serviceId) || serviceId < 1 || !Number.isInteger(sessions) || sessions < 1) {
      fieldErrors[name] = "Indica una cantidad entera mayor a cero.";
      continue;
    }
    servicios.push({ id_servicio: serviceId, sesiones_incluidas: sessions });
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (!servicios.length) return failure("Configura al menos un servicio dentro de la promoción.");
  const result = await mutate(`/comercial/promociones/${id}/servicios`, "PUT", { servicios });
  return result ?? success("Servicios configurados", "Las sesiones incluidas en la promoción fueron actualizadas.");
}
