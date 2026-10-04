import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  PaginatedResponse,
  PermissionListItem,
  RoleListItem,
  RolePermissionAssignment,
  RoleWithPermissions,
  UserListItem,
  UserPermissionContext,
  UserPermissionAssignment,
} from "@/lib/types";

export type AccessResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

async function authorizedGet<T>(path: string, token: string): Promise<AccessResult<T>> {
  try {
    const response = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, status: response.status, message: (await readApiMessage(response)) || "No fue posible cargar la información." };
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0, message: "No pudimos conectar con el servidor." };
  }
}

export async function getRolesAndPermissions(): Promise<AccessResult<{ roles: RoleWithPermissions[]; permissions: PermissionListItem[] }>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, status: 401, message: "La sesión no está disponible." };
  const [rolesResult, permissionsResult] = await Promise.all([
    authorizedGet<PaginatedResponse<RoleListItem>>("/roles?page=1&limit=100", token),
    authorizedGet<PaginatedResponse<PermissionListItem>>("/permisos?page=1&limit=100", token),
  ]);
  if (!rolesResult.ok) return rolesResult;
  if (!permissionsResult.ok) return permissionsResult;
  const assignments = await Promise.all(
    rolesResult.value.data.map((role) => authorizedGet<RolePermissionAssignment[]>(`/roles/${role.id_rol}/permisos`, token)),
  );
  const failed = assignments.find((result) => !result.ok);
  if (failed && !failed.ok) return failed;
  return {
    ok: true,
    value: {
      permissions: permissionsResult.value.data,
      roles: rolesResult.value.data.map((role, index) => ({
        ...role,
        permissionIds: assignments[index].ok ? assignments[index].value.map((item) => item.id_permiso) : [],
      })),
    },
  };
}

export async function getUsersPermissionContexts(users: UserListItem[]): Promise<Record<number, UserPermissionContext>> {
  const token = await getSessionToken();
  if (!token || !users.length) return {};
  const permissionsResult = await authorizedGet<PaginatedResponse<PermissionListItem>>("/permisos?page=1&limit=100&estado=ACTIVO", token);
  if (!permissionsResult.ok) return {};
  const roleIds = [...new Set(users.map((user) => user.id_rol))];
  const [roleResults, userResults] = await Promise.all([
    Promise.all(roleIds.map(async (id) => [id, await authorizedGet<RolePermissionAssignment[]>(`/roles/${id}/permisos`, token)] as const)),
    Promise.all(users.map(async (user) => [user.id_usuario, await authorizedGet<UserPermissionAssignment[]>(`/permisos/usuarios/${user.id_usuario}`, token)] as const)),
  ]);
  const byRole = new Map<number, number[]>();
  for (const [id, result] of roleResults) if (result.ok) byRole.set(id, result.value.map((item) => item.id_permiso));
  const byUser = new Map<number, UserPermissionAssignment[]>();
  for (const [id, result] of userResults) if (result.ok) byUser.set(id, result.value);
  return Object.fromEntries(users.map((user) => [user.id_usuario, {
    permissions: permissionsResult.value.data,
    rolePermissionIds: byRole.get(user.id_rol) ?? [],
    exceptions: byUser.get(user.id_usuario) ?? [],
  }]));
}
