import "server-only";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { CommercialPromotion, PaginatedResponse, PromotionOptions, PromotionStatus } from "@/lib/types";

type Result<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

async function request<T>(path: string): Promise<Result<T>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, status: 401, message: "La sesión no está disponible." };
  try {
    const response = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: (await readApiMessage(response)) || "No fue posible cargar las promociones.",
      };
    }
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0, message: "No pudimos conectar con el servidor." };
  }
}

export function getPromotions(query: {
  page: number;
  limit: number;
  search?: string;
  estado?: PromotionStatus;
}) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.search) params.set("search", query.search);
  if (query.estado) params.set("estado", query.estado);
  return request<PaginatedResponse<CommercialPromotion>>(`/comercial/promociones?${params}`);
}

export function getPromotionOptions() {
  return request<PromotionOptions>("/comercial/promociones-opciones");
}
