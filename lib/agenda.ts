import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  AgendaOptions,
  AppointmentListItem,
  AppointmentStatus,
  PaginatedResponse,
} from "@/lib/types";

export type AgendaResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

async function agendaRequest<T>(path: string): Promise<AgendaResult<T>> {
  const token = await getSessionToken();
  if (!token)
    return { ok: false, status: 401, message: "La sesión no está disponible." };

  try {
    const response = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          (await readApiMessage(response)) || "No fue posible cargar la agenda.",
      };
    }
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "No pudimos conectar con el servidor.",
    };
  }
}

export function getAppointments(query: {
  desde: string;
  hasta: string;
  estado?: AppointmentStatus;
  id_personal?: number;
  search?: string;
}) {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    desde: query.desde,
    hasta: query.hasta,
  });
  if (query.estado) params.set("estado", query.estado);
  if (query.id_personal)
    params.set("id_personal", String(query.id_personal));
  if (query.search) params.set("search", query.search);
  return agendaRequest<PaginatedResponse<AppointmentListItem>>(
    `/agenda/citas?${params}`,
  );
}

export function getAgendaOptions() {
  return agendaRequest<AgendaOptions>("/agenda/opciones");
}
