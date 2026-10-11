"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChartIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TreatmentIcon,
} from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  createValuation,
  saveValuationMeasures,
  updateValuation,
} from "@/app/dashboard/valoraciones/actions";
import type {
  ClinicalValuation,
  RegistrationState,
  ValuationOptions,
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
const fullName = (person: {
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
}) => [person.nombre, person.ap_paterno, person.ap_materno].filter(Boolean).join(" ");
function Dialog({
  close,
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: {
  close: () => void;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`session-dialog valuation-dialog${wide ? " valuation-dialog--wide" : ""}`}
      onCancel={close}
      onClick={(event) => event.target === ref.current && close()}
    >
      <section>
        <header>
          <span><TreatmentIcon /></span>
          <div>
            <b className="page-eyebrow">{eyebrow}</b>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar"><CloseIcon /></button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
function ErrorText({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? (
    <small className="session-error">{state.fieldErrors[name]}</small>
  ) : null;
}
function sourceDetails(options: ValuationOptions, key: string) {
  const [kind, rawId] = key.split(":");
  const sourceId = Number(rawId);
  if (kind === "patient") {
    const row = options.patients.find((item) => item.id_historial === sourceId);
    return row
      ? { id_historial: row.id_historial, patient: fullName(row), service: null }
      : null;
  }
  if (kind === "request") {
    const row = options.requests.find((item) => item.id_solicitud === sourceId);
    return row ? { ...row, id_solicitud: row.id_solicitud, patient: row.paciente, service: row.servicio } : null;
  }
  if (kind === "treatment") {
    const row = options.treatments.find((item) => item.id_tratamiento === sourceId);
    return row ? { ...row, id_tratamiento: row.id_tratamiento, patient: row.paciente, service: row.servicio } : null;
  }
  const row = options.sessions.find((item) => item.id_sesion === sourceId);
  return row ? { ...row, id_sesion: row.id_sesion, patient: row.paciente, service: row.servicio } : null;
}
function CreateForm({ options, close }: { options: ValuationOptions; close: () => void }) {
  const [state, action, pending] = useActionState(createValuation, initial);
  const [sourceKey, setSourceKey] = useState("");
  const source = sourceDetails(options, sourceKey);
  return (
    <>
      <form action={action} className="session-form">
        {!options.patients.length || !options.staff.length ? (
          <p className="session-setup-alert">
            Debe existir al menos un paciente con historial activo y un profesional clínico activo.
          </p>
        ) : null}
        <div className="session-grid">
          <label className="session-wide">
            <span>Paciente y origen clínico *</span>
            <select value={sourceKey} onChange={(event) => setSourceKey(event.target.value)} required>
              <option value="">Seleccionar paciente u origen</option>
              <optgroup label="Valoración independiente">
                {options.patients.map((item) => (
                  <option key={`patient:${item.id_historial}`} value={`patient:${item.id_historial}`}>
                    {fullName(item)}{item.ci ? ` · CI ${item.ci}` : ""}
                  </option>
                ))}
              </optgroup>
              {options.requests.length > 0 && <optgroup label="Solicitudes de servicio">
                {options.requests.map((item) => <option key={`request:${item.id_solicitud}`} value={`request:${item.id_solicitud}`}>{item.paciente} · {item.servicio}</option>)}
              </optgroup>}
              {options.treatments.length > 0 && <optgroup label="Tratamientos">
                {options.treatments.map((item) => <option key={`treatment:${item.id_tratamiento}`} value={`treatment:${item.id_tratamiento}`}>{item.paciente} · {item.servicio} · #{item.id_tratamiento}</option>)}
              </optgroup>}
              {options.sessions.length > 0 && <optgroup label="Sesiones clínicas">
                {options.sessions.map((item) => <option key={`session:${item.id_sesion}`} value={`session:${item.id_sesion}`}>{item.paciente} · {item.servicio} · Sesión #{item.id_sesion}</option>)}
              </optgroup>}
            </select>
            <ErrorText state={state} name="id_historial" />
          </label>
          <input type="hidden" name="id_historial" value={source?.id_historial ?? ""} />
          <input type="hidden" name="id_solicitud" value={source && "id_solicitud" in source ? source.id_solicitud : ""} />
          <input type="hidden" name="id_tratamiento" value={source && "id_tratamiento" in source && !("id_sesion" in source) ? source.id_tratamiento : ""} />
          <input type="hidden" name="id_sesion" value={source && "id_sesion" in source ? source.id_sesion : ""} />
          {source && <div className="session-appointment session-wide">
            <strong>{source.patient}</strong>
            <span>{source.service ?? "Valoración general sin servicio asociado"}</span>
          </div>}
          <label>
            <span>Tipo de valoración *</span>
            <select name="tipo" defaultValue="INICIAL" required>
              <option value="INICIAL">Inicial</option>
              <option value="EVOLUCION">Evolución</option>
              <option value="FINAL">Final</option>
            </select>
            <ErrorText state={state} name="tipo" />
          </label>
          <label>
            <span>Profesional responsable *</span>
            <select name="id_personal" defaultValue="" required>
              <option value="">Seleccionar profesional</option>
              {options.staff.map((item) => <option key={item.id_personal} value={item.id_personal}>{fullName(item)} · {item.cargo}</option>)}
            </select>
            <ErrorText state={state} name="id_personal" />
          </label>
          <label>
            <span>Fecha y hora *</span>
            <input type="datetime-local" name="fecha_valoracion" defaultValue={localNow()} required />
            <ErrorText state={state} name="fecha_valoracion" />
          </label>
          <label className="session-wide">
            <span>Observaciones clínicas</span>
            <textarea name="observaciones" rows={5} />
          </label>
        </div>
        <footer>
          <button type="button" onClick={close}>Cancelar</button>
          <button className="directory-primary" disabled={pending || !source || !options.staff.length}>
            {pending ? "Guardando..." : "Crear valoración"}
          </button>
        </footer>
      </form>
      {state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}
    </>
  );
}
export function NewValuationDialog({ options }: { options: ValuationOptions }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="directory-primary" onClick={() => setOpen(true)}><PlusIcon />Nueva valoración</button>
    {open && <Dialog close={() => setOpen(false)} eyebrow="REGISTRO CLÍNICO" title="Nueva valoración" description="Vincula la evaluación al historial y a su origen clínico." wide>
      <CreateForm options={options} close={() => setOpen(false)} />
    </Dialog>}
  </>;
}
function NotesForm({ valuation, close }: { valuation: ClinicalValuation; close: () => void }) {
  const [state, action, pending] = useActionState(updateValuation.bind(null, valuation.id_valoracion), initial);
  return <>
    <form action={action} className="session-form">
      <div className="session-grid"><label className="session-wide"><span>Observaciones clínicas</span><textarea name="observaciones" rows={8} defaultValue={valuation.observaciones ?? ""} /></label></div>
      <footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button></footer>
    </form>
    {state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}
  </>;
}
function MeasuresForm({ valuation, options, close }: { valuation: ClinicalValuation; options: ValuationOptions; close: () => void }) {
  const [state, action, pending] = useActionState(saveValuationMeasures.bind(null, valuation.id_valoracion), initial);
  const allowedIds = valuation.id_servicio
    ? new Set(options.serviceMeasures.filter((item) => item.id_servicio === valuation.id_servicio).map((item) => item.id_tipo_medida))
    : new Set(options.measureTypes.map((item) => item.id_tipo_medida));
  const measures = options.measureTypes.filter((item) => allowedIds.has(item.id_tipo_medida));
  const existing = new Map(valuation.medidas.map((item) => [item.id_tipo_medida, String(item.valor)]));
  return <>
    <form action={action} className="session-form">
      {!measures.length ? <p className="session-setup-alert">El servicio todavía no tiene tipos de medida configurados en el catálogo.</p> : <div className="valuation-measure-grid">
        {measures.map((measure) => {
          const required = options.serviceMeasures.some((item) => item.id_servicio === valuation.id_servicio && item.id_tipo_medida === measure.id_tipo_medida && item.obligatorio);
          const name = `measure_${measure.id_tipo_medida}`;
          return <label key={measure.id_tipo_medida}>
            <span>{measure.nombre}{required ? " *" : ""}</span>
            <div><input type="number" step="0.01" name={name} defaultValue={existing.get(measure.id_tipo_medida) ?? ""} required={required} /><b>{measure.unidad ?? "valor"}</b></div>
            <ErrorText state={state} name={name} />
          </label>;
        })}
      </div>}
      <footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending || !measures.length}>{pending ? "Guardando..." : "Guardar medidas"}</button></footer>
    </form>
    {state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}
  </>;
}
export function ValuationActions({ valuation, options, canEdit }: { valuation: ClinicalValuation; options: ValuationOptions; canEdit: boolean }) {
  const [dialog, setDialog] = useState<"notes" | "measures" | null>(null);
  if (!canEdit) return null;
  return <>
    <div className="session-actions valuation-actions">
      <button type="button" onClick={() => setDialog("notes")} title="Editar observaciones" aria-label={`Editar valoración de ${valuation.paciente}`}><EditIcon /></button>
      <button type="button" className="finish" onClick={() => setDialog("measures")} title="Registrar medidas" aria-label={`Registrar medidas de ${valuation.paciente}`}><ChartIcon /></button>
    </div>
    {dialog === "notes" && <Dialog close={() => setDialog(null)} eyebrow="VALORACIÓN CLÍNICA" title={`Valoración de ${valuation.paciente}`} description={valuation.servicio ?? "Valoración general"}><NotesForm valuation={valuation} close={() => setDialog(null)} /></Dialog>}
    {dialog === "measures" && <Dialog close={() => setDialog(null)} eyebrow="EVOLUCIÓN Y MEDIDAS" title={`Medidas de ${valuation.paciente}`} description={valuation.servicio ?? "Valoración general"} wide><MeasuresForm valuation={valuation} options={options} close={() => setDialog(null)} /></Dialog>}
  </>;
}
