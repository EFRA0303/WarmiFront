import "server-only";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  AccessItem,
  AppointmentNotification,
  AuditConfig,
  AuditEventItem,
  Company,
  DocumentConfig,
  NotificationOption,
  NotificationStatus,
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
const q = (x: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(x).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  return p.toString();
};
export const getDocumentConfigs = () =>
  request<PaginatedResponse<DocumentConfig>>(
    "/empresa/configuraciones-documentos/listar?page=1&limit=100",
  );
export const getDocumentCompanies = () =>
  request<PaginatedResponse<Company>>("/empresa?page=1&limit=100");
export const getAudit = (p: {
  page: number;
  limit: number;
  search?: string;
  tipo?: string;
}) => request<PaginatedResponse<AuditEventItem>>(`/auditoria?${q(p)}`);
export const getAccesses = (p: {
  page: number;
  limit: number;
  search?: string;
  login_exitoso?: boolean;
}) => request<PaginatedResponse<AccessItem>>(`/accesos-usuario?${q(p)}`);
export const getAuditConfigs = () =>
  request<PaginatedResponse<AuditConfig>>(
    "/configuracion-auditoria?page=1&limit=100",
  );
export const getNotifications = (params: {
  page: number;
  limit: number;
  search?: string;
  estado?: NotificationStatus;
}) =>
  request<PaginatedResponse<AppointmentNotification>>(
    `/agenda/notificaciones?${q(params)}`,
  );
export const getNotificationOptions = () =>
  request<NotificationOption[]>("/agenda/notificaciones-opciones/listar");
