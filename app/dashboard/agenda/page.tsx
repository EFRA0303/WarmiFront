import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AgendaCalendar } from "@/components/agenda-calendar";
import { getCurrentUser } from "@/lib/auth";
import { getAgendaOptions, getAppointments } from "@/lib/agenda";
import type { AppointmentStatus } from "@/lib/types";
import "../people.css";
import "./agenda.css";

export const metadata: Metadata = { title: "Agenda" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statuses = new Set<AppointmentStatus>([
  "PROGRAMADA",
  "EN_ESPERA",
  "ATENDIDA",
  "CANCELADA",
  "NO_ASISTIO",
]);

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function boliviaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return boliviaToday();
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? boliviaToday() : value;
}

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number) {
  const date = dateAtNoon(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return isoDate(date);
}

function calendarStart(value: string) {
  const date = dateAtNoon(`${value.slice(0, 7)}-01`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return isoDate(date);
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDate = validDate(one(params.fecha));
  const start = calendarStart(selectedDate);
  const end = addDays(start, 41);
  const rawView = one(params.vista);
  const initialView = rawView === "day" || rawView === "week" ? rawView : "month";
  const rawStatus = one(params.estado)?.toUpperCase() as AppointmentStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const rawStaff = Number(one(params.id_personal));
  const idPersonal = Number.isInteger(rawStaff) && rawStaff > 0 ? rawStaff : undefined;
  const rawTreatment = Number(one(params.id_tratamiento));
  const requestedTreatmentId = Number.isInteger(rawTreatment) && rawTreatment > 0 ? rawTreatment : undefined;

  const [appointmentsResult, optionsResult, currentUser] = await Promise.all([
    getAppointments({
      desde: `${start}T00:00:00-04:00`,
      hasta: `${end}T23:59:59-04:00`,
      estado,
      id_personal: idPersonal,
    }),
    getAgendaOptions(),
    getCurrentUser(),
  ]);

  if (
    (!appointmentsResult.ok && appointmentsResult.status === 401) ||
    (!optionsResult.ok && optionsResult.status === 401)
  ) redirect("/login");

  if (!currentUser?.permisos.includes("agenda.leer")) {
    return <AgendaMessage title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar la agenda." />;
  }
  if (!appointmentsResult.ok) {
    return <AgendaMessage title="No pudimos cargar la agenda" message={appointmentsResult.message} />;
  }
  if (!optionsResult.ok) {
    return <AgendaMessage title="No pudimos cargar las opciones" message={optionsResult.message} />;
  }

  const canCreate = currentUser.permisos.includes("agenda.crear");
  const defaultTreatmentId = requestedTreatmentId && optionsResult.value.treatments.some((item) => item.id_tratamiento === requestedTreatmentId)
    ? requestedTreatmentId
    : undefined;

  return (
    <section className="directory-page agenda-page">
      <AgendaCalendar
        key={selectedDate}
        appointments={appointmentsResult.value.data}
        options={optionsResult.value}
        initialDate={selectedDate}
        initialStatus={estado}
        initialStaff={idPersonal}
        initialMode={initialView}
        defaultTreatmentId={defaultTreatmentId}
        canCreate={canCreate}
        canEdit={currentUser.permisos.includes("agenda.actualizar")}
      />
    </section>
  );
}

function AgendaMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="directory-page">
      <div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div>
    </section>
  );
}
