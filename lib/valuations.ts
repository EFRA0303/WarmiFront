import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  ClinicalValuation,
  PaginatedResponse,
  ValuationOptions,
  ValuationType,
} from "@/lib/types";

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };
async function request<T>(path: string): Promise<Result<T>> {
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
          "No fue posible cargar las valoraciones.",
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

export function getValuations(query: {
  page: number;
  limit: number;
  search?: string;
  tipo?: ValuationType;
  id_paciente?: number;
  id_tratamiento?: number;
  id_sesion?: number;
}) {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.search) params.set("search", query.search);
  if (query.tipo) params.set("tipo", query.tipo);
  for (const key of ["id_paciente", "id_tratamiento", "id_sesion"] as const) if (query[key]) params.set(key, String(query[key]));
  return request<PaginatedResponse<ClinicalValuation>>(
    `/clinica/valoraciones?${params}`,
  );
}
export function getValuationOptions() {
  return request<ValuationOptions>("/clinica/valoraciones-opciones");
}
