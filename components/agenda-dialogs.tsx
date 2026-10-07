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
}: {
  options: AgendaOptions;
  state: RegistrationState;
  appointment?: AppointmentListItem;
  defaultDate?: string;
}) {
  const initialPatient = String(appointment?.id_paciente ?? "");
  const [patientId, setPatientId] = useState(initialPatient);
  const [treatmentId, setTreatmentId] = useState(
    String(appointment?.id_tratamiento ?? ""),
  );
  const initialStart = appointment
    ? localDateTime(appointment.fecha_hora_inicio)
    : defaultDate
      ? `${defaultDate}T09:00`
      : "";
  const initialEnd = appointment
    ? localDateTime(appointment.fecha_hora_fin)
    : defaultDate
      ? `${defaultDate}T10:00`
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

  function calculateEnd(nextStart: string, nextTreatment: string) {
    const treatment = options.treatments.find(
      (item) => item.id_tratamiento === Number(nextTreatment),
    );
    if (!nextStart || !treatment) return;
    const date = new Date(`${nextStart}:00-04:00`);
    date.setMinutes(date.getMinutes() + treatment.duracion_minutos);
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
        <select name="id_personal" defaultValue={appointment?.id_personal ?? ""} required>
          <option value="">Seleccionar profesional</option>
          {options.staff.map((staff) => (
            <option key={staff.id_personal} value={staff.id_personal}>
              {fullName(staff)} · {staff.profesion}
            </option>
          ))}
        </select>
        <FieldError state={state} name="id_personal" />
      </label>
      <label>
        <span>Tratamiento</span>
        <select
          name="id_tratamiento"
          value={treatmentId}
          onChange={(event) => {
            setTreatmentId(event.target.value);
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
          defaultValue={appointment?.numero_sesion ?? ""}
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
  onClose,
}: {
  options: AgendaOptions;
  appointment?: AppointmentListItem;
  defaultDate?: string;
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
}: {
  options: AgendaOptions;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
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
        <AppointmentForm key={formKey} options={options} defaultDate={defaultDate} onClose={close} />
      </DialogFrame>
    </>
  );
}

function ReprogramForm({ appointment, onClose }: { appointment: AppointmentListItem; onClose: () => void }) {
  const [state, action, pending] = useActionState(
    reprogramAppointment.bind(null, appointment.id_cita),
    initialState,
  );
  return (
    <>
      <form action={action} className="agenda-form">
        <div className="agenda-form-grid">
          <label><span>Nuevo inicio *</span><input name="inicio_nuevo" type="datetime-local" defaultValue={localDateTime(appointment.fecha_hora_inicio)} required /><FieldError state={state} name="inicio_nuevo" /></label>
          <label><span>Nuevo final *</span><input name="fin_nuevo" type="datetime-local" defaultValue={localDateTime(appointment.fecha_hora_fin)} required /><FieldError state={state} name="fin_nuevo" /></label>
          <label><span>Solicitado por *</span><select name="solicitado_por_tipo" defaultValue="PACIENTE"><option value="PACIENTE">Paciente</option><option value="PERSONAL">Personal</option><option value="SISTEMA">Sistema</option></select><FieldError state={state} name="solicitado_por_tipo" /></label>
          <label className="agenda-form-grid__wide"><span>Motivo</span><textarea name="motivo" rows={3} maxLength={255} /><FieldError state={state} name="motivo" /></label>
        </div>
        <footer><button type="button" className="agenda-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Confirmar reprogramación"}</button></footer>
      </form>
      <SubmissionResultDialog state={state} onSuccess={onClose} />
    </>
  );
}

export function AppointmentActions({ appointment, options }: { appointment: AppointmentListItem; options: AgendaOptions }) {
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
        {!final && <button type="button" onClick={() => setEditOpen(true)} title="Editar cita"><EditIcon /></button>}
        {appointment.estado === "PROGRAMADA" && <button type="button" onClick={() => setReprogramOpen(true)} title="Reprogramar cita"><HistoryIcon /></button>}
        {appointment.estado === "PROGRAMADA" && <button type="button" className="agenda-action-text" disabled={pending} onClick={() => change("EN_ESPERA")}><CheckIcon />Llegó</button>}
        {appointment.estado === "EN_ESPERA" && <button type="button" className="agenda-action-text" disabled={pending} onClick={() => change("ATENDIDA")}><CheckIcon />Atendida</button>}
        {!final && <button type="button" className="agenda-action-text" disabled={pending} onClick={() => change("NO_ASISTIO")}><CloseIcon />No asistió</button>}
        {!final && <button type="button" className="agenda-action-danger" disabled={pending} onClick={() => change("CANCELADA")}><CloseIcon />Cancelar</button>}
      </div>
      <DialogFrame open={editOpen} onClose={() => setEditOpen(false)} eyebrow="EDITAR CITA" title="Actualizar cita" description="Modifica únicamente los datos necesarios.">
        <AppointmentForm options={options} appointment={appointment} onClose={() => setEditOpen(false)} />
      </DialogFrame>
      <DialogFrame open={reprogramOpen} onClose={() => setReprogramOpen(false)} eyebrow="CAMBIO DE HORARIO" title="Reprogramar cita" description="El horario anterior quedará registrado en el historial.">
        <ReprogramForm appointment={appointment} onClose={() => setReprogramOpen(false)} />
      </DialogFrame>
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
