import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  ClinicalSession,
  PaginatedResponse,
  SessionOptions,
  SessionStatus,
} from "@/lib/types";

export type SessionResult<T> =
  { ok: true; value: T } | { ok: false; status: number; message: string };
async function request<T>(path: string): Promise<SessionResult<T>> {
  const token = await getSessionToken();
  if (!token)
    return { ok: false, status: 401, message: "La sesión no está disponible." };
  try {
    const response = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok)
      return {
        ok: false,
        status: response.status,
        message:
          (await readApiMessage(response)) ||
          "No fue posible cargar las sesiones.",
      };
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "No pudimos conectar con el servidor.",
    };
  }
}

export function getSessions(query: {
  page: number;
  limit: number;
  search?: string;
  estado?: SessionStatus;
  id_paciente?: number;
  id_tratamiento?: number;
}) {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.search) params.set("search", query.search);
  if (query.estado) params.set("estado", query.estado);
  if (query.id_paciente) params.set("id_paciente", String(query.id_paciente));
  if (query.id_tratamiento) params.set("id_tratamiento", String(query.id_tratamiento));
  return request<PaginatedResponse<ClinicalSession>>(
    `/clinica/sesiones?${params}`,
  );
}
export function getSessionOptions() {
  return request<SessionOptions>("/clinica/sesiones-opciones");
}
