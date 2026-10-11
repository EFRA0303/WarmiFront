"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState } from "@/lib/types";
const text = (d: FormData, n: string) => {
  const v = d.get(n);
  return typeof v === "string" ? v.trim() : "";
};
const fail = (message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "error",
  title: "No se pudo completar",
  message,
});
const done = (title: string, message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "success",
  title,
  message,
});
async function mutate(path: string, method: "POST" | "PATCH", body: object) {
  const token = await getSessionToken();
  if (!token) return fail("La sesión venció.");
  try {
    const r = await fetch(backendUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok)
      return fail(
        (await readApiMessage(r)) || "La operación no pudo completarse.",
      );
  } catch {
    return fail("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard", "layout");
  return null;
}
export async function saveDocumentConfig(
  id: number | null,
  _s: RegistrationState,
  d: FormData,
): Promise<RegistrationState> {
  const company = Number(text(d, "id_empresa"));
  if (!Number.isInteger(company) || company < 1)
    return { fieldErrors: { id_empresa: "Selecciona una empresa." } };
  const body = {
    id_empresa: company,
    encabezado: text(d, "encabezado") || undefined,
    pie_pagina: text(d, "pie_pagina") || undefined,
    mostrar_logo: d.get("mostrar_logo") === "on",
    mostrar_direccion: d.get("mostrar_direccion") === "on",
    mostrar_telefono: d.get("mostrar_telefono") === "on",
    mostrar_correo: d.get("mostrar_correo") === "on",
  };
  const r = await mutate(
    id
      ? `/empresa/configuraciones-documentos/${id}`
      : "/empresa/configuraciones-documentos",
    id ? "PATCH" : "POST",
    body,
  );
  return (
    r ??
    done(
      "Configuración guardada",
      "Los documentos usarán la nueva presentación.",
    )
  );
}
export async function saveAuditConfig(
  id: number | null,
  _s: RegistrationState,
  d: FormData,
): Promise<RegistrationState> {
  const code = text(d, "codigo_evento").toUpperCase(),
    name = text(d, "nombre"),
    category = text(d, "categoria");
  const errors: Record<string, string> = {};
  if (!code) errors.codigo_evento = "Ingresa el código.";
  if (!name) errors.nombre = "Ingresa el nombre.";
  if (!category) errors.categoria = "Ingresa la categoría.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const body = {
    codigo_evento: code,
    nombre: name,
    categoria: category,
    descripcion: text(d, "descripcion") || undefined,
    habilitado: d.get("habilitado") === "on",
  };
  const r = await mutate(
    id ? `/configuracion-auditoria/${id}` : "/configuracion-auditoria",
    id ? "PATCH" : "POST",
    body,
  );
  return (
    r ??
    done("Regla guardada", "La configuración de auditoría fue actualizada.")
  );
}

export async function createNotification(
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const appointment = Number(text(data, "id_cita"));
  const scheduled = text(data, "programada_para");
  const errors: Record<string, string> = {};
  if (!Number.isInteger(appointment) || appointment < 1)
    errors.id_cita = "Selecciona una cita.";
  if (!scheduled) errors.programada_para = "Selecciona la fecha y hora.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const result = await mutate("/agenda/notificaciones", "POST", {
    id_cita: appointment,
    tipo: text(data, "tipo"),
    canal: text(data, "canal"),
    programada_para: new Date(`${scheduled}:00-04:00`).toISOString(),
  });
  return (
    result ??
    done("Notificación programada", "El recordatorio quedó registrado.")
  );
}

export async function changeNotification(
  id: number,
  estado: "ENVIADA" | "ERROR" | "CANCELADA",
): Promise<RegistrationState> {
  const result = await mutate(`/agenda/notificaciones/${id}`, "PATCH", {
    estado,
    ...(estado === "ENVIADA" ? { enviada_en: new Date().toISOString() } : {}),
  });
  return (
    result ??
    done("Notificación actualizada", "El estado del envío fue registrado.")
  );
}
