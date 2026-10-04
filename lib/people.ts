import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  GeneralStatus,
  PaginatedResponse,
  PatientListItem,
  RoleListItem,
  StaffListItem,
} from "@/lib/types";

type DirectoryQuery = {
  page: number;
  limit: number;
  search?: string;
  estado?: GeneralStatus;
};

export type DirectoryResult<T> =
  | { ok: true; value: PaginatedResponse<T> }
  | { ok: false; status: number; message: string };

async function getDirectory<T>(
  path: string,
  query: DirectoryQuery,
): Promise<DirectoryResult<T>> {
  const token = await getSessionToken();
  if (!token)
    return { ok: false, status: 401, message: "La sesión no está disponible." };

  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.search) params.set("search", query.search);
  if (query.estado) params.set("estado", query.estado);

  try {
    const response = await fetch(
      backendUrl(`${path}?${params.toString()}`),
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: (await readApiMessage(response)) || "No fue posible cargar los registros.",
      };
    }
    return { ok: true, value: (await response.json()) as PaginatedResponse<T> };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "No pudimos conectar con el servidor. Verifica que el backend esté activo.",
    };
  }
}

export function getPatients(query: DirectoryQuery) {
  return getDirectory<PatientListItem>("/pacientes", query);
}

export function getStaff(query: DirectoryQuery) {
  return getDirectory<StaffListItem>("/personal", query);
}

export async function getActiveRoles(): Promise<DirectoryResult<RoleListItem>> {
  return getDirectory<RoleListItem>("/roles", {
    page: 1,
    limit: 100,
    estado: "ACTIVO",
  });
}
