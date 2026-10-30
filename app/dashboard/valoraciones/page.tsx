import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { ValuationTypeFilter } from "@/components/valuation-controls";
import { NewValuationDialog, ValuationActions } from "@/components/valuation-dialogs";
import { PatientCareNavigation, PatientCareContext, PatientCareContextInputs } from "@/components/patient-care-navigation";
import { careContext, careHref, type CareContext } from "@/lib/patient-care";
import { getCurrentUser } from "@/lib/auth";
import { getValuationOptions, getValuations } from "@/lib/valuations";
import type { ClinicalValuation, ValuationType } from "@/lib/types";
import "../people.css";
import "../sesiones/sessions.css";
import "./valuations.css";

export const metadata: Metadata = { title: "Valoraciones y medidas" };
const PAGE_SIZE = 10;
const types = new Set<ValuationType>(["INICIAL", "EVOLUCION", "FINAL"]);
const columns = [
  { key: "patient", label: "Paciente" },
  { key: "type", label: "Tipo" },
  { key: "origin", label: "Origen / servicio" },
  { key: "professional", label: "Profesional" },
  { key: "date", label: "Fecha" },
  { key: "measures", label: "Medidas" },
  { key: "actions", label: "Acciones" },
];
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const dateTime = (value: string) => new Intl.DateTimeFormat("es-BO", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz",
}).format(new Date(value));
const typeLabel = (type: ValuationType) => type === "INICIAL" ? "Inicial" : type === "EVOLUCION" ? "Evolución" : "Final";
const originLabel = (valuation: ClinicalValuation) => valuation.origen === "SOLICITUD" ? `Solicitud #${valuation.id_solicitud}` : valuation.origen === "TRATAMIENTO" ? `Servicio asignado #${valuation.id_tratamiento}` : valuation.origen === "SESION" ? `Sesión #${valuation.id_sesion}` : "Independiente";
function url(page: number, search: string, tipo?: ValuationType, context: CareContext = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tipo) params.set("tipo", tipo);
  if (page > 1) params.set("page", String(page));
  return careHref("/dashboard/valoraciones", context, Object.fromEntries(params));
}
export default async function ValuationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = careContext(params);
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawType = one(params.tipo)?.toUpperCase() as ValuationType | undefined;
  const tipo = rawType && types.has(rawType) ? rawType : undefined;
  const [result, options, user] = await Promise.all([
    getValuations({ page, limit: PAGE_SIZE, search, tipo, ...context }),
    getValuationOptions(),
    getCurrentUser(),
  ]);
  if ((!result.ok && result.status === 401) || (!options.ok && options.status === 401)) redirect("/login");
  if (!user?.permisos.includes("clinica.leer")) return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar valoraciones." />;
  if (!result.ok) return <Message title="No pudimos cargar las valoraciones" message={result.message} />;
  if (!options.ok) return <Message title="No pudimos cargar las opciones" message={options.message} />;
  const canCreate = user.permisos.includes("clinica.crear");
  const canEdit = user.permisos.includes("clinica.actualizar");
  const inContext = (item: { id_paciente: number }) => !context.id_paciente || item.id_paciente === context.id_paciente;
  const scopedOptions = { ...options.value,
    patients: options.value.patients.filter(inContext), requests: options.value.requests.filter(inContext),
    treatments: options.value.treatments.filter(item => inContext(item) && (!context.id_tratamiento || item.id_tratamiento === context.id_tratamiento)),
    sessions: options.value.sessions.filter(item => inContext(item) && (!context.id_tratamiento || item.id_tratamiento === context.id_tratamiento) && (!context.id_sesion || item.id_sesion === context.id_sesion)),
  };
  const defaultSource = context.id_sesion ? (scopedOptions.sessions.some(item => item.id_sesion === context.id_sesion) ? `session:${context.id_sesion}` : undefined)
    : context.id_tratamiento && scopedOptions.treatments.some(item => item.id_tratamiento === context.id_tratamiento) ? `treatment:${context.id_tratamiento}` : undefined;
  const { data, total, limit } = result.value;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return <section className="directory-page valuations-page" data-directory-scope="valuations">
    <header className="directory-heading"><div><span className="page-eyebrow">SERVICIOS DEL PACIENTE</span><h1>Valoraciones y medidas</h1><p>Registra evaluaciones y compara la evolución clínica de cada paciente.</p></div>{canCreate && (!(context.id_sesion || context.id_tratamiento) || defaultSource) && <NewValuationDialog key={defaultSource ?? context.id_paciente ?? "all"} options={scopedOptions} defaultSource={defaultSource} />}</header>
    <PatientCareNavigation active="valuations" permissions={user.permisos} context={context} />
    <PatientCareContext context={context} clearPath="/dashboard/valoraciones" />
    {(context.id_sesion || context.id_tratamiento) && !defaultSource && canCreate && <p className="patient-care-notice">Puedes consultar los registros de este contexto, pero el origen ya no está disponible para una nueva valoración. Revisa el expediente o quita el contexto para seleccionar otro origen.</p>}
    <DirectoryTableActions scope="valuations" fileName="valoraciones" columns={columns} showActions={canEdit} />
    <div className="directory-toolbar"><form action="/dashboard/valoraciones" method="get"><PatientCareContextInputs context={context} /><label className="directory-search"><SearchIcon /><DynamicSearchInput id="valuation-search" initialValue={search} placeholder="Buscar paciente, CI, servicio o profesional..." basePath="/dashboard/valoraciones" /></label><ValuationTypeFilter key={tipo ?? "all"} initialValue={tipo} /></form></div>
    {data.length ? <>
      <div className="directory-table-card valuations-table"><div className="directory-table-scroll"><table className="directory-table"><thead><tr><th data-directory-column="patient">Paciente</th><th data-directory-column="type">Tipo</th><th data-directory-column="origin">Origen / servicio</th><th data-directory-column="professional">Profesional</th><th data-directory-column="date">Fecha</th><th data-directory-column="measures">Medidas</th>{canEdit && <th data-directory-column="actions">Acciones</th>}</tr></thead><tbody>
        {data.map((valuation) => <tr key={valuation.id_valoracion}>
          <td data-directory-column="patient"><div className="directory-stacked"><strong>{valuation.paciente}</strong><small>{valuation.ci ? `CI ${valuation.ci}` : `Paciente #${valuation.id_paciente}`}</small></div></td>
          <td data-directory-column="type"><span className={`valuation-type valuation-type--${valuation.tipo.toLowerCase()}`}>{typeLabel(valuation.tipo)}</span></td>
          <td data-directory-column="origin"><div className="directory-stacked"><strong>{valuation.servicio ?? "Valoración general"}</strong><small>{originLabel(valuation)}</small></div></td>
          <td data-directory-column="professional"><span className="session-professional" style={{ "--session-color": valuation.color_agenda } as CSSProperties}><i />{valuation.profesional}</span></td>
          <td data-directory-column="date"><div className="directory-stacked"><strong>{dateTime(valuation.fecha_valoracion)}</strong><small>Registro #{valuation.id_valoracion}</small></div></td>
          <td data-directory-column="measures"><MeasureSummary valuation={valuation} /></td>
          {canEdit && <td data-directory-column="actions"><ValuationActions valuation={valuation} options={options.value} canEdit /></td>}
        </tr>)}
      </tbody></table></div></div>
      <div className="directory-mobile-list">{data.map((valuation) => <article className="directory-mobile-card" key={valuation.id_valoracion}><div className="directory-card-head"><div className="directory-stacked" data-directory-column="patient"><strong>{valuation.paciente}</strong><small>{valuation.ci ? `CI ${valuation.ci}` : `Paciente #${valuation.id_paciente}`}</small></div><span className={`valuation-type valuation-type--${valuation.tipo.toLowerCase()}`} data-directory-column="type">{typeLabel(valuation.tipo)}</span></div><dl><div data-directory-column="origin"><dt>Origen</dt><dd>{valuation.servicio ?? "Valoración general"} · {originLabel(valuation)}</dd></div><div data-directory-column="professional"><dt>Profesional</dt><dd>{valuation.profesional}</dd></div><div data-directory-column="date"><dt>Fecha</dt><dd>{dateTime(valuation.fecha_valoracion)}</dd></div><div data-directory-column="measures"><dt>Medidas</dt><dd><MeasureSummary valuation={valuation} /></dd></div></dl>{canEdit && <div className="directory-card-actions" data-directory-column="actions"><ValuationActions valuation={valuation} options={options.value} canEdit /></div>}</article>)}</div>
      <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link aria-disabled={current === 1} className={current === 1 ? "disabled" : ""} href={url(current - 1, search, tipo, context)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link aria-disabled={current === pages} className={current === pages ? "disabled" : ""} href={url(current + 1, search, tipo, context)}><ChevronRightIcon /></Link></nav>}</footer>
    </> : <div className="directory-message"><b>i</b><div><h2>No encontramos valoraciones</h2><p>{search || tipo ? "Prueba con otros filtros." : "Todavía no existen valoraciones clínicas registradas."}</p></div>{(search || tipo) && <Link className="directory-clear" href={careHref("/dashboard/valoraciones", context)}>Limpiar búsqueda</Link>}</div>}
  </section>;
}
function MeasureSummary({ valuation }: { valuation: ClinicalValuation }) {
  if (!valuation.medidas.length) return <span className="valuation-empty">Sin medidas</span>;
  return <div className="valuation-measures">{valuation.medidas.slice(0, 2).map((measure) => <span key={measure.id_tipo_medida}><b>{measure.valor}</b>{measure.unidad ? ` ${measure.unidad}` : ""} <small>{measure.nombre}</small></span>)}{valuation.medidas.length > 2 && <em>+{valuation.medidas.length - 2}</em>}</div>;
}
function Message({ title, message }: { title: string; message: string }) { return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>; }
