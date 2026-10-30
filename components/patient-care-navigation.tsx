import Link from "next/link";
import { careHref, type CareContext } from "@/lib/patient-care";
import "./patient-care.css";

export function PatientCareNavigation({ active, permissions, context = {} }: { active: "services" | "sessions" | "valuations" | "history"; permissions: string[]; context?: CareContext }) {
  const links = [
    { key: "services", label: "Servicios del paciente", path: "/dashboard/tratamientos", permission: "tratamientos.leer", context: { id_paciente: context.id_paciente } },
    { key: "sessions", label: "Sesiones y atención", path: "/dashboard/sesiones", permission: "clinica.leer", context: { id_paciente: context.id_paciente, id_tratamiento: context.id_tratamiento } },
    { key: "valuations", label: "Valoraciones y medidas", path: "/dashboard/valoraciones", permission: "clinica.leer", context },
  ];
  return <nav className="patient-care-nav" aria-label="Atención del paciente">
    {links.filter(link => permissions.includes(link.permission)).map(link => <Link key={link.key} href={careHref(link.path, link.context)} aria-current={active === link.key ? "page" : undefined}>{link.label}</Link>)}
    {permissions.includes("agenda.leer") && <Link href="/dashboard/agenda">Agenda</Link>}
    {permissions.includes("historiales.leer") && <Link href="/dashboard/historiales" aria-current={active === "history" ? "page" : undefined}>Expedientes</Link>}
  </nav>;
}

export function PatientCareContext({ context, clearPath }: { context: CareContext; clearPath: string }) {
  if (!context.id_paciente && !context.id_tratamiento && !context.id_sesion) return null;
  return <aside className="patient-care-context"><span>Mostrando {[
    context.id_paciente ? `paciente #${context.id_paciente}` : null,
    context.id_tratamiento ? `servicio asignado #${context.id_tratamiento}` : null,
    context.id_sesion ? `sesión #${context.id_sesion}` : null,
  ].filter(Boolean).join(" · ")}</span><Link href={clearPath}>Quitar contexto</Link></aside>;
}

export function PatientCareContextInputs({ context }: { context: CareContext }) {
  return <>{Object.entries(context).filter(([, value]) => value !== undefined).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}</>;
}

export function PatientCareRecordLinks({ permissions, patientId, treatmentId, sessionId, historyId }: { permissions: string[]; patientId: number; treatmentId: number; sessionId?: number; historyId?: number }) {
  const context = { id_paciente: patientId, id_tratamiento: treatmentId, id_sesion: sessionId };
  return <div className="patient-care-record-links">
    {permissions.includes("clinica.leer") && !sessionId && <Link href={careHref("/dashboard/sesiones", { ...context, id_sesion: undefined })}>Ver sesiones</Link>}
    {permissions.includes("clinica.leer") && <Link href={careHref("/dashboard/valoraciones", context)}>Valoraciones y medidas</Link>}
    {permissions.includes("historiales.leer") && historyId && <Link href={`/dashboard/historiales/${historyId}`}>Expediente</Link>}
  </div>;
}
