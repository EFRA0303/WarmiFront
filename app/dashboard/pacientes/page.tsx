import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { GeneralStatusFilter } from "@/components/directory-controls";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getPatients } from "@/lib/people";
import type { GeneralStatus, PatientListItem } from "@/lib/types";
import { PatientRegistrationDialog } from "@/components/registration-dialogs";
import { PatientEditDialog } from "@/components/people-edit-dialogs";
import { GeneralStatusControl } from "@/components/general-status-control";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { changePatientStatus } from "./actions";
import { PatientHistoryAction } from "@/components/patient-history-action";
import "../people.css";

export const metadata: Metadata = { title: "Pacientes" };
const PAGE_SIZE = 10;
const statuses = new Set<GeneralStatus>(["ACTIVO", "BAJA"]);
const patientColumns = [
  { key: "patient", label: "Paciente" },
  { key: "document", label: "CI" },
  { key: "occupation", label: "Ocupación" },
  { key: "contact", label: "Contacto" },
  { key: "email", label: "Correo" },
  { key: "birth", label: "Fecha de nacimiento" },
  { key: "gender", label: "Género" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function fullName(patient: PatientListItem) {
  const person = patient.persona;
  return [person.nombre, person.ap_paterno, person.ap_materno].filter(Boolean).join(" ");
}

function initials(patient: PatientListItem) {
  return [patient.persona.nombre, patient.persona.ap_paterno]
    .filter(Boolean).map((part) => part[0]).join("").toUpperCase();
}

function birthDate(value: string | null) {
  if (!value) return "Sin registrar";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function PatientActions({ patient, canEdit, canViewHistory, canCreateHistory }: { patient: PatientListItem; canEdit: boolean; canViewHistory: boolean; canCreateHistory: boolean }) {
  const name = fullName(patient);
  return <div className="patient-row-actions">{canEdit && <PatientEditDialog patient={patient} />}{canEdit && <button type="button" className="directory-action-placeholder directory-action-placeholder--add" title="Nueva atención: disponible próximamente" aria-label={`Nueva atención para ${name} próximamente`} disabled><PlusIcon /></button>}{canViewHistory && <PatientHistoryAction patientId={patient.id_paciente} historyId={patient.historial?.id_historial} patientName={name} canCreate={canCreateHistory} />}</div>;
}

function url(page: number, search: string, estado?: GeneralStatus) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (estado) params.set("estado", estado);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/dashboard/pacientes?${params}` : "/dashboard/pacientes";
}

export default async function PatientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawStatus = one(params.estado)?.toUpperCase() as GeneralStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const [result, currentUser] = await Promise.all([
    getPatients({ page, limit: PAGE_SIZE, search, estado }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  const canCreate = Boolean(
    currentUser?.permisos.includes("personas.crear") &&
    currentUser.permisos.includes("pacientes.crear"),
  );
  const canEdit = Boolean(
    currentUser?.permisos.includes("personas.actualizar") &&
    currentUser.permisos.includes("pacientes.actualizar"),
  );
  const canChangeStatus = Boolean(currentUser?.permisos.includes("pacientes.actualizar"));
  const canChangeUserStatus = Boolean(currentUser?.permisos.includes("usuarios.actualizar"));
  const canViewHistory = Boolean(currentUser?.permisos.includes("historiales.leer"));
  const canCreateHistory = Boolean(currentUser?.permisos.includes("historiales.crear"));
  const showActions = canEdit || canViewHistory;

  if (!result.ok) return <DirectoryError title="pacientes" message={result.message} forbidden={result.status === 403} />;

  const { data, total, limit } = result.value;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);

  return (
    <section className="directory-page" data-directory-scope="patients">
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">GESTIÓN CLÍNICA</span>
          <h1>Pacientes</h1>
          <p>Administra los registros personales de quienes reciben atención.</p>
        </div>
        {canCreate && <PatientRegistrationDialog />}
      </header>

      {one(params.creado) === "1" && <div className="directory-success">Paciente registrado correctamente.</div>}

      <DirectoryTableActions scope="patients" fileName="pacientes-warmi" columns={patientColumns} showActions={showActions} />

      <div className="directory-toolbar">
        <form action="/dashboard/pacientes" method="get">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="patient-search"
              initialValue={search}
              placeholder="Buscar por nombre, usuario, correo, CI o teléfono..."
              basePath="/dashboard/pacientes"
            />
          </label>
          <GeneralStatusFilter initialValue={estado} />
        </form>
      </div>

      {data.length ? (
        <>
          <div className="directory-table-card">
            <div className="directory-table-scroll">
              <table className="directory-table directory-table--patients">
                <thead><tr><th data-directory-column="patient">Paciente</th><th data-directory-column="document">CI</th><th data-directory-column="occupation">Ocupación</th><th data-directory-column="contact">Contacto</th><th data-directory-column="email">Correo</th><th data-directory-column="birth">Fecha de nacimiento</th><th data-directory-column="gender">Género</th><th data-directory-column="status">Estado</th>{showActions && <th data-directory-column="actions">Acciones</th>}</tr></thead>
                <tbody>{data.map((patient) => (
                  <tr key={patient.id_paciente}>
                    <td data-directory-column="patient"><div className="directory-person">{patient.persona.usuario?.foto_perfil_ruta ? <span className="directory-person__photo"><Image src={`/api/users/${patient.persona.usuario.id_usuario}/profile-photo`} alt="" width={40} height={40} unoptimized /></span> : <span>{initials(patient) || "WP"}</span>}<div><strong>{fullName(patient)}</strong><small>Paciente #{patient.id_paciente}</small></div></div></td>
                    <td data-directory-column="document"><span className="directory-main-value">{patient.persona.ci || "Sin registrar"}</span></td>
                    <td data-directory-column="occupation"><span className="directory-main-value">{patient.ocupacion || "Sin registrar"}</span></td>
                    <td data-directory-column="contact"><div className="directory-stacked"><strong className="patient-whatsapp-phone"><FaWhatsapp aria-hidden="true" />{patient.persona.telefono1}</strong><small>{patient.persona.telefono2 || "Sin teléfono alternativo"}</small></div></td>
                    <td data-directory-column="email"><span className="directory-main-value directory-email">{patient.persona.usuario?.correo_acceso || "Sin cuenta de usuario"}</span></td>
                    <td data-directory-column="birth"><span className="directory-main-value">{birthDate(patient.persona.fecha_nac)}</span></td>
                    <td data-directory-column="gender"><span className="directory-main-value">{patient.persona.genero === "FEMENINO" ? "Femenino" : "Masculino"}</span></td>
                    <td data-directory-column="status">{canChangeStatus ? <GeneralStatusControl id={patient.id_paciente} name={fullName(patient)} status={patient.estado} reason={patient.motivo_baja} accessPolicy={patient.persona.usuario && canChangeUserStatus ? "optional" : "none"} action={changePatientStatus} /> : <StatusBadge status={patient.estado} />}</td>
                    {showActions && <td data-directory-column="actions"><PatientActions patient={patient} canEdit={canEdit} canViewHistory={canViewHistory} canCreateHistory={canCreateHistory} /></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="directory-mobile-list">{data.map((patient) => (
            <article className="directory-mobile-card" key={patient.id_paciente}>
              <div className="directory-card-head"><div className="directory-person">{patient.persona.usuario?.foto_perfil_ruta ? <span className="directory-person__photo"><Image src={`/api/users/${patient.persona.usuario.id_usuario}/profile-photo`} alt="" width={40} height={40} unoptimized /></span> : <span>{initials(patient) || "WP"}</span>}<div><strong>{fullName(patient)}</strong><small>{patient.persona.ci || `Paciente #${patient.id_paciente}`}</small></div></div>{canChangeStatus ? <GeneralStatusControl id={patient.id_paciente} name={fullName(patient)} status={patient.estado} reason={patient.motivo_baja} accessPolicy={patient.persona.usuario && canChangeUserStatus ? "optional" : "none"} action={changePatientStatus} /> : <StatusBadge status={patient.estado} />}</div>
              <dl><div><dt>Ocupación</dt><dd>{patient.ocupacion || "Sin registrar"}</dd></div><div><dt>Contacto</dt><dd className="patient-whatsapp-phone"><FaWhatsapp aria-hidden="true" />{patient.persona.telefono1}</dd></div><div><dt>Correo</dt><dd>{patient.persona.usuario?.correo_acceso || "Sin cuenta"}</dd></div><div><dt>Nacimiento</dt><dd>{birthDate(patient.persona.fecha_nac)}</dd></div><div><dt>Género</dt><dd>{patient.persona.genero === "FEMENINO" ? "Femenino" : "Masculino"}</dd></div></dl>
              {showActions && <div className="directory-card-actions"><PatientActions patient={patient} canEdit={canEdit} canViewHistory={canViewHistory} canCreateHistory={canCreateHistory} /></div>}
            </article>
          ))}</div>
          <DirectoryFooter current={current} pages={pages} total={total} limit={limit} search={search} estado={estado} />
        </>
      ) : <DirectoryEmpty filtered={Boolean(search || estado)} base="pacientes" />}
    </section>
  );
}

function StatusBadge({ status }: { status: GeneralStatus }) {
  return <span className={`directory-status directory-status--${status.toLowerCase()}`}><span />{status === "ACTIVO" ? "Activo" : "Baja"}</span>;
}

function DirectoryFooter({ current, pages, total, limit, search, estado }: { current: number; pages: number; total: number; limit: number; search: string; estado?: GeneralStatus }) {
  const first = total ? (current - 1) * limit + 1 : 0;
  const last = Math.min(current * limit, total);
  return <footer className="directory-footer"><p>Mostrando <strong>{first}–{last}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link aria-disabled={current === 1} className={current === 1 ? "disabled" : ""} href={url(current - 1, search, estado)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link aria-disabled={current === pages} className={current === pages ? "disabled" : ""} href={url(current + 1, search, estado)}><ChevronRightIcon /></Link></nav>}</footer>;
}

function DirectoryError({ title, message, forbidden }: { title: string; message: string; forbidden: boolean }) {
  return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{forbidden ? "Acceso restringido" : `No pudimos cargar ${title}`}</h2><p>{forbidden ? `Tu cuenta no tiene permiso para consultar ${title}.` : message}</p></div></div></section>;
}

function DirectoryEmpty({ filtered, base }: { filtered: boolean; base: string }) {
  return <div className="directory-message"><b>i</b><div><h2>No encontramos pacientes</h2><p>{filtered ? "Prueba con otros filtros." : "Todavía no existen pacientes registrados."}</p></div>{filtered && <Link className="directory-clear" href={`/dashboard/${base}`}>Ver todos</Link>}</div>;
}
