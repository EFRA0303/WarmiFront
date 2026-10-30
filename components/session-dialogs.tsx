"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TreatmentIcon,
} from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  cancelSession,
  finishSession,
  startSession,
  updateSessionNotes,
} from "@/app/dashboard/sesiones/actions";
import type {
  ClinicalSession,
  RegistrationState,
  SessionOptions,
} from "@/lib/types";

const initial: RegistrationState = {};
const localNow = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};
const staffName = (staff: SessionOptions["staff"][number]) =>
  [staff.nombre, staff.ap_paterno, staff.ap_materno].filter(Boolean).join(" ");
const appointmentLabel = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/La_Paz",
  }).format(new Date(value));

function Dialog({
  open,
  close,
  eyebrow,
  title,
  description,
  children,
}: {
  open: boolean;
  close: () => void;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="session-dialog"
      onCancel={close}
      onClick={(event) => event.target === ref.current && close()}
    >
      <section>
        <header>
          <span>
            <TreatmentIcon />
          </span>
          <div>
            <b className="page-eyebrow">{eyebrow}</b>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
function ErrorText({
  state,
  name,
}: {
  state: RegistrationState;
  name: string;
}) {
  return state.fieldErrors?.[name] ? (
    <small className="session-error">{state.fieldErrors[name]}</small>
  ) : null;
}

function StartForm({
  options,
  close,
  defaultAppointmentId,
}: {
  options: SessionOptions;
  close: () => void;
  defaultAppointmentId?: number;
}) {
  const [state, action, pending] = useActionState(startSession, initial);
  const [mode, setMode] = useState<"appointment" | "manual">(
    options.appointments.length ? "appointment" : "manual",
  );
  const [appointmentId, setAppointmentId] = useState(defaultAppointmentId ? String(defaultAppointmentId) : "");
  const appointment = options.appointments.find(
    (item) => item.id_cita === Number(appointmentId),
  );
  const manualReady =
    options.treatments.some((item) => item.sesiones_disponibles > 0) &&
    options.staff.length > 0;
  return (
    <>
      <form action={action} className="session-form">
        <div className="session-mode">
          <button
            type="button"
            className={mode === "appointment" ? "active" : ""}
            disabled={!options.appointments.length}
            onClick={() => setMode("appointment")}
          >
            Desde una cita
          </button>
          <button
            type="button"
            className={mode === "manual" ? "active" : ""}
            onClick={() => setMode("manual")}
          >
            Registro sin cita
          </button>
        </div>
        {mode === "manual" && !manualReady && (
          <p className="session-setup-alert">
            Debe existir al menos un servicio del paciente con sesiones disponibles y un
            profesional clínico activo.
          </p>
        )}
        <div className="session-grid">
          {mode === "appointment" ? (
            <>
              <label className="session-wide">
                <span>Cita en espera *</span>
                <select
                  name="id_cita"
                  value={appointmentId}
                  onChange={(event) => setAppointmentId(event.target.value)}
                  required
                >
                  <option value="">Seleccionar cita</option>
                  {options.appointments.map((item) => (
                    <option value={item.id_cita} key={item.id_cita}>
                      {appointmentLabel(item.fecha_hora_inicio)} ·{" "}
                      {item.paciente} · {item.servicio} · {item.profesional}
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="hidden"
                name="id_tratamiento"
                value={appointment?.id_tratamiento ?? ""}
              />
              <input
                type="hidden"
                name="atendido_por"
                value={appointment?.id_personal ?? ""}
              />
              {appointment && (
                <div className="session-appointment session-wide">
                  <strong>{appointment.paciente}</strong>
                  <span>
                    {appointment.servicio}
                    {appointment.numero_sesion
                      ? ` · Sesión ${appointment.numero_sesion}`
                      : ""}
                  </span>
                  <small>
                    {appointment.profesional} · {appointment.duracion_minutos}{" "}
                    minutos
                  </small>
                </div>
              )}
            </>
          ) : (
            <>
              <label>
                <span>Servicio del paciente *</span>
                <select name="id_tratamiento" defaultValue="" required>
                  <option value="">Seleccionar servicio del paciente</option>
                  {options.treatments
                    .filter((item) => item.sesiones_disponibles > 0)
                    .map((item) => (
                      <option
                        value={item.id_tratamiento}
                        key={item.id_tratamiento}
                      >
                        {item.paciente} · {item.servicio} ·{" "}
                        {item.sesiones_disponibles} disponibles
                      </option>
                    ))}
                </select>
                <ErrorText state={state} name="id_tratamiento" />
              </label>
              <label>
                <span>Atendido por *</span>
                <select name="atendido_por" defaultValue="" required>
                  <option value="">Seleccionar profesional</option>
                  {options.staff.map((staff) => (
                    <option value={staff.id_personal} key={staff.id_personal}>
                      {staffName(staff)} · {staff.cargo}
                    </option>
                  ))}
                </select>
                <ErrorText state={state} name="atendido_por" />
              </label>
            </>
          )}
          <label>
            <span>Inicio real *</span>
            <input
              type="datetime-local"
              name="fecha_sesion"
              defaultValue={localNow()}
              required
            />
            <ErrorText state={state} name="fecha_sesion" />
          </label>
          <label className="session-wide">
            <span>Observaciones iniciales</span>
            <textarea name="observaciones" rows={4} />
          </label>
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button
            className="directory-primary"
            disabled={
              pending || (mode === "appointment" ? !appointment : !manualReady)
            }
          >
            {pending ? "Iniciando..." : "Iniciar sesión"}
          </button>
        </footer>
      </form>
      {state.resultId && (
        <SubmissionResultDialog
          key={state.resultId}
          state={state}
          onSuccess={close}
        />
      )}
    </>
  );
}

export function NewSessionDialog({ options, defaultAppointmentId }: { options: SessionOptions; defaultAppointmentId?: number }) {
  const [open, setOpen] = useState(Boolean(defaultAppointmentId));
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        className="directory-primary"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Iniciar sesión
      </button>
      {open && (
        <Dialog
          open
          close={close}
          eyebrow="NUEVA ATENCIÓN"
          title="Iniciar sesión clínica"
          description="Usa una cita en espera o registra una atención sin cita."
        >
          <StartForm options={options} close={close} defaultAppointmentId={defaultAppointmentId} />
        </Dialog>
      )}
    </>
  );
}

function NotesForm({
  session,
  close,
}: {
  session: ClinicalSession;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateSessionNotes.bind(null, session.id_sesion),
    initial,
  );
  return (
    <>
      <form action={action} className="session-form">
        <div className="session-grid">
          <label className="session-wide">
            <span>Observaciones clínicas</span>
            <textarea
              name="observaciones"
              rows={7}
              defaultValue={session.observaciones ?? ""}
            />
          </label>
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="directory-primary" disabled={pending}>
            {pending ? "Guardando..." : "Guardar observaciones"}
          </button>
        </footer>
      </form>
      {state.resultId && (
        <SubmissionResultDialog
          key={state.resultId}
          state={state}
          onSuccess={close}
        />
      )}
    </>
  );
}

export function SessionActions({
  session,
  canEdit,
}: {
  session: ClinicalSession;
  canEdit: boolean;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirm, setConfirm] = useState<"finish" | "cancel" | null>(null);
  const [result, setResult] = useState<RegistrationState>({});
  const [pending, transition] = useTransition();
  const act = () =>
    transition(async () => {
      const response =
        confirm === "finish"
          ? await finishSession(session.id_sesion)
          : await cancelSession(session.id_sesion);
      setConfirm(null);
      setResult(response);
    });
  if (!canEdit) return null;
  return (
    <>
      <div className="session-actions">
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          title="Editar observaciones"
          aria-label={`Editar observaciones de la sesión de ${session.paciente}`}
        >
          <EditIcon />
        </button>
        {session.estado === "EN_CURSO" && (
          <>
            <button
              type="button"
              className="finish"
              onClick={() => setConfirm("finish")}
              title="Finalizar sesión"
              aria-label={`Finalizar sesión de ${session.paciente}`}
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              className="cancel"
              onClick={() => setConfirm("cancel")}
              title="Cancelar sesión"
              aria-label={`Cancelar sesión de ${session.paciente}`}
            >
              <CloseIcon />
            </button>
          </>
        )}
      </div>
      {notesOpen && (
        <Dialog
          open
          close={() => setNotesOpen(false)}
          eyebrow="REGISTRO CLÍNICO"
          title={`Sesión de ${session.paciente}`}
          description={session.servicio}
        >
          <NotesForm session={session} close={() => setNotesOpen(false)} />
        </Dialog>
      )}
      {confirm && (
        <Dialog
          open
          close={() => setConfirm(null)}
          eyebrow={
            confirm === "finish" ? "FINALIZAR ATENCIÓN" : "CANCELACIÓN LÓGICA"
          }
          title={confirm === "finish" ? "Finalizar sesión" : "Cancelar sesión"}
          description={
            confirm === "finish"
              ? "La cita se marcará como atendida y avanzará el tratamiento."
              : "El registro se conservará y no consumirá una sesión."
          }
        >
          <div className="session-confirm">
            <p>
              ¿Confirmas esta acción para <strong>{session.paciente}</strong> ·{" "}
              {session.servicio}?
            </p>
            <footer>
              <button type="button" onClick={() => setConfirm(null)}>
                Volver
              </button>
              <button
                type="button"
                className={confirm === "finish" ? "finish" : "danger"}
                disabled={pending}
                onClick={act}
              >
                {pending
                  ? "Procesando..."
                  : confirm === "finish"
                    ? "Finalizar sesión"
                    : "Cancelar sesión"}
              </button>
            </footer>
          </div>
        </Dialog>
      )}
      {result.resultId && (
        <SubmissionResultDialog
          key={result.resultId}
          state={result}
          onSuccess={() => setResult({})}
        />
      )}
    </>
  );
}
