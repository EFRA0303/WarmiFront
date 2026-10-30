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
import Link from "next/link";
import {
  CalendarIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TreatmentIcon,
} from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  cancelTreatment,
  createTreatment,
  extendTreatment,
  updateTreatment,
} from "@/app/dashboard/tratamientos/actions";
import type {
  RegistrationState,
  TreatmentListItem,
  TreatmentOptions,
  TreatmentStatus,
} from "@/lib/types";

const initialState: RegistrationState = {};

function fullName(person: { nombre: string; ap_paterno: string; ap_materno: string | null }) {
  return [person.nombre, person.ap_paterno, person.ap_materno].filter(Boolean).join(" ");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="treatment-dialog"
      onCancel={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
    >
      <section className="treatment-dialog__panel">
        <header className="treatment-dialog__header">
          <span className="treatment-dialog__icon"><TreatmentIcon /></span>
          <div><span className="page-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

function FieldError({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? <small className="treatment-field-error">{state.fieldErrors[name]}</small> : null;
}

function PatientSearch({
  patients,
  value,
  onChange,
  hasError,
}: {
  patients: TreatmentOptions["patients"];
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(() => { const patient = patients.find(item => String(item.id_paciente) === value); return patient ? fullName(patient) : ""; });
  const [open, setOpen] = useState(false);
  const filteredPatients = useMemo(() => {
    const search = normalizeSearch(query.trim());
    if (!search) return patients;
    return patients.filter((patient) =>
      normalizeSearch(`${fullName(patient)} ${patient.ci ?? ""}`).includes(search),
    );
  }, [patients, query]);

  useEffect(() => {
    function closeOptions(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOptions);
    return () => document.removeEventListener("pointerdown", closeOptions);
  }, []);

  return (
    <div className="treatment-patient-search" ref={containerRef}>
      <input
        type="search"
        value={query}
        placeholder="Buscar por nombre, apellido, carnet o CI..."
        autoComplete="off"
        required
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="treatment-patient-options"
        aria-invalid={hasError}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
        }}
      />
      <input type="hidden" name="id_paciente" value={value} />
      {open && (
        <div className="treatment-patient-search__options" id="treatment-patient-options" role="listbox">
          {filteredPatients.length ? filteredPatients.map((patient) => {
            const name = fullName(patient);
            return (
              <button
                type="button"
                role="option"
                aria-selected={value === String(patient.id_paciente)}
                key={patient.id_paciente}
                onClick={() => {
                  onChange(String(patient.id_paciente));
                  setQuery(`${name}${patient.ci ? ` · CI ${patient.ci}` : ""}`);
                  setOpen(false);
                }}
              >
                <strong>{name}</strong>
                <small>{patient.ci ? `CI ${patient.ci}` : "Sin CI registrado"}</small>
              </button>
            );
          }) : <p>No encontramos pacientes con ese nombre o CI.</p>}
        </div>
      )}
    </div>
  );
}

function CreateForm({ options, onClose, defaultPatientId }: { options: TreatmentOptions; onClose: () => void; defaultPatientId?: number }) {
  const [state, action, pending] = useActionState(createTreatment, initialState);
  const [patientId, setPatientId] = useState(defaultPatientId ? String(defaultPatientId) : "");
  const [serviceId, setServiceId] = useState("");
  const [acquisitionId, setAcquisitionId] = useState("");
  const service = options.services.find(item => item.id_servicio === Number(serviceId));
  const acquisition = options.acquisitions.find(item => item.id_detalle_adquisicion === Number(acquisitionId));
  const initialSessions = acquisition?.sesiones_disponibles ?? service?.sesiones_incluidas ?? 1;
  const selectedPatient = options.patients.find((patient) => patient.id_paciente === Number(patientId));
  const acquisitions = useMemo(
    () => options.acquisitions.filter((item) =>
      (!selectedPatient || item.id_paciente === selectedPatient.id_paciente) &&
      (!serviceId || item.id_servicio === Number(serviceId))),
    [options.acquisitions, selectedPatient, serviceId],
  );
  const ready = options.patients.length > 0 && options.services.length > 0 && options.staff.length > 0;
  return (
    <>
      <form action={action} className="treatment-form">
        {!ready && <div className="treatment-setup-alert">Debe existir al menos un paciente activo, un servicio activo y un profesional clínico activo para asignar el servicio.</div>}
        <p className="treatment-field-help">Primero registra la adquisición y el primer abono (salvo servicios gratuitos). Luego vincula sus sesiones aquí. <Link href="/dashboard/adquisiciones">Adquisiciones</Link> · <Link href="/dashboard/ventas/pagos">Pagos</Link></p>
        <div className="treatment-form-grid">
          <label><span>Paciente *</span><PatientSearch patients={options.patients} value={patientId} onChange={value => { setPatientId(value); setAcquisitionId(""); }} hasError={Boolean(state.fieldErrors?.id_paciente)} /><FieldError state={state} name="id_paciente" /></label>
          <label><span>Servicio *</span><select name="id_servicio" required value={serviceId} onChange={(event) => { setServiceId(event.target.value); setAcquisitionId(""); }}><option value="">Seleccionar servicio</option>{options.services.map((service) => <option key={service.id_servicio} value={service.id_servicio}>{service.nombre} · {service.sesiones_incluidas ?? 1} sesiones · {service.duracion_minutos} min/sesión</option>)}</select><FieldError state={state} name="id_servicio" /></label>
          <label><span>Indicado por *</span><select name="indicado_por" required defaultValue=""><option value="">Seleccionar profesional</option>{options.staff.map((staff) => <option key={staff.id_personal} value={staff.id_personal}>{fullName(staff)} · {staff.cargo}</option>)}</select><FieldError state={state} name="indicado_por" /></label>
          <label><span>Sesiones asignadas *</span><input name="sesiones_iniciales" type="number" min="1" value={initialSessions} readOnly required /><small className="treatment-field-help">{acquisition ? "Sesiones disponibles de la adquisición vinculada." : "Cantidad estándar del servicio. Las ampliaciones se registran por separado."}</small><FieldError state={state} name="sesiones_iniciales" /></label>
          <label><span>Fecha de inicio</span><input name="fecha_inicio" type="date" /></label>
          <label><span>Adquisición vinculada *</span><select name="id_detalle_adquisicion" required value={acquisitionId} onChange={event => setAcquisitionId(event.target.value)} disabled={!patientId || !serviceId}><option value="">Seleccionar adquisición</option>{acquisitions.map((item) => <option key={item.id_detalle_adquisicion} value={item.id_detalle_adquisicion}>{item.nombre_servicio_snapshot} · {item.sesiones_disponibles} disponibles</option>)}</select><small className="treatment-field-help">Selecciona paciente y servicio para consultar sus adquisiciones compatibles. Se comprobará el primer abono al guardar.</small><FieldError state={state} name="id_detalle_adquisicion" /></label>
          <label className="treatment-form-grid__wide"><span>Observaciones</span><textarea name="observaciones" rows={4} /></label>
        </div>
        <footer><button type="button" className="treatment-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending || !ready || !acquisitionId}>{pending ? "Guardando..." : "Asignar servicio"}</button></footer>
      </form>
      {state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={onClose} />}
    </>
  );
}

export function NewTreatmentDialog({ options, defaultPatientId }: { options: TreatmentOptions; defaultPatientId?: number }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const close = () => { setOpen(false); setKey((value) => value + 1); };
  return (
    <>
      <button type="button" className="directory-primary" onClick={() => setOpen(true)}><PlusIcon />Asignar servicio</button>
      <DialogFrame open={open} onClose={close} eyebrow="SERVICIOS DEL PACIENTE" title="Asignar servicio al paciente" description="Selecciona el servicio configurado y organiza las sesiones del paciente."><CreateForm key={key} options={options} onClose={close} defaultPatientId={defaultPatientId} /></DialogFrame>
    </>
  );
}

function EditForm({ treatment, onClose }: { treatment: TreatmentListItem; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateTreatment.bind(null, treatment.id_tratamiento), initialState);
  const statuses: TreatmentStatus[] = treatment.estado === "PENDIENTE" ? ["PENDIENTE", "EN_CURSO"] : ["EN_CURSO", "FINALIZADO"];
  return (
    <>
      <form action={action} className="treatment-form">
        <div className="treatment-form-grid">
          <label><span>Fecha de inicio</span><input name="fecha_inicio" type="date" defaultValue={treatment.fecha_inicio?.slice(0, 10) ?? ""} /></label>
          <label><span>Estado *</span><select name="estado" defaultValue={treatment.estado}>{statuses.map((status) => <option value={status} key={status}>{status === "EN_CURSO" ? "En curso" : status === "FINALIZADO" ? "Finalizado" : "Pendiente"}</option>)}</select><FieldError state={state} name="estado" /></label>
          <label className="treatment-form-grid__wide"><span>Observaciones</span><textarea name="observaciones" rows={5} defaultValue={treatment.observaciones ?? ""} /></label>
        </div>
        <footer><button type="button" className="treatment-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button></footer>
      </form>
      {state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={onClose} />}
    </>
  );
}

function ExtendForm({ treatment, options, onClose }: { treatment: TreatmentListItem; options: TreatmentOptions; onClose: () => void }) {
  const [state, action, pending] = useActionState(extendTreatment.bind(null, treatment.id_tratamiento), initialState);
  return (
    <>
      <form action={action} className="treatment-form">
        <div className="treatment-form-grid">
          <label><span>Sesiones adicionales *</span><input name="sesiones_agregadas" type="number" min="1" max="999" required /><FieldError state={state} name="sesiones_agregadas" /></label>
          <label><span>Autorizado por *</span><select name="autorizado_por" defaultValue="" required><option value="">Seleccionar profesional</option>{options.staff.map((staff) => <option key={staff.id_personal} value={staff.id_personal}>{fullName(staff)}</option>)}</select><FieldError state={state} name="autorizado_por" /></label>
          <label className="treatment-form-grid__wide"><span>Motivo</span><textarea name="motivo" rows={4} maxLength={255} /></label>
        </div>
        <footer><button type="button" className="treatment-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Agregar sesiones"}</button></footer>
      </form>
      {state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={onClose} />}
    </>
  );
}

export function TreatmentActions({
  treatment,
  options,
  canEdit,
  canCancel,
  canReserve,
}: {
  treatment: TreatmentListItem;
  options: TreatmentOptions;
  canEdit: boolean;
  canCancel: boolean;
  canReserve: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [result, setResult] = useState<RegistrationState>({});
  const [pending, startTransition] = useTransition();
  const active = treatment.estado === "PENDIENTE" || treatment.estado === "EN_CURSO";
  const total = treatment.sesiones_iniciales + treatment.sesiones_agregadas;
  const remaining = total - treatment.sesiones_realizadas;

  function cancel() {
    startTransition(async () => {
      const response = await cancelTreatment(treatment.id_tratamiento);
      setCancelOpen(false);
      setResult(response);
    });
  }

  return (
    <>
      <div className="treatment-actions">
        {canReserve && active && remaining > 0 && <Link href={`/dashboard/agenda?id_tratamiento=${treatment.id_tratamiento}`} title="Reservar sesión" aria-label={`Reservar sesión de ${treatment.paciente}`}><CalendarIcon /></Link>}
        {canEdit && active && <button type="button" onClick={() => setEditOpen(true)} title="Editar servicio asignado" aria-label="Editar servicio asignado"><EditIcon /></button>}
        {canEdit && active && <button type="button" onClick={() => setExtendOpen(true)} title="Ampliar sesiones" aria-label="Ampliar sesiones"><PlusIcon /></button>}
        {canCancel && active && <button type="button" className="treatment-action-cancel" onClick={() => setCancelOpen(true)} title="Cancelar servicio asignado" aria-label="Cancelar servicio asignado"><CloseIcon /></button>}
      </div>
      <DialogFrame open={editOpen} onClose={() => setEditOpen(false)} eyebrow="SERVICIO ASIGNADO" title={treatment.servicio} description={`Servicio de ${treatment.paciente}.`}><EditForm treatment={treatment} onClose={() => setEditOpen(false)} /></DialogFrame>
      <DialogFrame open={extendOpen} onClose={() => setExtendOpen(false)} eyebrow="AMPLIAR SESIONES" title="Agregar sesiones" description={`${treatment.sesiones_realizadas} de ${total} sesiones realizadas.`}><ExtendForm treatment={treatment} options={options} onClose={() => setExtendOpen(false)} /></DialogFrame>
      <DialogFrame open={cancelOpen} onClose={() => setCancelOpen(false)} eyebrow="CANCELACIÓN LÓGICA" title="Cancelar servicio asignado" description="El registro se conservará, pero dejará de admitir reservas.">
        <div className="treatment-confirm"><p>¿Confirmas la cancelación del servicio <strong>{treatment.servicio}</strong> de <strong>{treatment.paciente}</strong>?</p><footer><button type="button" className="treatment-secondary" onClick={() => setCancelOpen(false)}>Volver</button><button type="button" className="treatment-danger" onClick={cancel} disabled={pending}>{pending ? "Cancelando..." : "Cancelar servicio asignado"}</button></footer></div>
      </DialogFrame>
      {result.resultId && <SubmissionResultDialog key={result.resultId} state={result} onSuccess={() => setResult({})} />}
    </>
  );
}
