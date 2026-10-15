import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
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
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { FormattedPhone } from "@/components/formatted-phone";
import { changeStaffStatus } from "./actions";
import "../people.css";

export const metadata: Metadata = { title: "Personal" };
const PAGE_SIZE = 10;
const statuses = new Set<GeneralStatus>(["ACTIVO", "BAJA"]);
const staffColumns = [
  { key: "employee", label: "Empleado" },
  { key: "document", label: "CI" },
  { key: "gender", label: "Género" },
  { key: "profession", label: "Profesión" },
  { key: "admission", label: "Fecha de ingreso" },
  { key: "contact", label: "Contacto" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
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
  return <section className="directory-page" data-directory-scope="staff">
    <header className="directory-heading"><div><span className="page-eyebrow">EQUIPO DE TRABAJO</span><h1>Personal</h1><p>Gestiona las cuentas y datos laborales del equipo.</p></div>{canCreate && rolesResult?.ok && <StaffRegistrationDialog roles={rolesResult.value.data} />}</header>
    {one(params.creado) === "1" && <div className="directory-success">Empleado creado correctamente.</div>}
    <DirectoryTableActions scope="staff" fileName="personal" columns={staffColumns} showActions={canEdit} />
    <div className="directory-toolbar"><form action="/dashboard/personal" method="get"><label className="directory-search"><SearchIcon /><DynamicSearchInput id="staff-search" initialValue={search} placeholder="Buscar por nombre, usuario, correo, profesión o cargo..." basePath="/dashboard/personal" /></label><GeneralStatusFilter initialValue={estado} /></form></div>
    {data.length ? <>
      <div className="directory-table-card"><div className="directory-table-scroll"><table className="directory-table directory-table--staff"><thead><tr><th data-directory-column="employee">Empleado</th><th data-directory-column="document">CI</th><th data-directory-column="gender">Género</th><th data-directory-column="profession">Profesión</th><th data-directory-column="admission">Fecha de ingreso</th><th data-directory-column="contact">Contacto</th><th data-directory-column="status">Estado</th>{canEdit && <th data-directory-column="actions">Acciones</th>}</tr></thead><tbody>{data.map((staff) => <tr key={staff.id_personal}>
        <td data-directory-column="employee"><div className="directory-person">{staff.usuario.foto_perfil_ruta ? <span className="directory-person__photo"><Image src={`/api/users/${staff.usuario.id_usuario}/profile-photo`} alt="" width={40} height={40} unoptimized /></span> : <span>{initials(staff) || "WE"}</span>}<div><strong className="staff-name-label" style={{ "--staff-color": staff.color_agenda } as CSSProperties}>{name(staff)}</strong></div></div></td>
        <td data-directory-column="document"><span className="directory-main-value">{person(staff).ci || "Sin registrar"}</span></td>
        <td data-directory-column="gender"><span className="directory-main-value">{person(staff).genero === "FEMENINO" ? "Femenino" : "Masculino"}</span></td>
        <td data-directory-column="profession"><div className="directory-stacked"><strong>{staff.profesion}</strong><small>{staff.usuario.rol.nombre}</small></div></td>
        <td data-directory-column="admission"><span className="directory-main-value">{date(staff.fecha_ingreso)}</span></td>
        <td data-directory-column="contact"><div className="directory-stacked"><strong className="patient-whatsapp-phone"><FaWhatsapp aria-hidden="true" /><FormattedPhone value={person(staff).telefono1} /></strong><small><FormattedPhone value={person(staff).telefono2} fallback="Sin teléfono alternativo" /></small></div></td>
        <td data-directory-column="status">{canChangeStatus ? <GeneralStatusControl id={staff.id_personal} name={name(staff)} status={staff.estado} reason={staff.motivo_baja} accessPolicy="required" action={changeStaffStatus} /> : <StatusBadge status={staff.estado} />}</td>{canEdit && <td data-directory-column="actions"><StaffEditDialog staff={staff} /></td>}
      </tr>)}</tbody></table></div></div>
      <div className="directory-mobile-list">{data.map((staff) => <article className="directory-mobile-card" key={staff.id_personal}><div className="directory-card-head"><div className="directory-person">{staff.usuario.foto_perfil_ruta ? <span className="directory-person__photo"><Image src={`/api/users/${staff.usuario.id_usuario}/profile-photo`} alt="" width={40} height={40} unoptimized /></span> : <span>{initials(staff) || "WE"}</span>}<div><strong className="staff-name-label" style={{ "--staff-color": staff.color_agenda } as CSSProperties}>{name(staff)}</strong></div></div>{canChangeStatus ? <GeneralStatusControl id={staff.id_personal} name={name(staff)} status={staff.estado} reason={staff.motivo_baja} accessPolicy="required" action={changeStaffStatus} /> : <StatusBadge status={staff.estado} />}</div><dl><div><dt>CI</dt><dd>{person(staff).ci || "Sin registrar"}</dd></div><div><dt>Género</dt><dd>{person(staff).genero === "FEMENINO" ? "Femenino" : "Masculino"}</dd></div><div><dt>Profesión</dt><dd>{staff.profesion}</dd></div><div><dt>Ingreso</dt><dd>{date(staff.fecha_ingreso)}</dd></div><div><dt>Contacto</dt><dd className="patient-whatsapp-phone"><FaWhatsapp aria-hidden="true" /><FormattedPhone value={person(staff).telefono1} /></dd></div></dl>{canEdit && <div className="directory-card-actions"><StaffEditDialog staff={staff} /></div>}</article>)}</div>
      <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link className={current === 1 ? "disabled" : ""} href={url(current - 1, search, estado)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link className={current === pages ? "disabled" : ""} href={url(current + 1, search, estado)}><ChevronRightIcon /></Link></nav>}</footer>
    </> : <div className="directory-message"><b>i</b><div><h2>No encontramos personal</h2><p>{search || estado ? "Prueba con otros filtros." : "Todavía no existen empleados registrados."}</p></div>{(search || estado) && <Link className="directory-clear" href="/dashboard/personal">Ver todos</Link>}</div>}
  </section>;
}

function StatusBadge({ status }: { status: GeneralStatus }) { return <span className={`directory-status directory-status--${status.toLowerCase()}`}><span />{status === "ACTIVO" ? "Activo" : "Baja"}</span>; }
