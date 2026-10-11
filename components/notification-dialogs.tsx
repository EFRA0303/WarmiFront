"use client";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { CheckIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  changeNotification,
  createNotification,
} from "@/app/dashboard/seguridad/actions";
import type {
  AppointmentNotification,
  NotificationOption,
  RegistrationState,
} from "@/lib/types";
const initial: RegistrationState = {};
function Dialog({
  close,
  title,
  children,
}: {
  close: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="session-dialog inventory-dialog"
      onCancel={close}
      onClick={(e) => e.target === ref.current && close()}
    >
      <section>
        <header>
          <span>
            <CheckIcon />
          </span>
          <div>
            <b className="page-eyebrow">AGENDA</b>
            <h2>{title}</h2>
            <p>Gestiona el registro y resultado del recordatorio.</p>
          </div>
          <button onClick={close}>
            <CloseIcon />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
function Error({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? (
    <small className="session-error">{state.fieldErrors[name]}</small>
  ) : null;
}
export function NewNotificationDialog({
  options,
}: {
  options: NotificationOption[];
}) {
  const [open, setOpen] = useState(false),
    [state, action, pending] = useActionState(createNotification, initial);
  return (
    <>
      <button className="directory-primary" onClick={() => setOpen(true)}>
        <PlusIcon />
        Nueva notificación
      </button>
      {open && (
        <Dialog close={() => setOpen(false)} title="Programar notificación">
          <form action={action} className="session-form">
            <div className="session-grid">
              <label className="session-wide">
                <span>Cita *</span>
                <select name="id_cita" defaultValue="" required>
                  <option value="" disabled>
                    Seleccionar cita
                  </option>
                  {options.map((x) => (
                    <option key={x.id_cita} value={x.id_cita}>
                      {new Intl.DateTimeFormat("es-BO", {
                        timeZone: "America/La_Paz",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(x.fecha_hora_inicio))}{" "}
                      · {x.paciente} · {x.servicio}
                    </option>
                  ))}
                </select>
                <Error state={state} name="id_cita" />
              </label>
              <label>
                <span>Tipo *</span>
                <select name="tipo" defaultValue="RECORDATORIO">
                  <option value="CONFIRMACION">Confirmación</option>
                  <option value="RECORDATORIO">Recordatorio</option>
                  <option value="REPROGRAMACION">Reprogramación</option>
                  <option value="CANCELACION">Cancelación</option>
                </select>
              </label>
              <label>
                <span>Canal *</span>
                <select name="canal" defaultValue="WHATSAPP">
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Correo</option>
                  <option value="SMS">SMS</option>
                  <option value="SISTEMA">Sistema</option>
                </select>
              </label>
              <label>
                <span>Programada para *</span>
                <input name="programada_para" type="datetime-local" required />
                <Error state={state} name="programada_para" />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="directory-primary" disabled={pending}>
                {pending ? "Guardando..." : "Programar"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              state={state}
              onSuccess={() => setOpen(false)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
export function NotificationActions({
  item,
}: {
  item: AppointmentNotification;
}) {
  const [pending, start] = useTransition(),
    [result, setResult] = useState<RegistrationState>({});
  if (item.estado !== "PENDIENTE") return null;
  const run = (estado: "ENVIADA" | "ERROR" | "CANCELADA") =>
    start(async () =>
      setResult(await changeNotification(item.id_notificacion, estado)),
    );
  return (
    <>
      <div className="session-actions">
        <button
          className="finish"
          title="Marcar enviada"
          disabled={pending}
          onClick={() => run("ENVIADA")}
        >
          <CheckIcon />
        </button>
        <button
          className="cancel"
          title="Marcar error"
          disabled={pending}
          onClick={() => run("ERROR")}
        >
          <CloseIcon />
        </button>
        <button
          className="cancel"
          title="Cancelar"
          disabled={pending}
          onClick={() => run("CANCELADA")}
        >
          <span>×</span>
        </button>
      </div>
      {result.resultId && (
        <SubmissionResultDialog
          state={result}
          onSuccess={() => setResult({})}
        />
      )}
    </>
  );
}
