"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { BoxIcon, CheckIcon, CloseIcon, EditIcon, PlusIcon, SettingsIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { changePromotionStatus, createPromotion, savePromotionServices, updatePromotion } from "@/app/dashboard/promociones/actions";
import type { CommercialPromotion, PromotionOptions, PromotionStatus, RegistrationState } from "@/lib/types";

const initial: RegistrationState = {};
const statusLabels: Record<PromotionStatus, string> = { PROGRAMADA: "Programada", ACTIVA: "Activa", FINALIZADA: "Finalizada", CANCELADA: "Cancelada" };

function localDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function Dialog({ close, eyebrow, title, description, children, wide = false }: { close: () => void; eyebrow: string; title: string; description: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (!ref.current?.open) ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`session-dialog package-dialog${wide ? " package-dialog--wide" : ""}`} onCancel={close} onClick={(event) => event.target === ref.current && close()}><section><header><span><BoxIcon /></span><div><b className="page-eyebrow">{eyebrow}</b><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={close} aria-label="Cerrar"><CloseIcon /></button></header>{children}</section></dialog>;
}

function ErrorText({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? <small className="session-error">{state.fieldErrors[name]}</small> : null;
}

function PromotionForm({ item, close }: { item?: CommercialPromotion; close: () => void }) {
  const editableRules = !item || item.estado === "PROGRAMADA";
  const [state, action, pending] = useActionState(item ? updatePromotion.bind(null, item.id_promocion, item.estado) : createPromotion, initial);
  return <><form action={action} className="session-form"><div className="session-grid"><label><span>Nombre de la promoción *</span><input name="nombre" maxLength={120} defaultValue={item?.nombre ?? ""} required /><ErrorText state={state} name="nombre" /></label><label><span>Tipo de descuento *</span><select name="tipo_descuento" defaultValue={item?.tipo_descuento ?? "PORCENTAJE"} disabled={!editableRules}><option value="PORCENTAJE">Porcentaje</option><option value="MONTO_FIJO">Monto fijo</option></select><ErrorText state={state} name="tipo_descuento" /></label><label><span>Valor del descuento *</span><input type="number" min="0" step="0.01" name="valor_descuento" defaultValue={item ? String(item.valor_descuento) : ""} disabled={!editableRules} required={editableRules} /><ErrorText state={state} name="valor_descuento" /></label><label><span>Inicio de vigencia *</span><input type="datetime-local" name="fecha_inicio" defaultValue={item ? localDateTime(item.fecha_inicio) : ""} disabled={!editableRules} required={editableRules} /><ErrorText state={state} name="fecha_inicio" /></label><label><span>Fin de vigencia *</span><input type="datetime-local" name="fecha_fin" defaultValue={item ? localDateTime(item.fecha_fin) : ""} disabled={!editableRules} required={editableRules} /><ErrorText state={state} name="fecha_fin" /></label><label className="session-wide"><span>Descripción</span><textarea name="descripcion" maxLength={255} rows={4} defaultValue={item?.descripcion ?? ""} /></label></div>{item?.estado === "ACTIVA" && <p className="package-service-note">Una promoción activa conserva su descuento y vigencia; solo puedes actualizar su nombre y descripción.</p>}<footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Crear promoción"}</button></footer></form>{state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}</>;
}

export function NewPromotionDialog() {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="directory-primary" onClick={() => setOpen(true)}><PlusIcon />Nueva promoción</button>{open && <Dialog close={() => setOpen(false)} eyebrow="NUEVA PROMOCIÓN" title="Crear promoción" description="Define el descuento y su periodo de vigencia."><PromotionForm close={() => setOpen(false)} /></Dialog>}</>;
}

function ServicesForm({ item, options, close }: { item: CommercialPromotion; options: PromotionOptions; close: () => void }) {
  const [state, action, pending] = useActionState(savePromotionServices.bind(null, item.id_promocion), initial);
  const [search, setSearch] = useState("");
  const current = new Map(item.servicios.map((service) => [service.id_servicio, service.sesiones_incluidas]));
  const normalized = search.trim().toLocaleLowerCase("es");
  const services = options.services.filter((service) => !normalized || `${service.nombre} ${service.categoria} ${service.area}`.toLocaleLowerCase("es").includes(normalized));
  return <><form action={action} className="session-form"><label className="package-service-search"><span>Buscar servicio</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, categoría o área..." /></label><div className="package-service-list">{services.map((service) => { const name = `service_${service.id_servicio}`; const existing = current.get(service.id_servicio); return <label key={service.id_servicio} className={existing ? "configured" : ""}><div><strong>{service.nombre}</strong><span>{service.area} · {service.categoria} · {service.duracion_minutos} min</span></div><div><input type="number" min="1" step="1" name={name} defaultValue={existing ?? ""} required={Boolean(existing)} placeholder="0" /><b>sesiones</b></div><ErrorText state={state} name={name} /></label>; })}{!services.length && <p className="history-empty">No encontramos servicios con ese criterio.</p>}</div><p className="package-service-note">Los servicios ya configurados deben conservar al menos una sesión. Esta pantalla no elimina relaciones existentes.</p><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending || !options.services.length}>{pending ? "Guardando..." : "Guardar servicios"}</button></footer></form>{state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}</>;
}

function transitions(item: CommercialPromotion): PromotionStatus[] {
  if (item.estado === "PROGRAMADA") return ["ACTIVA", "CANCELADA"];
  if (item.estado === "ACTIVA") return ["FINALIZADA", "CANCELADA"];
  return [];
}

export function PromotionActions({ item, options, canEdit }: { item: CommercialPromotion; options: PromotionOptions; canEdit: boolean }) {
  const [dialog, setDialog] = useState<"edit" | "services" | PromotionStatus | null>(null);
  const [result, setResult] = useState<RegistrationState>({});
  const [pending, transition] = useTransition();
  if (!canEdit) return null;
  const mutable = item.estado === "PROGRAMADA" || item.estado === "ACTIVA";
  return <><div className="session-actions package-actions">{mutable && <button type="button" onClick={() => setDialog("edit")} title="Editar promoción"><EditIcon /></button>}{mutable && <button type="button" className="finish" onClick={() => setDialog("services")} title="Configurar servicios"><SettingsIcon /></button>}{transitions(item).map((next) => <button type="button" key={next} className={next === "CANCELADA" ? "cancel" : "finish"} onClick={() => setDialog(next)} title={next === "ACTIVA" ? "Activar" : next === "FINALIZADA" ? "Finalizar" : "Cancelar"}>{next === "CANCELADA" ? <CloseIcon /> : <CheckIcon />}</button>)}</div>{dialog === "edit" && <Dialog close={() => setDialog(null)} eyebrow="EDITAR PROMOCIÓN" title={item.nombre} description="Actualiza la información permitida según su estado."><PromotionForm item={item} close={() => setDialog(null)} /></Dialog>}{dialog === "services" && <Dialog close={() => setDialog(null)} eyebrow="SERVICIOS INCLUIDOS" title={item.nombre} description="Indica cuántas sesiones contempla esta promoción." wide><ServicesForm item={item} options={options} close={() => setDialog(null)} /></Dialog>}{dialog && !new Set(["edit", "services"]).has(dialog) && <Dialog close={() => setDialog(null)} eyebrow="CAMBIO DE ESTADO" title={`${dialog === "ACTIVA" ? "Activar" : dialog === "FINALIZADA" ? "Finalizar" : "Cancelar"} promoción`} description={`Estado actual: ${statusLabels[item.estado]}.`}><div className="session-confirm"><p>¿Confirmas cambiar <strong>{item.nombre}</strong> a <strong>{statusLabels[dialog as PromotionStatus]}</strong>?</p><footer><button type="button" onClick={() => setDialog(null)}>Volver</button><button type="button" className={dialog === "CANCELADA" ? "danger" : "finish"} disabled={pending} onClick={() => transition(async () => { const response = await changePromotionStatus(item.id_promocion, dialog as PromotionStatus); setDialog(null); setResult(response); })}>{pending ? "Procesando..." : "Confirmar"}</button></footer></div></Dialog>}{result.resultId && <SubmissionResultDialog key={result.resultId} state={result} onSuccess={() => setResult({})} />}</>;
}
