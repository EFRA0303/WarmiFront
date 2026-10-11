"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CheckIcon, CloseIcon, EditIcon, PlusIcon, TreatmentIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { changeServiceRequestStatus, createServiceRequest, updateServiceRequest } from "@/app/dashboard/solicitudes/actions";
import type { RegistrationState, ServiceRequest, ServiceRequestOptions, ServiceRequestStatus } from "@/lib/types";

const initial: RegistrationState = {};
const localNow = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};
const fullName = (person: { nombre: string; ap_paterno: string; ap_materno: string | null }) => [person.nombre, person.ap_paterno, person.ap_materno].filter(Boolean).join(" ");
function Dialog({ close, eyebrow, title, description, children, wide = false }: { close: () => void; eyebrow: string; title: string; description: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (!ref.current?.open) ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`session-dialog request-dialog${wide ? " request-dialog--wide" : ""}`} onCancel={close} onClick={(event) => event.target === ref.current && close()}><section><header><span><TreatmentIcon /></span><div><b className="page-eyebrow">{eyebrow}</b><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={close} aria-label="Cerrar"><CloseIcon /></button></header>{children}</section></dialog>;
}
function ErrorText({ state, name }: { state: RegistrationState; name: string }) { return state.fieldErrors?.[name] ? <small className="session-error">{state.fieldErrors[name]}</small> : null; }
function CreateForm({ options, close }: { options: ServiceRequestOptions; close: () => void }) {
  const [state, action, pending] = useActionState(createServiceRequest, initial);
  const [serviceId, setServiceId] = useState("");
  const service = options.services.find((item) => item.id_servicio === Number(serviceId));
  return <><form action={action} className="session-form"><div className="session-grid">
    <label><span>Paciente *</span><select name="id_historial" defaultValue="" required><option value="">Seleccionar paciente</option>{options.patients.map((item) => <option value={item.id_historial} key={item.id_historial}>{fullName(item)}{item.ci ? ` · CI ${item.ci}` : ""}</option>)}</select><ErrorText state={state} name="id_historial" /></label>
    <label><span>Servicio solicitado *</span><select name="id_servicio" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required><option value="">Seleccionar servicio</option>{options.services.map((item) => <option value={item.id_servicio} key={item.id_servicio}>{item.nombre} · {item.area}</option>)}</select><ErrorText state={state} name="id_servicio" /></label>
    {service && <div className="session-appointment session-wide"><strong>{service.nombre}</strong><span>{service.area} · {service.categoria} · {service.duracion_minutos} minutos</span><small>{service.requiere_valoracion ? "Requiere valoración clínica" : "No exige valoración previa"}</small></div>}
    <label><span>Fecha de solicitud *</span><input type="datetime-local" name="fecha_solicitud" defaultValue={localNow()} required /><ErrorText state={state} name="fecha_solicitud" /></label>
    <label className="session-wide"><span>Motivo</span><textarea name="motivo" rows={5} maxLength={255} placeholder="Describe brevemente la necesidad del paciente." /></label>
  </div><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending || !options.patients.length || !service}>{pending ? "Guardando..." : "Crear solicitud"}</button></footer></form>{state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}</>;
}
export function NewServiceRequestDialog({ options }: { options: ServiceRequestOptions }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="directory-primary" onClick={() => setOpen(true)}><PlusIcon />Nueva solicitud</button>{open && <Dialog close={() => setOpen(false)} eyebrow="ATENCIÓN CLÍNICA" title="Nueva solicitud de servicio" description="Registra el servicio requerido dentro del historial del paciente." wide><CreateForm options={options} close={() => setOpen(false)} /></Dialog>}</>;
}
function EditForm({ request, close }: { request: ServiceRequest; close: () => void }) {
  const [state, action, pending] = useActionState(updateServiceRequest.bind(null, request.id_solicitud), initial);
  return <><form action={action} className="session-form"><div className="session-grid"><label className="session-wide"><span>Motivo de la solicitud</span><textarea name="motivo" rows={7} maxLength={255} defaultValue={request.motivo ?? ""} /></label></div><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button></footer></form>{state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}</>;
}
export function ServiceRequestActions({ request, canEdit }: { request: ServiceRequest; canEdit: boolean }) {
  const [dialog, setDialog] = useState<"edit" | "accept" | "discard" | null>(null);
  const [result, setResult] = useState<RegistrationState>({});
  const [pending, transition] = useTransition();
  if (!canEdit) return null;
  const terminal = request.estado === "ACEPTADO" || request.estado === "DESCARTADO";
  const confirm = (estado: ServiceRequestStatus) => transition(async () => { const response = await changeServiceRequestStatus(request.id_solicitud, estado); setDialog(null); setResult(response); });
  return <><div className="session-actions request-actions"><button type="button" onClick={() => setDialog("edit")} title="Editar motivo" aria-label={`Editar solicitud de ${request.paciente}`}><EditIcon /></button>{!terminal && <><button type="button" className="finish" onClick={() => setDialog("accept")} title="Aceptar solicitud" aria-label={`Aceptar solicitud de ${request.paciente}`}><CheckIcon /></button><button type="button" className="cancel" onClick={() => setDialog("discard")} title="Descartar solicitud" aria-label={`Descartar solicitud de ${request.paciente}`}><CloseIcon /></button></>}</div>
    {dialog === "edit" && <Dialog close={() => setDialog(null)} eyebrow="SOLICITUD CLÍNICA" title={`Solicitud de ${request.paciente}`} description={request.servicio}><EditForm request={request} close={() => setDialog(null)} /></Dialog>}
    {(dialog === "accept" || dialog === "discard") && <Dialog close={() => setDialog(null)} eyebrow={dialog === "accept" ? "CONTINUAR ATENCIÓN" : "CIERRE LÓGICO"} title={dialog === "accept" ? "Aceptar solicitud" : "Descartar solicitud"} description={dialog === "accept" ? "La solicitud quedará habilitada para continuar el proceso clínico." : "El registro se conservará como descartado."}><div className="session-confirm"><p>¿Confirmas esta acción para <strong>{request.paciente}</strong> · {request.servicio}?</p><footer><button type="button" onClick={() => setDialog(null)}>Volver</button><button type="button" className={dialog === "accept" ? "finish" : "danger"} disabled={pending} onClick={() => confirm(dialog === "accept" ? "ACEPTADO" : "DESCARTADO")}>{pending ? "Procesando..." : dialog === "accept" ? "Aceptar solicitud" : "Descartar solicitud"}</button></footer></div></Dialog>}
    {result.resultId && <SubmissionResultDialog key={result.resultId} state={result} onSuccess={() => setResult({})} />}
  </>;
}
