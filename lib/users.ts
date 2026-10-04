import "server-only";

import { backendUrl, readApiMessage } from "@/lib/backend";
import { getSessionToken } from "@/lib/auth";
import type {
  PaginatedResponse,
  UserListItem,
  UserStatus,
  UserType,
} from "@/lib/types";

type UsersQuery = {
  page: number;
  limit: number;
  search?: string;
  estado?: UserStatus;
  tipo?: UserType;
};

export type UsersResult =
  | { ok: true; value: PaginatedResponse<UserListItem> }
  | { ok: false; status: number; message: string };

export async function getUsers(query: UsersQuery): Promise<UsersResult> {
  const token = await getSessionToken();
  if (!token) {
    return { ok: false, status: 401, message: "La sesión no está disponible." };
  }

  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.search) params.set("search", query.search);
  if (query.estado) params.set("estado", query.estado);
  if (query.tipo) params.set("tipo", query.tipo);

  try {
    const response = await fetch(backendUrl(`/usuarios?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          (await readApiMessage(response)) ||
          "No fue posible consultar los usuarios.",
      };
    }

    return {
      ok: true,
      value: (await response.json()) as PaginatedResponse<UserListItem>,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message:
        "No pudimos conectar con el servidor. Verifica que el backend esté activo.",
    };
  }
}
