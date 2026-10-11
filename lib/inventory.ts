import "server-only";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  GeneralStatus,
  InventoryLot,
  InventoryMovement,
  InventoryMovementType,
  InventoryOptions,
  InventoryProduct,
  LotStatus,
  PaginatedResponse,
} from "@/lib/types";
type Result<T> =
  | { ok: true; value: T; message?: never }
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
          "No fue posible cargar el inventario.",
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
function query(params: Record<string, string | number | undefined>) {
  const value = new URLSearchParams();
  Object.entries(params).forEach(([key, item]) => {
    if (item !== undefined && item !== "") value.set(key, String(item));
  });
  return value.toString();
}
export const getInventoryProducts = (params: {
  page: number;
  limit: number;
  search?: string;
  estado?: GeneralStatus;
}) =>
  request<PaginatedResponse<InventoryProduct>>(
    `/inventario/productos?${query(params)}`,
  );
export const getInventoryLots = (params: {
  page: number;
  limit: number;
  search?: string;
  estado?: LotStatus;
  id_producto?: number;
}) =>
  request<PaginatedResponse<InventoryLot>>(
    `/inventario/lotes?${query(params)}`,
  );
export const getInventoryMovements = (params: {
  page: number;
  limit: number;
  search?: string;
  tipo?: InventoryMovementType;
  id_producto?: number;
  id_lote?: number;
}) =>
  request<PaginatedResponse<InventoryMovement>>(
    `/inventario/movimientos?${query(params)}`,
  );
export const getInventoryOptions = () =>
  request<InventoryOptions>("/inventario/opciones");
