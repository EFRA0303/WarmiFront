import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { BusinessHours } from "@/lib/types";

export type BusinessHoursResult =
  | { ok: true; value: BusinessHours }
  | { ok: false; status: number; message: string };

export async function getBusinessHours(): Promise<BusinessHoursResult> {
  const token = await getSessionToken();
  if (!token)
    return { ok: false, status: 401, message: "La sesión no está disponible." };
  try {
    const response = await fetch(backendUrl("/empresa/horario-atencion"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok)
      return {
        ok: false,
        status: response.status,
        message:
          (await readApiMessage(response)) ||
          "No fue posible cargar el horario de atención.",
      };
    return { ok: true, value: (await response.json()) as BusinessHours };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "No pudimos conectar con el servidor.",
    };
  }
}
