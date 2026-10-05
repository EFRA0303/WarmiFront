import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GeneralStatusFilter } from "@/components/directory-controls";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getStaff } from "@/lib/people";
import type { GeneralStatus, StaffListItem } from "@/lib/types";
import { getActiveRoles } from "@/lib/people";
import { StaffRegistrationDialog } from "@/components/registration-dialogs";
import { StaffEditDialog } from "@/components/people-edit-dialogs";
import { GeneralStatusControl } from "@/components/general-status-control";
import { changeStaffStatus } from "./actions";
import "../people.css";

export const metadata: Metadata = { title: "Personal" };
const PAGE_SIZE = 10;
const statuses = new Set<GeneralStatus>(["ACTIVO", "BAJA"]);
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function person(staff: StaffListItem) { return staff.usuario.persona; }
function name(staff: StaffListItem) { const p = person(staff); return [p.nombre, p.ap_paterno, p.ap_materno].filter(Boolean).join(" "); }
function initials(staff: StaffListItem) { const p = person(staff); return [p.nombre, p.ap_paterno].filter(Boolean).map((part) => part[0]).join("").toUpperCase(); }
function date(value: string) { const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" }).format(parsed); }
function url(page: number, search: string, estado?: GeneralStatus) { const p = new URLSearchParams(); if (search) p.set("search", search); if (estado) p.set("estado", estado); if (page > 1) p.set("page", String(page)); return p.size ? `/dashboard/personal?${p}` : "/dashboard/personal"; }

export default async function StaffPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawStatus = one(params.estado)?.toUpperCase() as GeneralStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const [result, currentUser] = await Promise.all([getStaff({ page, limit: PAGE_SIZE, search, estado }), getCurrentUser()]);
  if (!result.ok && result.status === 401) redirect("/login");
  const required = ["personas.crear", "usuarios.crear", "roles.asignar", "roles.leer", "personal.crear"];
  const canCreate = Boolean(currentUser && required.every((permission) => currentUser.permisos.includes(permission)));
  const editPermissions = ["personas.actualizar", "usuarios.actualizar", "personal.actualizar"];
  const canEdit = Boolean(currentUser && editPermissions.every((permission) => currentUser.permisos.includes(permission)));
  const canChangeStatus = Boolean(
    currentUser?.permisos.includes("personal.actualizar") &&
    currentUser.permisos.includes("usuarios.actualizar"),
  );
  if (!result.ok) return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{result.status === 403 ? "Acceso restringido" : "No pudimos cargar el personal"}</h2><p>{result.status === 403 ? "Tu cuenta no tiene permiso para consultar el personal." : result.message}</p></div></div></section>;

  const rolesResult = canCreate ? await getActiveRoles() : null;

  const { data, total, limit } = result.value;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return <section className="directory-page">
    <header className="directory-heading"><div><span className="page-eyebrow">EQUIPO DE TRABAJO</span><h1>Personal</h1><p>Gestiona las cuentas y datos laborales del equipo.</p></div>{canCreate && rolesResult?.ok && <StaffRegistrationDialog roles={rolesResult.value.data} />}</header>
    {one(params.creado) === "1" && <div className="directory-success">Empleado creado correctamente.</div>}
    <div className="directory-toolbar"><form action="/dashboard/personal" method="get"><label className="directory-search"><SearchIcon /><input name="search" type="search" defaultValue={search} placeholder="Buscar por nombre, correo, profesión o cargo..." maxLength={150} /></label><GeneralStatusFilter initialValue={estado} /><button className="directory-filter" type="submit">Buscar</button>{(search || estado) && <Link className="directory-clear" href="/dashboard/personal">Limpiar</Link>}</form></div>
    {data.length ? <>
      <div className="directory-table-card"><div className="directory-table-scroll"><table className="directory-table directory-table--staff"><thead><tr><th>Empleado</th><th>Cuenta</th><th>Función</th><th>Rol</th><th>Ingreso</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr></thead><tbody>{data.map((staff) => <tr key={staff.id_personal}>
        <td><div className="directory-person"><span>{initials(staff) || "WE"}</span><div><strong>{name(staff)}</strong><small>Personal #{staff.id_personal}</small></div></div></td>
        <td><div className="directory-stacked"><strong>{staff.usuario.correo_acceso}</strong><small>@{staff.usuario.nombre_usuario || "sin-usuario"}</small></div></td>
        <td><div className="directory-stacked"><strong>{staff.cargo}</strong><small>{staff.profesion}</small></div></td>
        <td><span className="directory-role">{staff.usuario.rol.nombre}</span></td><td><span className="directory-main-value">{date(staff.fecha_ingreso)}</span></td><td>{canChangeStatus ? <GeneralStatusControl id={staff.id_personal} name={name(staff)} status={staff.estado} reason={staff.motivo_baja} accessPolicy="required" action={changeStaffStatus} /> : <StatusBadge status={staff.estado} />}</td>{canEdit && <td><StaffEditDialog staff={staff} /></td>}
      </tr>)}</tbody></table></div></div>
      <div className="directory-mobile-list">{data.map((staff) => <article className="directory-mobile-card" key={staff.id_personal}><div className="directory-card-head"><div className="directory-person"><span>{initials(staff) || "WE"}</span><div><strong>{name(staff)}</strong><small>{staff.usuario.correo_acceso}</small></div></div>{canChangeStatus ? <GeneralStatusControl id={staff.id_personal} name={name(staff)} status={staff.estado} reason={staff.motivo_baja} accessPolicy="required" action={changeStaffStatus} /> : <StatusBadge status={staff.estado} />}</div><dl><div><dt>Cargo</dt><dd>{staff.cargo}</dd></div><div><dt>Profesión</dt><dd>{staff.profesion}</dd></div><div><dt>Rol</dt><dd>{staff.usuario.rol.nombre}</dd></div><div><dt>Ingreso</dt><dd>{date(staff.fecha_ingreso)}</dd></div></dl>{canEdit && <div className="directory-card-actions"><StaffEditDialog staff={staff} /></div>}</article>)}</div>
      <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link className={current === 1 ? "disabled" : ""} href={url(current - 1, search, estado)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link className={current === pages ? "disabled" : ""} href={url(current + 1, search, estado)}><ChevronRightIcon /></Link></nav>}</footer>
    </> : <div className="directory-message"><b>i</b><div><h2>No encontramos personal</h2><p>{search || estado ? "Prueba con otros filtros." : "Todavía no existen empleados registrados."}</p></div>{(search || estado) && <Link className="directory-clear" href="/dashboard/personal">Ver todos</Link>}</div>}
  </section>;
}

function StatusBadge({ status }: { status: GeneralStatus }) { return <span className={`directory-status directory-status--${status.toLowerCase()}`}><span />{status === "ACTIVO" ? "Activo" : "Baja"}</span>; }
