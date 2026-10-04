import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessControlPanel } from "@/components/access-control-panel";
import { getCurrentUser } from "@/lib/auth";
import { getRolesAndPermissions } from "@/lib/access-control";
import "./roles-permissions.css";
import "../../people.css";

export const metadata: Metadata = { title: "Roles y permisos" };

export default async function RolesPermissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canRead = user.permisos.includes("roles.leer") && user.permisos.includes("permisos.leer");
  if (!canRead) return <section className="access-page"><div className="directory-message"><b>!</b><div><h2>Acceso restringido</h2><p>Tu cuenta no tiene permisos para consultar roles y permisos.</p></div></div></section>;
  const result = await getRolesAndPermissions();
  if (!result.ok) return <section className="access-page"><div className="directory-message"><b>!</b><div><h2>No pudimos cargar la configuración</h2><p>{result.message}</p></div></div></section>;
  return <section className="access-page"><AccessControlPanel roles={result.value.roles} permissions={result.value.permissions} canCreate={user.permisos.includes("roles.crear")} canAssign={user.permisos.includes("roles.asignar")} canUpdate={user.permisos.includes("roles.actualizar")} canCreatePermission={user.permisos.includes("permisos.crear")} /></section>;
}
