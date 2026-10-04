import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { GeneralStatusFilter } from "@/components/directory-controls";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getPatients } from "@/lib/people";
import type { GeneralStatus, PatientListItem } from "@/lib/types";
import { PatientRegistrationDialog } from "@/components/registration-dialogs";
import { PatientEditDialog } from "@/components/people-edit-dialogs";
import "../people.css";

export const metadata: Metadata = { title: "Pacientes" };
const PAGE_SIZE = 10;
const statuses = new Set<GeneralStatus>(["ACTIVO", "BAJA"]);

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

  if (!result.ok) return <DirectoryError title="pacientes" message={result.message} forbidden={result.status === 403} />;

  const { data, total, limit } = result.value;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);

  return (
    <section className="directory-page">
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">GESTIÓN CLÍNICA</span>
          <h1>Pacientes</h1>
          <p>Administra los registros personales de quienes reciben atención.</p>
        </div>
        {canCreate && <PatientRegistrationDialog />}
      </header>

      {one(params.creado) === "1" && <div className="directory-success">Paciente registrado correctamente.</div>}

      <div className="directory-toolbar">
        <form action="/dashboard/pacientes" method="get">
          <label className="directory-search">
            <SearchIcon />
            <input name="search" type="search" defaultValue={search} placeholder="Buscar por nombre, CI o teléfono..." maxLength={150} />
          </label>
          <GeneralStatusFilter initialValue={estado} />
          <button className="directory-filter" type="submit">Buscar</button>
          {(search || estado) && <Link className="directory-clear" href="/dashboard/pacientes">Limpiar</Link>}
        </form>
      </div>

      {data.length ? (
        <>
          <div className="directory-table-card">
            <div className="directory-table-scroll">
              <table className="directory-table directory-table--patients">
                <thead><tr><th>Paciente</th><th>Documento</th><th>Contacto</th><th>Ocupación</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr></thead>
                <tbody>{data.map((patient) => (
                  <tr key={patient.id_paciente}>
                    <td><div className="directory-person"><span>{initials(patient) || "WP"}</span><div><strong>{fullName(patient)}</strong><small>Paciente #{patient.id_paciente}</small></div></div></td>
                    <td><span className="directory-main-value">{patient.persona.ci || "Sin registrar"}</span></td>
                    <td><div className="directory-stacked"><strong className="patient-whatsapp-phone"><FaWhatsapp aria-hidden="true" />{patient.persona.telefono1}</strong><small>{patient.persona.telefono2 || "Sin teléfono alternativo"}</small></div></td>
                    <td><span className="directory-main-value">{patient.ocupacion || "Sin registrar"}</span></td>
                    <td><StatusBadge status={patient.estado} /></td>
                    {canEdit && <td><PatientEditDialog patient={patient} /></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="directory-mobile-list">{data.map((patient) => (
            <article className="directory-mobile-card" key={patient.id_paciente}>
              <div className="directory-card-head"><div className="directory-person"><span>{initials(patient) || "WP"}</span><div><strong>{fullName(patient)}</strong><small>{patient.persona.ci || `Paciente #${patient.id_paciente}`}</small></div></div><StatusBadge status={patient.estado} /></div>
              <dl><div><dt>Teléfono</dt><dd className="patient-whatsapp-phone"><FaWhatsapp aria-hidden="true" />{patient.persona.telefono1}</dd></div><div><dt>Ocupación</dt><dd>{patient.ocupacion || "Sin registrar"}</dd></div></dl>
              {canEdit && <div className="directory-card-actions"><PatientEditDialog patient={patient} /></div>}
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
