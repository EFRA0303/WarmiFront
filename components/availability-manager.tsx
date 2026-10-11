"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarIcon, CloseIcon, EditIcon, PlusIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { saveExtraSchedule, saveRegularSchedule, saveStaffBlock } from "@/app/dashboard/personal/disponibilidad/actions";
import type { AvailabilityData, AvailabilityStaff, ExtraSchedule, RegistrationState, RegularSchedule, StaffBlock, Weekday } from "@/lib/types";

type Tab = "regular" | "extras" | "blocks";
type Editor = { kind: "regular"; item?: RegularSchedule } | { kind: "extra"; item?: ExtraSchedule } | { kind: "block"; item?: StaffBlock } | null;
const initial: RegistrationState = {};
const days: Array<{ value: Weekday; label: string }> = [
  { value: "LUNES", label: "Lunes" }, { value: "MARTES", label: "Martes" }, { value: "MIERCOLES", label: "Miércoles" },
  { value: "JUEVES", label: "Jueves" }, { value: "VIERNES", label: "Viernes" }, { value: "SABADO", label: "Sábado" }, { value: "DOMINGO", label: "Domingo" },
];
const dayLabel = (value: Weekday) => days.find((day) => day.value === value)?.label ?? value;
const fullName = (staff: AvailabilityStaff) => [staff.nombre, staff.ap_paterno, staff.ap_materno].filter(Boolean).join(" ");
const initials = (staff: AvailabilityStaff) => `${staff.nombre[0] ?? ""}${staff.ap_paterno[0] ?? ""}`.toUpperCase();
const shortTime = (value: string) => value.slice(0, 5);
const localDateTime = (value: string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
const dateTimeLabel = (value: string) => new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" }).format(new Date(value));

function Dialog({ open, close, title, description, children }: { open: boolean; close: () => void; title: string; description: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); if (!open && ref.current?.open) ref.current.close(); }, [open]);
  return <dialog ref={ref} className="availability-dialog" onCancel={close} onClick={(event) => event.target === ref.current && close()}><section><header><span><CalendarIcon /></span><div><b className="page-eyebrow">DISPONIBILIDAD</b><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={close} aria-label="Cerrar"><CloseIcon /></button></header>{children}</section></dialog>;
}
function StaffOption({ staff }: { staff: AvailabilityStaff }) { return <option value={staff.id_personal}>{fullName(staff)} · {staff.cargo}</option>; }
function ErrorText({ state, name }: { state: RegistrationState; name: string }) { return state.fieldErrors?.[name] ? <small className="availability-error">{state.fieldErrors[name]}</small> : null; }
function Result({ state, close }: { state: RegistrationState; close: () => void }) { return state.resultId ? <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} /> : null; }

function RegularForm({ item, staff, close }: { item?: RegularSchedule; staff: AvailabilityStaff[]; close: () => void }) {
  const [state, action, pending] = useActionState(saveRegularSchedule.bind(null, item?.id_horario ?? null), initial);
  return <><form action={action} className="availability-form"><div className="availability-grid">
    {!item && <label><span>Especialista *</span><select name="id_personal" required defaultValue=""><option value="">Seleccionar especialista</option>{staff.filter((person) => person.estado === "ACTIVO").map((person) => <StaffOption key={person.id_personal} staff={person} />)}</select><ErrorText state={state} name="id_personal" /></label>}
    <label><span>Día *</span><select name="dia_semana" required defaultValue={item?.dia_semana ?? ""}><option value="">Seleccionar día</option>{days.map((day) => <option value={day.value} key={day.value}>{day.label}</option>)}</select><ErrorText state={state} name="dia_semana" /></label>
    <label><span>Hora inicial *</span><input name="hora_inicio" type="time" required defaultValue={item ? shortTime(item.hora_inicio) : "08:00"} /><ErrorText state={state} name="hora_inicio" /></label>
    <label><span>Hora final *</span><input name="hora_fin" type="time" required defaultValue={item ? shortTime(item.hora_fin) : "12:00"} /><ErrorText state={state} name="hora_fin" /></label>
    {item && <label><span>Estado *</span><select name="estado" defaultValue={String(item.estado)}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>}
  </div><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Registrar horario"}</button></footer></form><Result state={state} close={close} /></>;
}

function ExtraForm({ item, staff, close }: { item?: ExtraSchedule; staff: AvailabilityStaff[]; close: () => void }) {
  const [state, action, pending] = useActionState(saveExtraSchedule.bind(null, item?.id_horario_extra ?? null), initial);
  return <><form action={action} className="availability-form"><div className="availability-grid">
    {!item && <label><span>Especialista *</span><select name="id_personal" required defaultValue=""><option value="">Seleccionar especialista</option>{staff.filter((person) => person.estado === "ACTIVO").map((person) => <StaffOption key={person.id_personal} staff={person} />)}</select><ErrorText state={state} name="id_personal" /></label>}
    <label><span>Fecha *</span><input name="fecha" type="date" required defaultValue={item?.fecha.slice(0, 10) ?? ""} /><ErrorText state={state} name="fecha" /></label>
    <label><span>Hora inicial *</span><input name="hora_inicio" type="time" required defaultValue={item ? shortTime(item.hora_inicio) : "08:00"} /><ErrorText state={state} name="hora_inicio" /></label>
    <label><span>Hora final *</span><input name="hora_fin" type="time" required defaultValue={item ? shortTime(item.hora_fin) : "12:00"} /><ErrorText state={state} name="hora_fin" /></label>
    {item && <label><span>Estado *</span><select name="estado" defaultValue={item.estado}><option value="AUTORIZADO">Autorizado</option><option value="CANCELADO">Cancelado</option></select></label>}
    <label className="availability-wide"><span>Motivo</span><textarea name="motivo" rows={3} maxLength={255} defaultValue={item?.motivo ?? ""} placeholder="Ej. Atención especial fuera del horario habitual" /></label>
  </div><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Autorizar horario"}</button></footer></form><Result state={state} close={close} /></>;
}

function BlockForm({ item, staff, close }: { item?: StaffBlock; staff: AvailabilityStaff[]; close: () => void }) {
  const [state, action, pending] = useActionState(saveStaffBlock.bind(null, item?.id_bloqueo ?? null), initial);
  return <><form action={action} className="availability-form"><div className="availability-grid">
    {!item && <label><span>Especialista *</span><select name="id_personal" required defaultValue=""><option value="">Seleccionar especialista</option>{staff.filter((person) => person.estado === "ACTIVO").map((person) => <StaffOption key={person.id_personal} staff={person} />)}</select><ErrorText state={state} name="id_personal" /></label>}
    <label><span>Inicio *</span><input name="fecha_hora_inicio" type="datetime-local" required defaultValue={item ? localDateTime(item.fecha_hora_inicio) : ""} /><ErrorText state={state} name="fecha_hora_inicio" /></label>
    <label><span>Finalización *</span><input name="fecha_hora_fin" type="datetime-local" required defaultValue={item ? localDateTime(item.fecha_hora_fin) : ""} /><ErrorText state={state} name="fecha_hora_fin" /></label>
    {item && <label><span>Estado *</span><select name="estado" defaultValue={String(item.estado)}><option value="true">Activo</option><option value="false">Cancelado</option></select></label>}
    <label className="availability-wide"><span>Motivo</span><textarea name="motivo" rows={3} maxLength={255} defaultValue={item?.motivo ?? ""} placeholder="Ej. Vacaciones, ausencia, descanso o capacitación" /></label>
  </div><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Registrar bloqueo"}</button></footer></form><Result state={state} close={close} /></>;
}

function StaffCell({ staff }: { staff?: AvailabilityStaff }) {
  if (!staff) return <span>Personal no disponible</span>;
  return <div className="availability-person">{staff.foto_perfil_ruta ? <Image src={`/api/users/${staff.id_usuario}/profile-photo`} alt="" width={38} height={38} unoptimized /> : <i>{initials(staff)}</i>}<span><strong>{fullName(staff)}</strong><small>{staff.cargo}</small></span></div>;
}
function BooleanStatus({ active, inactive = "Inactivo" }: { active: boolean; inactive?: string }) { return <span className={`availability-status ${active ? "active" : "inactive"}`}><i />{active ? "Activo" : inactive}</span>; }

export function AvailabilityManager({ data, initialTab = "regular", canCreate, canEdit }: { data: AvailabilityData; initialTab?: Tab; canCreate: boolean; canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [staffId, setStaffId] = useState(0);
  const [editor, setEditor] = useState<Editor>(null);
  const staffMap = useMemo(() => new Map(data.staff.map((staff) => [staff.id_personal, staff])), [data.staff]);
  const schedules = data.schedules.filter((item) => !staffId || item.id_personal === staffId);
  const extras = data.extras.filter((item) => !staffId || item.id_personal === staffId);
  const blocks = data.blocks.filter((item) => !staffId || item.id_personal === staffId);
  const close = () => setEditor(null);
  const openNew = () => setEditor({ kind: tab === "regular" ? "regular" : tab === "extras" ? "extra" : "block" });
  return <div className="availability-manager">
    <div className="availability-summary"><article><span>Especialistas</span><strong>{data.staff.filter((item) => item.estado === "ACTIVO").length}</strong><small>disponibles para agenda</small></article><article><span>Horarios habituales</span><strong>{data.schedules.filter((item) => item.estado).length}</strong><small>tramos activos</small></article><article><span>Próximas excepciones</span><strong>{data.extras.filter((item) => item.estado === "AUTORIZADO").length}</strong><small>horarios autorizados</small></article><article><span>Bloqueos activos</span><strong>{data.blocks.filter((item) => item.estado).length}</strong><small>periodos restringidos</small></article></div>
    <div className="availability-tabs"><button className={tab === "regular" ? "active" : ""} onClick={() => setTab("regular")}>Horarios habituales</button><button className={tab === "extras" ? "active" : ""} onClick={() => setTab("extras")}>Horarios extraordinarios</button><button className={tab === "blocks" ? "active" : ""} onClick={() => setTab("blocks")}>Bloqueos</button></div>
    <div className="availability-toolbar"><label><span>Especialista</span><select value={staffId} onChange={(event) => setStaffId(Number(event.target.value))}><option value={0}>Todos los especialistas</option>{data.staff.map((staff) => <StaffOption staff={staff} key={staff.id_personal} />)}</select></label>{canCreate && <button type="button" className="directory-primary" onClick={openNew}><PlusIcon />{tab === "regular" ? "Nuevo horario" : tab === "extras" ? "Horario extraordinario" : "Nuevo bloqueo"}</button>}</div>
    <div className="availability-table"><table><thead>{tab === "regular" ? <tr><th>Especialista</th><th>Día</th><th>Horario</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr> : tab === "extras" ? <tr><th>Especialista</th><th>Fecha</th><th>Horario</th><th>Motivo</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr> : <tr><th>Especialista</th><th>Periodo bloqueado</th><th>Motivo</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr>}</thead><tbody>
      {tab === "regular" && schedules.map((item) => <tr key={item.id_horario}><td><StaffCell staff={staffMap.get(item.id_personal)} /></td><td><strong>{dayLabel(item.dia_semana)}</strong></td><td>{shortTime(item.hora_inicio)} – {shortTime(item.hora_fin)}</td><td><BooleanStatus active={item.estado} /></td>{canEdit && <td><button className="availability-edit" onClick={() => setEditor({ kind: "regular", item })}><EditIcon /></button></td>}</tr>)}
      {tab === "extras" && extras.map((item) => <tr key={item.id_horario_extra}><td><StaffCell staff={staffMap.get(item.id_personal)} /></td><td><strong>{dateLabel(item.fecha)}</strong></td><td>{shortTime(item.hora_inicio)} – {shortTime(item.hora_fin)}</td><td>{item.motivo || "Sin motivo"}</td><td><BooleanStatus active={item.estado === "AUTORIZADO"} inactive="Cancelado" /></td>{canEdit && <td><button className="availability-edit" onClick={() => setEditor({ kind: "extra", item })}><EditIcon /></button></td>}</tr>)}
      {tab === "blocks" && blocks.map((item) => <tr key={item.id_bloqueo}><td><StaffCell staff={staffMap.get(item.id_personal)} /></td><td><strong>{dateTimeLabel(item.fecha_hora_inicio)}</strong><small>hasta {dateTimeLabel(item.fecha_hora_fin)}</small></td><td>{item.motivo || "Sin motivo"}</td><td><BooleanStatus active={item.estado} inactive="Cancelado" /></td>{canEdit && <td><button className="availability-edit" onClick={() => setEditor({ kind: "block", item })}><EditIcon /></button></td>}</tr>)}
    </tbody></table>{((tab === "regular" && !schedules.length) || (tab === "extras" && !extras.length) || (tab === "blocks" && !blocks.length)) && <div className="availability-empty">No existen registros para este filtro.</div>}</div>
    <Dialog open={editor !== null} close={close} title={editor?.kind === "regular" ? `${editor.item ? "Editar" : "Nuevo"} horario habitual` : editor?.kind === "extra" ? `${editor.item ? "Editar" : "Nuevo"} horario extraordinario` : editor?.kind === "block" ? `${editor.item ? "Editar" : "Nuevo"} bloqueo` : "Disponibilidad"} description={editor?.kind === "regular" ? "Define un tramo semanal de trabajo." : editor?.kind === "extra" ? "Autoriza atención fuera del horario habitual para una fecha." : "Impide nuevas reservas durante una ausencia, descanso o vacación."}>
      {editor?.kind === "regular" && <RegularForm item={editor.item} staff={data.staff} close={close} />}{editor?.kind === "extra" && <ExtraForm item={editor.item} staff={data.staff} close={close} />}{editor?.kind === "block" && <BlockForm item={editor.item} staff={data.staff} close={close} />}
    </Dialog>
  </div>;
}
