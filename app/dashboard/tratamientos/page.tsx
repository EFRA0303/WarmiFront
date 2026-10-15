import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { NewTreatmentDialog, TreatmentActions } from "@/components/treatment-dialogs";
import { TreatmentStatusFilter } from "@/components/treatment-controls";
import { getCurrentUser } from "@/lib/auth";
import { getTreatmentOptions, getTreatments } from "@/lib/treatments";
import type { TreatmentStatus } from "@/lib/types";
import "../people.css";
import "./treatments.css";

export const metadata: Metadata = { title: "Tratamientos" };
const PAGE_SIZE = 10;
const statuses = new Set<TreatmentStatus>(["PENDIENTE", "EN_CURSO", "FINALIZADO", "CANCELADO"]);
const columns = [
  { key: "patient", label: "Paciente" },
  { key: "service", label: "Servicio" },
  { key: "professional", label: "Indicado por" },
  { key: "progress", label: "Sesiones" },
  { key: "start", label: "Fecha de inicio" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function date(value: string | null) {
  if (!value) return "Sin iniciar";
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function url(page: number, search: string, estado?: TreatmentStatus) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (estado) params.set("estado", estado);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/dashboard/tratamientos?${params}` : "/dashboard/tratamientos";
}

function statusLabel(status: TreatmentStatus) {
  if (status === "EN_CURSO") return "En curso";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function TreatmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawStatus = one(params.estado)?.toUpperCase() as TreatmentStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const [result, optionsResult, currentUser] = await Promise.all([
    getTreatments({ page, limit: PAGE_SIZE, search, estado }),
    getTreatmentOptions(),
    getCurrentUser(),
  ]);
  if ((!result.ok && result.status === 401) || (!optionsResult.ok && optionsResult.status === 401)) redirect("/login");
  if (!currentUser?.permisos.includes("tratamientos.leer")) return <DirectoryError message="Tu cuenta no tiene permiso para consultar tratamientos." />;
  if (!result.ok) return <DirectoryError message={result.message} />;
  if (!optionsResult.ok) return <DirectoryError message={optionsResult.message} />;

  const canCreate = currentUser.permisos.includes("tratamientos.crear");
  const canEdit = currentUser.permisos.includes("tratamientos.actualizar");
  const canCancel = currentUser.permisos.includes("tratamientos.cancelar");
  const canReserve = currentUser.permisos.includes("agenda.crear");
  const showActions = canEdit || canCancel || canReserve;
  const { data, total, limit } = result.value;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);

  return (
    <section className="directory-page treatments-page" data-directory-scope="treatments">
      <header className="directory-heading">
        <div><span className="page-eyebrow">GESTIÓN CLÍNICA</span><h1>Tratamientos</h1><p>Controla los servicios indicados, sus sesiones y el progreso de cada paciente.</p></div>
        {canCreate && <NewTreatmentDialog options={optionsResult.value} />}
      </header>

      <DirectoryTableActions scope="treatments" fileName="tratamientos" columns={columns} showActions={showActions} />

      <div className="directory-toolbar">
        <form action="/dashboard/tratamientos" method="get">
          <label className="directory-search"><SearchIcon /><DynamicSearchInput id="treatment-search" initialValue={search} placeholder="Buscar paciente, CI, servicio o profesional..." basePath="/dashboard/tratamientos" /></label>
          <TreatmentStatusFilter initialValue={estado} />
        </form>
      </div>

      {data.length ? (
        <>
          <div className="directory-table-card">
            <div className="directory-table-scroll">
              <table className="directory-table directory-table--treatments">
                <thead><tr><th data-directory-column="patient">Paciente</th><th data-directory-column="service">Servicio</th><th data-directory-column="professional">Indicado por</th><th data-directory-column="progress">Sesiones</th><th data-directory-column="start">Fecha de inicio</th><th data-directory-column="status">Estado</th>{showActions && <th data-directory-column="actions">Acciones</th>}</tr></thead>
                <tbody>{data.map((treatment) => {
                  const totalSessions = treatment.sesiones_iniciales + treatment.sesiones_agregadas;
                  const percent = Math.min(100, Math.round((treatment.sesiones_realizadas / totalSessions) * 100));
                  return <tr key={treatment.id_tratamiento}>
                    <td data-directory-column="patient"><div className="treatment-patient"><strong>{treatment.paciente}</strong><small>{treatment.ci ? `CI ${treatment.ci}` : `Paciente #${treatment.id_paciente}`}</small></div></td>
                    <td data-directory-column="service"><div className="directory-stacked"><strong>{treatment.servicio}</strong><small>{treatment.duracion_minutos} min{treatment.requiere_valoracion ? " · Requiere valoración" : ""}</small></div></td>
                    <td data-directory-column="professional"><span className="treatment-professional" style={{ "--professional-color": treatment.color_agenda } as CSSProperties}><i />{treatment.profesional}</span></td>
                    <td data-directory-column="progress"><div className="treatment-progress"><div><strong>{treatment.sesiones_realizadas}/{totalSessions}</strong><small>{Math.max(0, totalSessions - treatment.sesiones_realizadas)} pendientes</small></div><span><i style={{ width: `${percent}%` }} /></span>{treatment.citas_pendientes > 0 && <small>{treatment.citas_pendientes} reservadas</small>}</div></td>
                    <td data-directory-column="start"><span className="directory-main-value">{date(treatment.fecha_inicio)}</span></td>
                    <td data-directory-column="status"><span className={`treatment-status treatment-status--${treatment.estado.toLowerCase()}`}><i />{statusLabel(treatment.estado)}</span></td>
                    {showActions && <td data-directory-column="actions"><TreatmentActions treatment={treatment} options={optionsResult.value} canEdit={canEdit} canCancel={canCancel} canReserve={canReserve} /></td>}
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </div>
          <div className="directory-mobile-list">{data.map((treatment) => {
            const totalSessions = treatment.sesiones_iniciales + treatment.sesiones_agregadas;
            const percent = Math.min(100, Math.round((treatment.sesiones_realizadas / totalSessions) * 100));
            return <article className="directory-mobile-card" key={treatment.id_tratamiento}>
              <div className="directory-card-head"><div className="treatment-patient"><strong>{treatment.paciente}</strong><small>{treatment.ci ? `CI ${treatment.ci}` : `Paciente #${treatment.id_paciente}`}</small></div><span className={`treatment-status treatment-status--${treatment.estado.toLowerCase()}`}><i />{statusLabel(treatment.estado)}</span></div>
              <dl><div><dt>Servicio</dt><dd>{treatment.servicio}</dd></div><div><dt>Inicio</dt><dd>{date(treatment.fecha_inicio)}</dd></div><div><dt>Indicado por</dt><dd><span className="treatment-professional" style={{ "--professional-color": treatment.color_agenda } as CSSProperties}><i />{treatment.profesional}</span></dd></div><div><dt>Duración</dt><dd>{treatment.duracion_minutos} minutos</dd></div></dl>
              <div className="treatment-progress treatment-mobile-progress"><div><strong>{treatment.sesiones_realizadas}/{totalSessions} sesiones</strong><small>{Math.max(0, totalSessions - treatment.sesiones_realizadas)} pendientes</small></div><span><i style={{ width: `${percent}%` }} /></span></div>
              {showActions && <div className="directory-card-actions"><TreatmentActions treatment={treatment} options={optionsResult.value} canEdit={canEdit} canCancel={canCancel} canReserve={canReserve} /></div>}
            </article>;
          })}</div>
          <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link aria-disabled={current === 1} className={current === 1 ? "disabled" : ""} href={url(current - 1, search, estado)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link aria-disabled={current === pages} className={current === pages ? "disabled" : ""} href={url(current + 1, search, estado)}><ChevronRightIcon /></Link></nav>}</footer>
        </>
      ) : <div className="directory-message"><b>i</b><div><h2>No encontramos tratamientos</h2><p>{search || estado ? "Prueba con otros filtros." : "Todavía no existen tratamientos registrados."}</p></div>{(search || estado) && <Link className="directory-clear" href="/dashboard/tratamientos">Ver todos</Link>}</div>}
    </section>
  );
}

function DirectoryError({ message }: { message: string }) {
  return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>No pudimos cargar tratamientos</h2><p>{message}</p></div></div></section>;
}
