import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { ServiceRequestStatusFilter } from "@/components/service-request-controls";
import { NewServiceRequestDialog, ServiceRequestActions } from "@/components/service-request-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getServiceRequestOptions, getServiceRequests } from "@/lib/service-requests";
import type { ServiceRequestStatus } from "@/lib/types";
import "../people.css";
import "../sesiones/sessions.css";
import "./requests.css";

export const metadata: Metadata = { title: "Solicitudes de servicio" };
const PAGE_SIZE = 10;
const statuses = new Set<ServiceRequestStatus>(["PENDIENTE", "VALORADO", "ACEPTADO", "DESCARTADO"]);
const columns = [
  { key: "patient", label: "Paciente" }, { key: "service", label: "Servicio" },
  { key: "date", label: "Solicitud" }, { key: "reason", label: "Motivo" },
  { key: "valuation", label: "Valoración" }, { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" }).format(new Date(value)) : "—";
const statusLabel = (status: ServiceRequestStatus) => status === "PENDIENTE" ? "Pendiente" : status === "VALORADO" ? "Valorada" : status === "ACEPTADO" ? "Aceptada" : "Descartada";
function url(page: number, search: string, estado?: ServiceRequestStatus) {
  const params = new URLSearchParams(); if (search) params.set("search", search); if (estado) params.set("estado", estado); if (page > 1) params.set("page", String(page));
  return params.size ? `/dashboard/solicitudes?${params}` : "/dashboard/solicitudes";
}
export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawPage = Number(one(params.page)); const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawStatus = one(params.estado)?.toUpperCase() as ServiceRequestStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const [result, options, user] = await Promise.all([getServiceRequests({ page, limit: PAGE_SIZE, search, estado }), getServiceRequestOptions(), getCurrentUser()]);
  if ((!result.ok && result.status === 401) || (!options.ok && options.status === 401)) redirect("/login");
  if (!user?.permisos.includes("clinica.leer")) return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar solicitudes clínicas." />;
  if (!result.ok) return <Message title="No pudimos cargar las solicitudes" message={result.message} />;
  if (!options.ok) return <Message title="No pudimos cargar las opciones" message={options.message} />;
  const canCreate = user.permisos.includes("clinica.crear"); const canEdit = user.permisos.includes("clinica.actualizar");
  const { data, total, limit } = result.value; const pages = Math.max(1, Math.ceil(total / limit)); const current = Math.min(page, pages);
  return <section className="directory-page requests-page" data-directory-scope="requests">
    <header className="directory-heading"><div><span className="page-eyebrow">ATENCIÓN CLÍNICA</span><h1>Solicitudes de servicio</h1><p>Organiza las necesidades clínicas antes de iniciar una valoración o tratamiento.</p></div>{canCreate && <NewServiceRequestDialog options={options.value} />}</header>
    <DirectoryTableActions scope="requests" fileName="solicitudes-servicio" columns={columns} showActions={canEdit} />
    <div className="directory-toolbar"><form action="/dashboard/solicitudes" method="get"><label className="directory-search"><SearchIcon /><DynamicSearchInput id="request-search" initialValue={search} placeholder="Buscar paciente, CI, servicio o motivo..." basePath="/dashboard/solicitudes" /></label><ServiceRequestStatusFilter key={estado ?? "all"} initialValue={estado} /></form></div>
    {data.length ? <>
      <div className="directory-table-card requests-table"><div className="directory-table-scroll"><table className="directory-table"><thead><tr><th data-directory-column="patient">Paciente</th><th data-directory-column="service">Servicio</th><th data-directory-column="date">Solicitud</th><th data-directory-column="reason">Motivo</th><th data-directory-column="valuation">Valoración</th><th data-directory-column="status">Estado</th>{canEdit && <th data-directory-column="actions">Acciones</th>}</tr></thead><tbody>{data.map((request) => <tr key={request.id_solicitud}>
        <td data-directory-column="patient"><div className="directory-stacked"><strong>{request.paciente}</strong><small>{request.ci ? `CI ${request.ci}` : `Paciente #${request.id_paciente}`}</small></div></td>
        <td data-directory-column="service"><div className="directory-stacked"><strong>{request.servicio}</strong><small>{request.area} · {request.categoria}</small></div></td>
        <td data-directory-column="date"><div className="directory-stacked"><strong>{dateTime(request.fecha_solicitud)}</strong><small>Solicitud #{request.id_solicitud}</small></div></td>
        <td data-directory-column="reason"><p className="request-reason">{request.motivo || "Sin motivo registrado"}</p></td>
        <td data-directory-column="valuation"><div className="directory-stacked"><strong>{request.valoraciones ? `${request.valoraciones} registrada${request.valoraciones === 1 ? "" : "s"}` : request.requiere_valoracion ? "Pendiente" : "No requerida"}</strong><small>{request.ultima_valoracion ? dateTime(request.ultima_valoracion) : request.requiere_valoracion ? "Requiere valoración" : "Servicio directo"}</small></div></td>
        <td data-directory-column="status"><span className={`request-status request-status--${request.estado.toLowerCase()}`}><i />{statusLabel(request.estado)}</span></td>
        {canEdit && <td data-directory-column="actions"><ServiceRequestActions request={request} canEdit /></td>}
      </tr>)}</tbody></table></div></div>
      <div className="directory-mobile-list">{data.map((request) => <article className="directory-mobile-card" key={request.id_solicitud}><div className="directory-card-head"><div className="directory-stacked" data-directory-column="patient"><strong>{request.paciente}</strong><small>{request.ci ? `CI ${request.ci}` : `Paciente #${request.id_paciente}`}</small></div><span className={`request-status request-status--${request.estado.toLowerCase()}`} data-directory-column="status"><i />{statusLabel(request.estado)}</span></div><dl><div data-directory-column="service"><dt>Servicio</dt><dd>{request.servicio}</dd></div><div data-directory-column="date"><dt>Solicitud</dt><dd>{dateTime(request.fecha_solicitud)}</dd></div><div data-directory-column="reason"><dt>Motivo</dt><dd>{request.motivo || "Sin motivo registrado"}</dd></div><div data-directory-column="valuation"><dt>Valoración</dt><dd>{request.valoraciones ? `${request.valoraciones} registrada(s)` : request.requiere_valoracion ? "Pendiente" : "No requerida"}</dd></div></dl>{canEdit && <div className="directory-card-actions" data-directory-column="actions"><ServiceRequestActions request={request} canEdit /></div>}</article>)}</div>
      <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link aria-disabled={current === 1} className={current === 1 ? "disabled" : ""} href={url(current - 1, search, estado)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link aria-disabled={current === pages} className={current === pages ? "disabled" : ""} href={url(current + 1, search, estado)}><ChevronRightIcon /></Link></nav>}</footer>
    </> : <div className="directory-message"><b>i</b><div><h2>No encontramos solicitudes</h2><p>{search || estado ? "Prueba con otros filtros." : "Todavía no existen solicitudes de servicio."}</p></div>{(search || estado) && <Link className="directory-clear" href="/dashboard/solicitudes">Ver todas</Link>}</div>}
  </section>;
}
function Message({ title, message }: { title: string; message: string }) { return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>; }
