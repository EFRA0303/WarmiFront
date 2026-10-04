"use server";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";

export type AvailabilityResult = {
  ok: boolean;
  available?: boolean;
  message: string;
};

export async function checkRegistrationAvailability(
  field: "ci" | "telefono1" | "correo_acceso" | "nombre_usuario",
  rawValue: string,
): Promise<AvailabilityResult> {
  const value = rawValue.trim();
  if (!value) return { ok: true, available: true, message: "" };
  const token = await getSessionToken();
  if (!token) return { ok: false, message: "Tu sesión venció." };

  const personField = field === "ci" || field === "telefono1";
  const params = new URLSearchParams({ [field]: field === "correo_acceso" ? value.toLowerCase() : value });
  try {
    const response = await fetch(
      backendUrl(`${personField ? "/personas" : "/usuarios"}/disponibilidad?${params}`),
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!response.ok) return { ok: false, message: (await readApiMessage(response)) || "No pudimos verificar este dato." };
    const body = (await response.json()) as {
      ci_disponible?: boolean;
      telefono1_disponible?: boolean;
      correo_disponible?: boolean;
      nombre_usuario_disponible?: boolean;
    };
    const available = field === "ci" ? body.ci_disponible : field === "telefono1" ? body.telefono1_disponible : field === "correo_acceso" ? body.correo_disponible : body.nombre_usuario_disponible;
    const labels = { ci: "CI", telefono1: "teléfono principal", correo_acceso: "correo", nombre_usuario: "nombre de usuario" };
    return {
      ok: true,
      available: Boolean(available),
      message: available ? `${labels[field]} disponible.` : `Ya existe un registro con este ${labels[field]}.`,
    };
  } catch {
    return { ok: false, message: "No pudimos verificar este dato." };
  }
}
