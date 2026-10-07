"use client";

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { AppointmentActions, NewAppointmentDialog } from "@/components/agenda-dialogs";
import type {
  AgendaOptions,
  AppointmentListItem,
  AppointmentStatus,
} from "@/lib/types";

type ViewMode = "day" | "week" | "month";

const statusLabels: Record<AppointmentStatus, string> = {
  PROGRAMADA: "Programada",
  EN_ESPERA: "En espera",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No asistió",
};

const filters: Array<{ value: "" | AppointmentStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "PROGRAMADA", label: "Programada" },
  { value: "EN_ESPERA", label: "En espera" },
  { value: "ATENDIDA", label: "Atendida" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "NO_ASISTIO", label: "No asistió" },
];

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

function shiftMonth(value: string, amount: number) {
  const date = dateAtNoon(value);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return isoDate(date);
}

function weekStart(value: string) {
  const date = dateAtNoon(value);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return isoDate(date);
}

function monthDays(value: string) {
  const month = value.slice(0, 7);
  const first = `${month}-01`;
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function boliviaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function localParts(value: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/La_Paz",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
}

function appointmentDate(value: string) {
  const parts = localParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function appointmentTime(value: string) {
  const parts = localParts(value);
  return `${parts.hour}:${parts.minute}`;
}

function appointmentMinutes(value: string) {
  const parts = localParts(value);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function personName(person: {
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
}) {
  return [person.nombre, person.ap_paterno, person.ap_materno]
    .filter(Boolean)
    .join(" ");
}

function monthTitle(value: string) {
  const title = new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(dateAtNoon(value));
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function longDay(value: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-BO", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
      .formatToParts(dateAtNoon(value))
      .map((part) => [part.type, part.value]),
  );
  const weekday = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
  const month = parts.month.charAt(0).toUpperCase() + parts.month.slice(1);
  return `${weekday}, ${parts.day} de ${month} de ${parts.year}`;
}

function shortDay(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
  }).format(dateAtNoon(value));
}

function initials(person: { nombre: string; ap_paterno: string }) {
  return `${person.nombre.charAt(0)}${person.ap_paterno.charAt(0)}`.toUpperCase();
}

const defaultDayStart = 7 * 60;
const defaultDayEnd = 20 * 60;
const slotMinutes = 30;
const slotHeight = 48;

function clockLabel(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

function DailySpecialistBoard({
  appointments,
  staff,
}: {
  appointments: AppointmentListItem[];
  staff: AgendaOptions["staff"];
}) {
  if (!staff.length) {
    return <div className="agenda-day-board-empty">No hay especialistas disponibles para mostrar.</div>;
  }

  const boardStart = Math.floor(
    Math.min(defaultDayStart, ...appointments.map((appointment) => appointmentMinutes(appointment.fecha_hora_inicio))) / slotMinutes,
  ) * slotMinutes;
  const boardEnd = Math.ceil(
    Math.max(defaultDayEnd, ...appointments.map((appointment) => appointmentMinutes(appointment.fecha_hora_fin))) / slotMinutes,
  ) * slotMinutes;
  const slots = Array.from(
    { length: (boardEnd - boardStart) / slotMinutes },
    (_, index) => boardStart + index * slotMinutes,
  );

  return (
    <div
      className="agenda-day-board"
      style={{
        "--day-rows": slots.length,
        "--staff-count": staff.length,
      } as CSSProperties}
    >
      <div className="agenda-day-board__head agenda-day-board__corner">Hora</div>
      {staff.map((professional) => (
        <div
          className="agenda-day-board__head agenda-specialist"
          key={professional.id_personal}
          style={{ "--staff-color": professional.color_agenda } as CSSProperties}
        >
          <span>
            {professional.foto_perfil_ruta ? (
              <Image
                src={`/api/users/${professional.id_usuario}/profile-photo`}
                alt={`Foto de ${personName(professional)}`}
                width={54}
                height={54}
                unoptimized
              />
            ) : initials(professional)}
          </span>
          <div>
            <strong>{personName(professional)}</strong>
            <small>{professional.cargo}</small>
          </div>
        </div>
      ))}

      <div className="agenda-time-column">
        {slots.map((minutes) => <span key={minutes}>{clockLabel(minutes)}</span>)}
      </div>
      {staff.map((professional) => (
        <div className="agenda-specialist-column" key={professional.id_personal}>
          {appointments
            .filter((appointment) => appointment.id_personal === professional.id_personal)
            .map((appointment) => {
              const start = appointmentMinutes(appointment.fecha_hora_inicio);
              const end = appointmentMinutes(appointment.fecha_hora_fin);
              const visibleStart = Math.max(start, boardStart);
              const visibleEnd = Math.min(end, boardEnd);
              const top = ((visibleStart - boardStart) / slotMinutes) * slotHeight;
              const height = Math.max(
                42,
                ((visibleEnd - visibleStart) / slotMinutes) * slotHeight - 4,
              );
              return (
                <article
                  className={`agenda-timeline-card agenda-timeline-card--${appointment.estado.toLowerCase()}`}
                  key={appointment.id_cita}
                  style={{
                    "--appointment-color": professional.color_agenda,
                    top,
                    height,
                  } as CSSProperties}
                  title={`${personName(appointment.paciente.persona)} · ${appointmentTime(appointment.fecha_hora_inicio)}–${appointmentTime(appointment.fecha_hora_fin)}`}
                >
                  <time>{appointmentTime(appointment.fecha_hora_inicio)}–{appointmentTime(appointment.fecha_hora_fin)}</time>
                  <strong>{personName(appointment.paciente.persona)}</strong>
                  <span>{appointment.tratamiento?.servicio.nombre ?? "Cita general"}</span>
                </article>
              );
            })}
        </div>
      ))}
    </div>
  );
}

function AppointmentCard({
  appointment,
  canEdit,
  options,
}: {
  appointment: AppointmentListItem;
  canEdit: boolean;
  options: AgendaOptions;
}) {
  return (
    <article
      className={`agenda-card agenda-card--${appointment.estado.toLowerCase()}`}
      style={{ "--appointment-color": appointment.personal.color_agenda } as CSSProperties}
    >
      <header>
        <strong>{appointmentTime(appointment.fecha_hora_inicio)}–{appointmentTime(appointment.fecha_hora_fin)}</strong>
        <span>{statusLabels[appointment.estado]}</span>
      </header>
      <h3>{personName(appointment.paciente.persona)}</h3>
      <p>
        {appointment.tratamiento?.servicio.nombre ?? "Cita general"}
        {appointment.numero_sesion ? ` · Sesión ${appointment.numero_sesion}` : ""}
      </p>
      <footer>
        <span className="agenda-card__professional">
          <i />{personName(appointment.personal.usuario.persona)}
        </span>
        {canEdit && <AppointmentActions appointment={appointment} options={options} />}
      </footer>
    </article>
  );
}

export function AgendaCalendar({
  appointments,
  options,
  initialDate,
  initialStatus,
  initialStaff,
  initialMode,
  canCreate,
  canEdit,
}: {
  appointments: AppointmentListItem[];
  options: AgendaOptions;
  initialDate: string;
  initialStatus?: AppointmentStatus;
  initialStaff?: number;
  initialMode: ViewMode;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [pending, startTransition] = useTransition();
  const grouped = useMemo(() => {
    const result = new Map<string, AppointmentListItem[]>();
    for (const appointment of appointments) {
      const date = appointmentDate(appointment.fecha_hora_inicio);
      result.set(date, [...(result.get(date) ?? []), appointment]);
    }
    return result;
  }, [appointments]);
  const selectedAppointments = grouped.get(selectedDate) ?? [];
  const visibleStaff = initialStaff
    ? options.staff.filter((staff) => staff.id_personal === initialStaff)
    : options.staff;
  const today = boliviaToday();

  function updateQuery(name: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(name, value);
    else params.delete(name);
    startTransition(() =>
      router.replace(`/dashboard/agenda?${params}`, { scroll: false }),
    );
  }

  function navigatePeriod(amount: number) {
    const next = mode === "month"
      ? shiftMonth(initialDate, amount)
      : addDays(selectedDate, mode === "week" ? amount * 7 : amount);
    const params = new URLSearchParams(window.location.search);
    params.set("fecha", next);
    params.set("vista", mode);
    startTransition(() => router.push(`/dashboard/agenda?${params}`));
  }

  const visibleDates =
    mode === "month"
      ? monthDays(initialDate)
      : mode === "week"
        ? Array.from({ length: 7 }, (_, index) => addDays(weekStart(selectedDate), index))
        : [selectedDate];

  return (
    <>
      <div className="agenda-commandbar" aria-busy={pending}>
        <div className="agenda-view-switch" role="group" aria-label="Vista de agenda">
          {(["day", "week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "active" : ""}
              onClick={() => setMode(value)}
            >
              {value === "day" ? "Día" : value === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <div className="agenda-status-filters">
          {filters.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              className={`${filter.value ? `status-filter--${filter.value.toLowerCase()}` : "status-filter--all"}${(initialStatus ?? "") === filter.value ? " active" : ""}`}
              onClick={() => updateQuery("estado", filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select
          className="agenda-staff-filter"
          aria-label="Filtrar por especialista"
          defaultValue={initialStaff ?? ""}
          onChange={(event) => updateQuery("id_personal", event.target.value)}
        >
          <option value="">Todos los especialistas</option>
          {options.staff.map((staff) => (
            <option key={staff.id_personal} value={staff.id_personal}>
              {personName(staff)}
            </option>
          ))}
        </select>
        {canCreate && (
          <NewAppointmentDialog
            key={selectedDate}
            options={options}
            defaultDate={selectedDate}
          />
        )}
      </div>

      <div className={`agenda-layout${mode === "day" ? " agenda-layout--day" : ""}`}>
        <section className="agenda-calendar-panel">
          <header className="agenda-calendar-heading">
            <button type="button" onClick={() => navigatePeriod(-1)} aria-label="Periodo anterior"><ChevronLeftIcon /></button>
            <div><h2>{mode === "month" ? monthTitle(initialDate) : longDay(selectedDate)}</h2><small>{mode === "month" ? "Vista mensual" : mode === "week" ? "Agenda semanal" : "Agenda diaria por especialista"}</small></div>
            <button type="button" onClick={() => navigatePeriod(1)} aria-label="Periodo siguiente"><ChevronRightIcon /></button>
          </header>

          {mode === "month" ? (
            <div className="agenda-month-grid">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span className="agenda-weekday" key={day}>{day}</span>)}
              {visibleDates.map((date) => {
                const items = grouped.get(date) ?? [];
                const outside = date.slice(0, 7) !== initialDate.slice(0, 7);
                return (
                  <button
                    type="button"
                    key={date}
                    className={`agenda-month-day${date === selectedDate ? " selected" : ""}${date === today ? " today" : ""}${outside ? " outside" : ""}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <b>{Number(date.slice(-2))}</b>
                    <span className="agenda-day-dots">
                      {items.slice(0, 4).map((item) => <i className={`status-${item.estado.toLowerCase()}`} key={item.id_cita} />)}
                      {items.length > 4 && <small>+{items.length - 4}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : mode === "day" ? (
            <DailySpecialistBoard
              appointments={selectedAppointments}
              staff={visibleStaff}
            />
          ) : (
            <div className={`agenda-focused-grid agenda-focused-grid--${mode}`}>
              {visibleDates.map((date) => (
                <section key={date} className={date === selectedDate ? "selected" : ""}>
                  <button type="button" className="agenda-focused-day" onClick={() => setSelectedDate(date)}>{shortDay(date)}</button>
                  <div>{(grouped.get(date) ?? []).map((appointment) => <AppointmentCard key={appointment.id_cita} appointment={appointment} options={options} canEdit={canEdit} />)}</div>
                  {!(grouped.get(date) ?? []).length && <span className="agenda-focused-empty">Sin citas</span>}
                </section>
              ))}
            </div>
          )}

          <footer className="agenda-legend">
            {filters.slice(1).map((filter) => <span key={filter.value}><i className={`status-${filter.value.toLowerCase()}`} />{filter.label}</span>)}
          </footer>
        </section>

        <aside className={`agenda-day-panel${mode === "day" ? " agenda-day-panel--hidden" : ""}`}>
          <header>
            <div><span>{selectedAppointments.length ? `${selectedAppointments.length} citas` : "Sin citas"}</span><h2>{longDay(selectedDate)}</h2></div>
          </header>
          <div className="agenda-day-panel__body">
            {selectedAppointments.length ? selectedAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id_cita} appointment={appointment} options={options} canEdit={canEdit} />
            )) : (
              <div className="agenda-free-day"><CalendarIcon /><h3>Día libre</h3><p>No hay citas programadas.</p></div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
