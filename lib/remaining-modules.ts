import "server-only";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  Acquisition,
  AcquisitionOptions,
  AcquisitionStatus,
  Company,
  GeneralStatus,
  InventoryOperationOptions,
  PaginatedResponse,
  StockOperation,
} from "@/lib/types";
type Result<T> =
  | { ok: true; value: T; message?: never }
  | { ok: false; status: number; message: string };
async function request<T>(path: string): Promise<Result<T>> {
  const token = await getSessionToken();
  if (!token)
    return { ok: false, status: 401, message: "La sesión no está disponible." };
  try {
    const r = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok)
      return {
        ok: false,
        status: r.status,
        message:
          (await readApiMessage(r)) || "No fue posible cargar la información.",
      };
    return { ok: true, value: (await r.json()) as T };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "No pudimos conectar con el servidor.",
    };
  }
}
const q = (data: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  return p.toString();
};
export const getAcquisitions = (p: {
  page: number;
  limit: number;
  search?: string;
  estado?: AcquisitionStatus;
}) => request<PaginatedResponse<Acquisition>>(`/adquisiciones?${q(p)}`);
export const getAcquisitionOptions = () =>
  request<AcquisitionOptions>("/adquisiciones/opciones");
export const getOperationOptions = () =>
  request<InventoryOperationOptions>("/inventario/operaciones-opciones");
export const getConsumptions = (p: {
  page: number;
  limit: number;
  search?: string;
}) =>
  request<PaginatedResponse<StockOperation>>(
    `/inventario/consumos-sesion?${q(p)}`,
  );
export const getSaleOutputs = (p: {
  page: number;
  limit: number;
  search?: string;
}) =>
  request<PaginatedResponse<StockOperation>>(
    `/inventario/salidas-venta?${q(p)}`,
  );
export const getCompanies = (p: {
  page: number;
  limit: number;
  search?: string;
  estado?: GeneralStatus;
}) => request<PaginatedResponse<Company>>(`/empresa?${q(p)}`);
