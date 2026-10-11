import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { AvailabilityData, AvailabilityStaff, ExtraSchedule, PaginatedResponse, RegularSchedule, StaffBlock } from "@/lib/types";

export type AvailabilityResult<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

async function request<T>(path: string, token: string): Promise<AvailabilityResult<T>> {
  try {
    const response = await fetch(backendUrl(path), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) return { ok: false, status: response.status, message: (await readApiMessage(response)) || "No fue posible cargar la disponibilidad." };
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0, message: "No pudimos conectar con el servidor." };
  }
}

export async function getAvailability(): Promise<AvailabilityResult<AvailabilityData>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, status: 401, message: "La sesión no está disponible." };
  const [staff, schedules, extras, blocks] = await Promise.all([
    request<AvailabilityStaff[]>("/disponibilidad/opciones", token),
    request<PaginatedResponse<RegularSchedule>>("/disponibilidad/horarios?limit=100", token),
    request<PaginatedResponse<ExtraSchedule>>("/disponibilidad/horarios-extra?limit=100", token),
    request<PaginatedResponse<StaffBlock>>("/disponibilidad/bloqueos?limit=100", token),
  ]);
  const failed = [staff, schedules, extras, blocks].find((result) => !result.ok);
  if (failed && !failed.ok) return failed;
  if (!staff.ok || !schedules.ok || !extras.ok || !blocks.ok) return { ok: false, status: 0, message: "No fue posible cargar la disponibilidad." };
  return { ok: true, value: { staff: staff.value, schedules: schedules.value.data, extras: extras.value.data, blocks: blocks.value.data } };
}
