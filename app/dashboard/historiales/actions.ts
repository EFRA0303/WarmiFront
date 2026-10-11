"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { HistoryStatus, RegistrationState } from "@/lib/types";

const text = (data: FormData, name: string) => { const value = data.get(name); return typeof value === "string" ? value.trim() : ""; };
const failure = (message: string): RegistrationState => ({ resultId: randomUUID(), outcome: "error", title: "No se pudo completar", message });
const success = (title: string, message: string): RegistrationState => ({ resultId: randomUUID(), outcome: "success", title, message });
async function request(path: string, method: "POST" | "PATCH", body: object) {
  const token = await getSessionToken();
  if (!token) return { error: failure("La sesión venció. Vuelve a iniciar sesión.") };
  try {
    const response = await fetch(backendUrl(path), { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!response.ok) return { error: failure((await readApiMessage(response)) || "La operación no pudo completarse.") };
    return { value: (await response.json()) as { id_historial: number } };
  } catch {
    return { error: failure("No pudimos conectar con el servidor.") };
  }
}
function refresh() { revalidatePath("/dashboard/historiales"); revalidatePath("/dashboard/pacientes"); }
export async function createHistory(_state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const patientId = Number(text(data, "id_paciente"));
  if (!Number.isInteger(patientId) || patientId < 1) return { fieldErrors: { id_paciente: "Selecciona al paciente." } };
  const result = await request("/historiales", "POST", { id_paciente: patientId, observaciones_generales: text(data, "observaciones_generales") || undefined });
  if (result.error) return result.error;
  refresh(); return success("Historial abierto", "El expediente clínico ya está disponible.");
}
export async function openPatientHistory(patientId: number): Promise<{ ok: boolean; id?: number; message?: string }> {
  if (!Number.isInteger(patientId) || patientId < 1) return { ok: false, message: "Paciente no válido." };
  const result = await request("/historiales", "POST", { id_paciente: patientId });
  if (result.error) return { ok: false, message: result.error.message };
  refresh(); return { ok: true, id: result.value?.id_historial };
}
export async function updateHistory(historyId: number, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const result = await request(`/historiales/${historyId}`, "PATCH", { observaciones_generales: text(data, "observaciones_generales") || "" });
  if (result.error) return result.error;
  refresh(); revalidatePath(`/dashboard/historiales/${historyId}`); return success("Historial actualizado", "Las observaciones generales fueron guardadas.");
}
export async function changeHistoryStatus(historyId: number, estado: HistoryStatus): Promise<RegistrationState> {
  const result = await request(`/historiales/${historyId}`, "PATCH", { estado });
  if (result.error) return result.error;
  refresh(); revalidatePath(`/dashboard/historiales/${historyId}`); return success(estado === "ACTIVO" ? "Historial reabierto" : "Historial cerrado", estado === "ACTIVO" ? "El expediente vuelve a admitir actividad clínica." : "El expediente se conserva en modo de consulta.");
}
