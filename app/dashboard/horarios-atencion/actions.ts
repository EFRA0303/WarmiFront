"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { BusinessHours, RegistrationState } from "@/lib/types";

export async function updateBusinessHours(
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const raw = formData.get("configuracion");
  let body: Pick<BusinessHours, "intervalo_minutos" | "horarios_semanales" | "excepciones" | "feriados">;
  try {
    body = JSON.parse(typeof raw === "string" ? raw : "") as typeof body;
  } catch {
    return { fieldErrors: { form: "No se pudo interpretar la configuración." } };
  }
  if (!Number.isInteger(body.intervalo_minutos) || !body.horarios_semanales?.length)
    return { fieldErrors: { form: "Configura al menos un día de atención." } };

  const token = await getSessionToken();
  if (!token)
    return { resultId: randomUUID(), outcome: "error", title: "La sesión venció", message: "Vuelve a iniciar sesión para guardar la configuración." };
  try {
    const response = await fetch(backendUrl("/empresa/horario-atencion"), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok)
      return { resultId: randomUUID(), outcome: "error", title: "Horario no actualizado", message: (await readApiMessage(response)) || "No fue posible guardar el horario de atención." };
  } catch {
    return { resultId: randomUUID(), outcome: "error", title: "Servidor no disponible", message: "No pudimos conectar con el servidor." };
  }
  revalidatePath("/dashboard/horarios-atencion");
  revalidatePath("/dashboard/agenda");
  return { resultId: randomUUID(), outcome: "success", title: "Horario actualizado", message: "La agenda ya utiliza los horarios semanales y las excepciones configuradas." };
}
