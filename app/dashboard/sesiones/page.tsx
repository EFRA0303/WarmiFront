import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { NewSessionDialog, SessionActions } from "@/components/session-dialogs";
import { SessionStatusFilter } from "@/components/session-controls";
import { PatientCareNavigation, PatientCareContext, PatientCareContextInputs, PatientCareRecordLinks } from "@/components/patient-care-navigation";
import { careContext, careHref, careId, type CareContext } from "@/lib/patient-care";
import { getCurrentUser } from "@/lib/auth";
import { getSessionOptions, getSessions } from "@/lib/sessions";
import type { ClinicalSession, SessionStatus } from "@/lib/types";
import "../people.css";
import "./sessions.css";

export const metadata: Metadata = { title: "Sesiones clínicas" };
const PAGE_SIZE = 10;
const statuses = new Set<SessionStatus>([
  "EN_CURSO",
  "FINALIZADA",
  "CANCELADA",
]);
const columns = [
  { key: "patient", label: "Paciente" },
  { key: "service", label: "Servicio" },
  { key: "professional", label: "Atendido por" },
  { key: "appointment", label: "Cita / sesión" },
  { key: "time", label: "Atención" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/La_Paz",
      }).format(new Date(value))
    : "—";
const duration = (session: ClinicalSession) => {
  if (session.estado === "CANCELADA") return "No consumió una sesión";
  if (!session.finalizada_en) return "En progreso";
  return `${Math.max(0, Math.round((new Date(session.finalizada_en).getTime() - new Date(session.fecha_sesion).getTime()) / 60000))} min`;
};
const label = (status: SessionStatus) =>
  status === "EN_CURSO"
    ? "En curso"
    : status === "FINALIZADA"
      ? "Finalizada"
      : "Cancelada";
function url(page: number, search: string, estado?: SessionStatus, context: CareContext = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (estado) params.set("estado", estado);
  if (page > 1) params.set("page", String(page));
  return careHref("/dashboard/sesiones", context, Object.fromEntries(params));
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const context = careContext(params);
  delete context.id_sesion;
  const requestedAppointmentId = careId(params.atender);
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawStatus = one(params.estado)?.toUpperCase() as
    SessionStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const [result, options, user] = await Promise.all([
    getSessions({ page, limit: PAGE_SIZE, search, estado, ...context }),
    getSessionOptions(),
    getCurrentUser(),
  ]);
  if (
    (!result.ok && result.status === 401) ||
    (!options.ok && options.status === 401)
  )
    redirect("/login");
  if (!user?.permisos.includes("clinica.leer"))
    return (
      <Message
        title="Acceso restringido"
        message="Tu cuenta no tiene permiso para consultar sesiones."
      />
    );
  if (!result.ok)
    return (
      <Message
        title="No pudimos cargar las sesiones"
        message={result.message}
      />
    );
  if (!options.ok)
    return (
      <Message
        title="No pudimos cargar las opciones"
        message={options.message}
      />
    );
  const canCreate = user.permisos.includes("clinica.crear");
  const canEdit = user.permisos.includes("clinica.actualizar");
  const inContext = (item: { id_paciente: number; id_tratamiento: number }) => (!context.id_paciente || item.id_paciente === context.id_paciente) && (!context.id_tratamiento || item.id_tratamiento === context.id_tratamiento);
  const scopedOptions = { ...options.value, appointments: options.value.appointments.filter(inContext), treatments: options.value.treatments.filter(inContext) };
  const defaultAppointmentId = scopedOptions.appointments.find(item => item.id_cita === requestedAppointmentId)?.id_cita;
  const { data, total, limit } = result.value;
  const requestedSession = requestedAppointmentId ? data.find(item => item.id_cita === requestedAppointmentId) : undefined;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return (
    <section
      className="directory-page sessions-page"
      data-directory-scope="sessions"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">SERVICIOS DEL PACIENTE</span>
          <h1>Sesiones y atención</h1>
          <p>
            Registra la atención realizada y actualiza el avance de cada
            servicio asignado al paciente.
          </p>
        </div>
        {canCreate && <NewSessionDialog key={`${context.id_paciente ?? "all"}-${context.id_tratamiento ?? "all"}-${defaultAppointmentId ?? "general"}`} options={scopedOptions} defaultAppointmentId={defaultAppointmentId} />}
      </header>
      <PatientCareNavigation active="sessions" permissions={user.permisos} context={context} />
      <PatientCareContext context={context} clearPath="/dashboard/sesiones" />
      {requestedAppointmentId && !defaultAppointmentId && <p className="patient-care-notice">{requestedSession ? `La cita ya tiene una sesión ${requestedSession.estado === "EN_CURSO" ? "en curso" : "registrada"}. Puedes consultar su evolución y sus valoraciones en la lista.` : "La cita solicitada ya no está disponible para iniciar una nueva sesión. Puede estar en curso, haber cambiado de estado o no corresponder a este contexto. Revisa los registros o vuelve a Agenda."}</p>}
      <DirectoryTableActions
        scope="sessions"
        fileName="sesiones"
        columns={columns}
        showActions={canEdit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/sesiones" method="get">
          <PatientCareContextInputs context={context} />
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="session-search"
              initialValue={search}
              placeholder="Buscar paciente, CI, servicio o profesional..."
              basePath="/dashboard/sesiones"
            />
          </label>
          <SessionStatusFilter key={estado ?? "all"} initialValue={estado} />
        </form>
      </div>
      {data.length ? (
        <>
          <div className="directory-table-card sessions-table">
            <div className="directory-table-scroll">
              <table className="directory-table">
                <thead>
                  <tr>
                    <th data-directory-column="patient">Paciente</th>
                    <th data-directory-column="service">Servicio</th>
                    <th data-directory-column="professional">Atendido por</th>
                    <th data-directory-column="appointment">Cita / sesión</th>
                    <th data-directory-column="time">Atención</th>
                    <th data-directory-column="status">Estado</th>
                    {canEdit && (
                      <th data-directory-column="actions">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.map((session) => (
                    <tr key={session.id_sesion}>
                      <td data-directory-column="patient">
                        <div className="directory-stacked">
                          <strong>{session.paciente}</strong>
                          <small>
                            {session.ci
                              ? `CI ${session.ci}`
                              : `Paciente #${session.id_paciente}`}
                          </small>
                        </div>
                      </td>
                      <td data-directory-column="service">
                        <div className="directory-stacked">
                          <strong>{session.servicio}</strong>
                            <small>{session.duracion_minutos} minutos</small>
                          </div>
                          <PatientCareRecordLinks permissions={user.permisos} patientId={session.id_paciente} treatmentId={session.id_tratamiento} sessionId={session.id_sesion} historyId={session.id_historial} />
                      </td>
                      <td data-directory-column="professional">
                        <span
                          className="session-professional"
                          style={
                            {
                              "--session-color": session.color_agenda,
                            } as CSSProperties
                          }
                        >
                          <i />
                          {session.profesional}
                        </span>
                      </td>
                      <td data-directory-column="appointment">
                        <div className="directory-stacked">
                          <strong>
                            {session.numero_sesion
                              ? `Sesión ${session.numero_sesion}`
                              : `Registro #${session.id_sesion}`}
                          </strong>
                          <small>
                            {session.id_cita
                              ? `Cita #${session.id_cita}`
                              : "Sin cita vinculada"}
                          </small>
                        </div>
                      </td>
                      <td data-directory-column="time">
                        <div className="directory-stacked">
                          <strong>{dateTime(session.fecha_sesion)}</strong>
                          <small>{duration(session)}</small>
                        </div>
                      </td>
                      <td data-directory-column="status">
                        <span
                          className={`session-status session-status--${session.estado.toLowerCase()}`}
                        >
                          <i />
                          {label(session.estado)}
                        </span>
                      </td>
                      {canEdit && (
                        <td data-directory-column="actions">
                          <SessionActions session={session} canEdit />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="directory-mobile-list">
            {data.map((session) => (
              <article
                className="directory-mobile-card"
                key={session.id_sesion}
              >
                <div className="directory-card-head">
                  <div
                    className="directory-stacked"
                    data-directory-column="patient"
                  >
                    <strong>{session.paciente}</strong>
                    <small>
                      {session.ci
                        ? `CI ${session.ci}`
                        : `Paciente #${session.id_paciente}`}
                    </small>
                  </div>
                  <span
                    className={`session-status session-status--${session.estado.toLowerCase()}`}
                    data-directory-column="status"
                  >
                    <i />
                    {label(session.estado)}
                  </span>
                </div>
                <dl>
                  <div data-directory-column="service">
                    <dt>Servicio</dt>
                    <dd>{session.servicio}</dd>
                  </div>
                  <div data-directory-column="professional">
                    <dt>Profesional</dt>
                    <dd>{session.profesional}</dd>
                  </div>
                  <div data-directory-column="appointment">
                    <dt>Referencia</dt>
                    <dd>
                      {session.numero_sesion
                        ? `Sesión ${session.numero_sesion}`
                        : `Registro #${session.id_sesion}`}
                    </dd>
                  </div>
                  <div data-directory-column="time">
                    <dt>Atención</dt>
                    <dd>
                      {dateTime(session.fecha_sesion)} · {duration(session)}
                    </dd>
                  </div>
                </dl>
                <PatientCareRecordLinks permissions={user.permisos} patientId={session.id_paciente} treatmentId={session.id_tratamiento} sessionId={session.id_sesion} historyId={session.id_historial} />
                {canEdit && (
                  <div
                    className="directory-card-actions"
                    data-directory-column="actions"
                  >
                    <SessionActions session={session} canEdit />
                  </div>
                )}
              </article>
            ))}
          </div>
          <footer className="directory-footer">
            <p>
              Mostrando{" "}
              <strong>
                {total ? (current - 1) * limit + 1 : 0}–
                {Math.min(current * limit, total)}
              </strong>{" "}
              de <strong>{total}</strong>
            </p>
            {pages > 1 && (
              <nav>
                <Link
                  aria-disabled={current === 1}
                  className={current === 1 ? "disabled" : ""}
                  href={url(current - 1, search, estado, context)}
                >
                  <ChevronLeftIcon />
                </Link>
                <span>
                  Página {current} de {pages}
                </span>
                <Link
                  aria-disabled={current === pages}
                  className={current === pages ? "disabled" : ""}
                  href={url(current + 1, search, estado, context)}
                >
                  <ChevronRightIcon />
                </Link>
              </nav>
            )}
          </footer>
        </>
      ) : (
        <div className="directory-message">
          <b>i</b>
          <div>
            <h2>No encontramos sesiones</h2>
            <p>
              {search || estado
                ? "Prueba con otros filtros."
                : "Todavía no existen sesiones clínicas registradas."}
            </p>
          </div>
          {(search || estado) && (
            <Link className="directory-clear" href={careHref("/dashboard/sesiones", context)}>
              Ver todas
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
function Message({ title, message }: { title: string; message: string }) {
  return (
    <section className="directory-page">
      <div className="directory-message">
        <b>!</b>
        <div>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}
