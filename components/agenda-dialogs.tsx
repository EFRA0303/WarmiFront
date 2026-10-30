"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { careHref } from "@/lib/patient-care";
import "./patient-care.css";
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  HistoryIcon,
  PlusIcon,
} from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import type {
  AgendaOptions,
  AppointmentListItem,
  AppointmentStatus,
  RegistrationState,
} from "@/lib/types";
import {
  changeAppointmentStatus,
  createAppointment,
  reprogramAppointment,
  updateAppointment,
} from "@/app/dashboard/agenda/actions";

const initialState: RegistrationState = {};

function fullName(person: {
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
}) {
  return [person.nombre, person.ap_paterno, person.ap_materno]
    .filter(Boolean)
    .join(" ");
}

function localDateTime(value?: string | null) {
  if (!value) return "";
  const parts = Object.fromEntries(
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
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const weekdayByIndex = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"] as const;

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function businessRangesForDate(date: string, options: AgendaOptions) {
  const exception = options.businessHours.excepciones.find((item) => item.fecha === date);
  if (exception?.tipo === "HORARIO_ESPECIAL") return exception.tramos;
  if (exception?.tipo === "CERRADO") return [];
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const holiday = options.businessHours.feriados.some((item) => item.tipo === "DINAMICO" ? item.fecha === date : item.mes === month && item.dia === day);
  if (holiday) return [];
  const weekday = weekdayByIndex[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return options.businessHours.horarios_semanales.filter((item) => item.dia_semana === weekday);
}

function staffRangesForDate(staffId: number, date: string, options: AgendaOptions) {
  const weekday = weekdayByIndex[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return [
    ...options.staffSchedules.filter((item) => item.id_personal === staffId && item.dia_semana === weekday),
    ...(options.staffExtraHours ?? []).filter((item) => item.id_personal === staffId && item.fecha.slice(0, 10) === date),
  ];
}

function staffAvailableForRange(staffId: number, start: string, end: string, options: AgendaOptions) {
  if (!start || !end || start.slice(0, 10) !== end.slice(0, 10)) return false;
  const date = start.slice(0, 10);
  const startTime = start.slice(11, 16);
  const endTime = end.slice(11, 16);
  const insideBusinessHours = businessRangesForDate(date, options).some((range) => startTime >= range.hora_inicio && endTime <= range.hora_fin);
  if (!insideBusinessHours) return false;
  const insideStaffHours = staffRangesForDate(staffId, date, options).some((range) => startTime >= range.hora_inicio && endTime <= range.hora_fin);
  if (!insideStaffHours) return false;
  const startInstant = new Date(`${start}:00-04:00`);
  const endInstant = new Date(`${end}:00-04:00`);
  return !(options.staffPermissions ?? []).some((permission) => permission.id_personal === staffId && new Date(permission.fecha_hora_inicio) < endInstant && new Date(permission.fecha_hora_fin) > startInstant);
}

function openingTime(date: string, options: AgendaOptions) {
  const businessRanges = businessRangesForDate(date, options);
  const candidates = options.staff.flatMap((staff) => staffRangesForDate(staff.id_personal, date, options).flatMap((staffRange) => businessRanges.flatMap((businessRange) => {
    const start = Math.max(timeMinutes(staffRange.hora_inicio), timeMinutes(businessRange.hora_inicio));
    const end = Math.min(timeMinutes(staffRange.hora_fin), timeMinutes(businessRange.hora_fin));
    return end > start ? [start] : [];
  })));
  const first = candidates.length ? Math.min(...candidates) : businessRanges[0] ? timeMinutes(businessRanges[0].hora_inicio) : 540;
  return `${String(Math.floor(first / 60)).padStart(2, "0")}:${String(first % 60).padStart(2, "0")}`;
}

function DialogFrame({
  open,
  onClose,
  eyebrow,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="agenda-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <section className="agenda-dialog__panel">
        <header className="agenda-dialog__header">
          <span className="agenda-dialog__icon"><CalendarIcon /></span>
          <div>
            <span className="page-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar ventana">
            <CloseIcon />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

function FieldError({ state, name }: { state: RegistrationState; name: string }) {
  const message = state.fieldErrors?.[name];
  return message ? <small className="agenda-field-error">{message}</small> : null;
}

function AppointmentFields({
  options,
  state,
  appointment,
  defaultDate,
  defaultTreatmentId,
}: {
  options: AgendaOptions;
  state: RegistrationState;
  appointment?: AppointmentListItem;
  defaultDate?: string;
  defaultTreatmentId?: number;
}) {
  const defaultTreatment = options.treatments.find((item) => item.id_tratamiento === defaultTreatmentId);
  const initialPatient = String(appointment?.id_paciente ?? defaultTreatment?.id_paciente ?? "");
  const [patientId, setPatientId] = useState(initialPatient);
  const [treatmentId, setTreatmentId] = useState(
    String(appointment?.id_tratamiento ?? defaultTreatment?.id_tratamiento ?? ""),
  );
  const [sessionNumber, setSessionNumber] = useState(
    String(appointment?.numero_sesion ?? defaultTreatment?.siguiente_sesion ?? ""),
  );
  const [staffId, setStaffId] = useState(String(appointment?.id_personal ?? ""));
  const initialStart = appointment
    ? localDateTime(appointment.fecha_hora_inicio)
    : defaultDate
      ? `${defaultDate}T${openingTime(defaultDate, options)}`
      : "";
  const initialEnd = appointment
    ? localDateTime(appointment.fecha_hora_fin)
    : defaultDate
      ? (() => {
          const start = new Date(`${defaultDate}T${openingTime(defaultDate, options)}:00-04:00`);
          start.setMinutes(start.getMinutes() + (defaultTreatment?.duracion_minutos ?? options.businessHours.intervalo_minutos));
          return localDateTime(start.toISOString());
        })()
      : "";
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const treatments = useMemo(
    () =>
      options.treatments.filter(
        (item) => !patientId || item.id_paciente === Number(patientId),
      ),
    [options.treatments, patientId],
  );
  const selectedStaffAvailable = staffId ? staffAvailableForRange(Number(staffId), start, end, options) : null;

  function calculateEnd(nextStart: string, nextTreatment: string) {
    const treatment = options.treatments.find(
      (item) => item.id_tratamiento === Number(nextTreatment),
    );
    if (!nextStart) return;
    const date = new Date(`${nextStart}:00-04:00`);
    date.setMinutes(
      date.getMinutes() +
        (treatment?.duracion_minutos ?? options.businessHours.intervalo_minutos),
    );
    setEnd(localDateTime(date.toISOString()));
  }

  return (
    <div className="agenda-form-grid">
      <label>
        <span>Paciente *</span>
        <select
          name="id_paciente"
          value={patientId}
          required
          onChange={(event) => {
            setPatientId(event.target.value);
            setTreatmentId("");
            setSessionNumber("");
          }}
        >
          <option value="">Seleccionar paciente</option>
          {options.patients.map((patient) => (
            <option key={patient.id_paciente} value={patient.id_paciente}>
              {fullName(patient)}{patient.ci ? ` · CI ${patient.ci}` : ""}
            </option>
          ))}
        </select>
        <FieldError state={state} name="id_paciente" />
      </label>
      <label>
        <span>Profesional *</span>
        <select name="id_personal" value={staffId} onChange={(event) => setStaffId(event.target.value)} required>
          <option value="">Seleccionar profesional</option>
          {options.staff.map((staff) => {
            const available = !start || !end || staffAvailableForRange(staff.id_personal, start, end, options);
            return <option key={staff.id_personal} value={staff.id_personal} disabled={!available && staff.id_personal !== Number(staffId)}>
              {fullName(staff)} · {staff.profesion}{available ? "" : " · No disponible"}
            </option>
          })}
        </select>
        {selectedStaffAvailable !== null && <small className={`agenda-availability-hint ${selectedStaffAvailable ? "available" : "unavailable"}`}>{selectedStaffAvailable ? "Disponible en el horario seleccionado" : "No disponible en el horario seleccionado"}</small>}
        <FieldError state={state} name="id_personal" />
      </label>
      <label>
        <span>Servicio del paciente</span>
        <select
          name="id_tratamiento"
          value={treatmentId}
          onChange={(event) => {
            setTreatmentId(event.target.value);
            const treatment = options.treatments.find(
              (item) => item.id_tratamiento === Number(event.target.value),
            );
            setSessionNumber(treatment ? String(treatment.siguiente_sesion) : "");
            calculateEnd(start, event.target.value);
          }}
        >
          <option value="">Cita general</option>
          {treatments.map((treatment) => (
            <option key={treatment.id_tratamiento} value={treatment.id_tratamiento}>
              {treatment.servicio} · {treatment.duracion_minutos} min
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Número de sesión</span>
        <input
          name="numero_sesion"
          type="number"
          min="1"
          value={sessionNumber}
          onChange={(event) => setSessionNumber(event.target.value)}
          disabled={!treatmentId}
          required={Boolean(treatmentId)}
        />
        <FieldError state={state} name="numero_sesion" />
      </label>
      <label>
        <span>Inicio *</span>
        <input
          name="fecha_hora_inicio"
          type="datetime-local"
          value={start}
          step={options.businessHours.intervalo_minutos * 60}
          required
          onChange={(event) => {
            setStart(event.target.value);
            calculateEnd(event.target.value, treatmentId);
          }}
        />
        <FieldError state={state} name="fecha_hora_inicio" />
      </label>
      <label>
        <span>Final *</span>
        <input
          name="fecha_hora_fin"
          type="datetime-local"
          value={end}
          step={options.businessHours.intervalo_minutos * 60}
          required
          onChange={(event) => setEnd(event.target.value)}
        />
        <FieldError state={state} name="fecha_hora_fin" />
      </label>
      <label className="agenda-form-grid__wide">
        <span>Observaciones</span>
        <textarea
          name="observaciones"
          maxLength={255}
          rows={3}
          defaultValue={appointment?.observaciones ?? ""}
          placeholder="Información relevante para esta cita..."
        />
        <FieldError state={state} name="observaciones" />
      </label>
    </div>
  );
}

function AppointmentForm({
  options,
  appointment,
  defaultDate,
  defaultTreatmentId,
  onClose,
}: {
  options: AgendaOptions;
  appointment?: AppointmentListItem;
  defaultDate?: string;
  defaultTreatmentId?: number;
  onClose: () => void;
}) {
  const action = appointment
    ? updateAppointment.bind(null, appointment.id_cita)
    : createAppointment;
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <>
      <form action={formAction} className="agenda-form">
        <AppointmentFields
          options={options}
          state={state}
          appointment={appointment}
          defaultDate={defaultDate}
          defaultTreatmentId={defaultTreatmentId}
        />
        <footer>
          <button type="button" className="agenda-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="directory-primary" disabled={pending}>
            {pending ? "Guardando..." : appointment ? "Guardar cambios" : "Programar cita"}
          </button>
        </footer>
      </form>
      <SubmissionResultDialog state={state} onSuccess={onClose} />
    </>
  );
}

export function NewAppointmentDialog({
  options,
  defaultDate,
  defaultTreatmentId,
  autoOpen = false,
}: {
  options: AgendaOptions;
  defaultDate: string;
  defaultTreatmentId?: number;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [formKey, setFormKey] = useState(0);
  const close = () => {
    setOpen(false);
    setFormKey((current) => current + 1);
  };
  return (
    <>
      <button type="button" className="directory-primary" onClick={() => setOpen(true)}>
        <PlusIcon />Nueva cita
      </button>
      <DialogFrame open={open} onClose={close} eyebrow="NUEVA CITA" title="Programar cita" description="Selecciona paciente, profesional y horario disponible.">
        <AppointmentForm key={formKey} options={options} defaultDate={defaultDate} defaultTreatmentId={defaultTreatmentId} onClose={close} />
      </DialogFrame>
    </>
  );
}

function ReprogramForm({ appointment, options, onClose }: { appointment: AppointmentListItem; options: AgendaOptions; onClose: () => void }) {
  const [state, action, pending] = useActionState(
    reprogramAppointment.bind(null, appointment.id_cita),
    initialState,
  );
  return (
    <>
      <form action={action} className="agenda-form">
        <div className="agenda-form-grid">
          <label><span>Nuevo inicio *</span><input name="inicio_nuevo" type="datetime-local" step={options.businessHours.intervalo_minutos * 60} defaultValue={localDateTime(appointment.fecha_hora_inicio)} required /><FieldError state={state} name="inicio_nuevo" /></label>
          <label><span>Nuevo final *</span><input name="fin_nuevo" type="datetime-local" step={options.businessHours.intervalo_minutos * 60} defaultValue={localDateTime(appointment.fecha_hora_fin)} required /><FieldError state={state} name="fin_nuevo" /></label>
          <label><span>Solicitado por *</span><select name="solicitado_por_tipo" defaultValue="PACIENTE"><option value="PACIENTE">Paciente</option><option value="PERSONAL">Personal</option><option value="SISTEMA">Sistema</option></select><FieldError state={state} name="solicitado_por_tipo" /></label>
          <label className="agenda-form-grid__wide"><span>Motivo</span><textarea name="motivo" rows={3} maxLength={255} /><FieldError state={state} name="motivo" /></label>
        </div>
        <footer><button type="button" className="agenda-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Confirmar reprogramación"}</button></footer>
      </form>
      <SubmissionResultDialog state={state} onSuccess={onClose} />
    </>
  );
}

export function AppointmentDetailDialog({ appointment, options, canEdit, canAttend, onClose }: { appointment: AppointmentListItem; options: AgendaOptions; canEdit: boolean; canAttend: boolean; onClose: () => void }) {
  const statusLabels: Record<AppointmentStatus, string> = { PROGRAMADA: "Programada", EN_ESPERA: "En espera", ATENDIDA: "Atendida", CANCELADA: "Cancelada", NO_ASISTIO: "No asistió" };
  return <DialogFrame open onClose={onClose} eyebrow="DETALLE DE CITA" title={fullName(appointment.paciente.persona)} description={appointment.tratamiento?.servicio.nombre ?? "Cita general"}>
    <div className="agenda-appointment-detail">
      <dl>
        <div><dt>Estado</dt><dd>{statusLabels[appointment.estado]}</dd></div>
        <div><dt>Profesional</dt><dd>{fullName(appointment.personal.usuario.persona)}</dd></div>
        <div><dt>Inicio</dt><dd>{localDateTime(appointment.fecha_hora_inicio).replace("T", " · ")}</dd></div>
        <div><dt>Final</dt><dd>{localDateTime(appointment.fecha_hora_fin).replace("T", " · ")}</dd></div>
        {appointment.numero_sesion && <div><dt>Sesión</dt><dd>{appointment.numero_sesion}</dd></div>}
      </dl>
      {appointment.observaciones && <p>{appointment.observaciones}</p>}
      <AppointmentActions appointment={appointment} options={options} canEdit={canEdit} canAttend={canAttend} />
    </div>
  </DialogFrame>;
}

export function AppointmentActions({ appointment, options, canEdit = true, canAttend = false }: { appointment: AppointmentListItem; options: AgendaOptions; canEdit?: boolean; canAttend?: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [reprogramOpen, setReprogramOpen] = useState(false);
  const [result, setResult] = useState<RegistrationState>({});
  const [pending, startTransition] = useTransition();
  const final = ["ATENDIDA", "CANCELADA", "NO_ASISTIO"].includes(appointment.estado);

  function change(status: AppointmentStatus) {
    if (status === "CANCELADA" && !window.confirm("¿Confirmas la cancelación de esta cita? El registro se conservará.")) return;
    startTransition(async () => setResult(await changeAppointmentStatus(appointment.id_cita, status)));
  }

  return (
    <>
      <div className="agenda-card__actions">
        {canEdit && !final && <button type="button" onClick={() => setEditOpen(true)} title="Editar cita"><EditIcon /></button>}
        {canEdit && appointment.estado === "PROGRAMADA" && <button type="button" onClick={() => setReprogramOpen(true)} title="Reprogramar cita"><HistoryIcon /></button>}
        {canEdit && appointment.estado === "PROGRAMADA" && <button type="button" className="agenda-action-text" disabled={pending} onClick={() => change("EN_ESPERA")}><CheckIcon />Llegó</button>}
        {canAttend && appointment.estado === "EN_ESPERA" && appointment.id_tratamiento && <Link className="patient-care-appointment-link" href={careHref("/dashboard/sesiones", { id_paciente: appointment.id_paciente, id_tratamiento: appointment.id_tratamiento }, { atender: appointment.id_cita })}><CheckIcon />Atender</Link>}
        {canEdit && appointment.estado === "EN_ESPERA" && !appointment.id_tratamiento && <button type="button" className="agenda-action-text" disabled={pending} onClick={() => change("ATENDIDA")}><CheckIcon />Atendida</button>}
        {canEdit && !final && <button type="button" className="agenda-action-text" disabled={pending} onClick={() => change("NO_ASISTIO")}><CloseIcon />No asistió</button>}
        {canEdit && !final && <button type="button" className="agenda-action-danger" disabled={pending} onClick={() => change("CANCELADA")}><CloseIcon />Cancelar</button>}
      </div>
      {canEdit && <DialogFrame open={editOpen} onClose={() => setEditOpen(false)} eyebrow="EDITAR CITA" title="Actualizar cita" description="Modifica únicamente los datos necesarios.">
        <AppointmentForm options={options} appointment={appointment} onClose={() => setEditOpen(false)} />
      </DialogFrame>}
      {canEdit && <DialogFrame open={reprogramOpen} onClose={() => setReprogramOpen(false)} eyebrow="CAMBIO DE HORARIO" title="Reprogramar cita" description="El horario anterior quedará registrado en el historial.">
        <ReprogramForm appointment={appointment} options={options} onClose={() => setReprogramOpen(false)} />
      </DialogFrame>}
      <SubmissionResultDialog state={result} onSuccess={() => setResult({})} />
    </>
  );
}

export function AgendaSelectFilters({
  staff,
  initialStaff,
  initialStatus,
}: {
  staff: AgendaOptions["staff"];
  initialStaff?: number;
  initialStatus?: AppointmentStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function update(name: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(name, value);
    else params.delete(name);
    startTransition(() => router.replace(`/dashboard/agenda?${params}`, { scroll: false }));
  }
  return (
    <div className="agenda-select-filters" aria-busy={pending}>
      <select aria-label="Filtrar por profesional" defaultValue={initialStaff ?? ""} onChange={(event) => update("id_personal", event.target.value)}>
        <option value="">Todo el personal</option>
        {staff.map((item) => <option key={item.id_personal} value={item.id_personal}>{fullName(item)}</option>)}
      </select>
      <select aria-label="Filtrar por estado" defaultValue={initialStatus ?? ""} onChange={(event) => update("estado", event.target.value)}>
        <option value="">Todos los estados</option>
        <option value="PROGRAMADA">Programadas</option>
        <option value="EN_ESPERA">En espera</option>
        <option value="ATENDIDA">Atendidas</option>
        <option value="CANCELADA">Canceladas</option>
        <option value="NO_ASISTIO">No asistió</option>
      </select>
    </div>
  );
}
