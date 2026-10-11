import "server-only";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  PaginatedResponse,
  PaymentMethod,
  PaymentStatus,
  SaleNote,
  SaleNoteStatus,
  SalePayment,
  SalesOptions,
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
          "No fue posible cargar las ventas.",
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
const qs = (data: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  return p.toString();
};
export const getSaleNotes = (p: {
  page: number;
  limit: number;
  search?: string;
  estado?: SaleNoteStatus;
}) => request<PaginatedResponse<SaleNote>>(`/ventas/notas?${qs(p)}`);
export const getPayments = (p: {
  page: number;
  limit: number;
  search?: string;
  estado?: PaymentStatus;
  tipo?: PaymentMethod;
}) => request<PaginatedResponse<SalePayment>>(`/ventas/pagos?${qs(p)}`);
export const getSalesOptions = () => request<SalesOptions>("/ventas/opciones");
