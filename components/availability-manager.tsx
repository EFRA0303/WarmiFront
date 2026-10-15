"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, CloseIcon, EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { deleteStaffBlock, saveExtraSchedule, saveRegularSchedule, saveStaffBlock, saveStaffWeek } from "@/app/dashboard/personal/disponibilidad/actions";
import type { AvailabilityData, AvailabilityStaff, ExtraSchedule, RegistrationState, RegularSchedule, StaffBlock, Weekday } from "@/lib/types";

type Tab = "regular" | "extras" | "blocks";
type Editor = { kind: "regular"; item?: RegularSchedule } | { kind: "week"; staffId?: number } | { kind: "extra"; item?: ExtraSchedule } | { kind: "block"; item?: StaffBlock } | null;
type ScheduleGroup = { days: Weekday[]; start: string; end: string; breakReason: string };
const initial: RegistrationState = {};
const visualIntervalStorageKey = "warmi:personal-availability-visual-interval";
const days: Array<{ value: Weekday; label: string }> = [
  { value: "LUNES", label: "Lunes" }, { value: "MARTES", label: "Martes" }, { value: "MIERCOLES", label: "Miércoles" },
  { value: "JUEVES", label: "Jueves" }, { value: "VIERNES", label: "Viernes" }, { value: "SABADO", label: "Sábado" }, { value: "DOMINGO", label: "Domingo" },
];
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

function scheduleGroups(schedules: RegularSchedule[], staffId: number): ScheduleGroup[] {
  const grouped = new Map<string, ScheduleGroup>();
  schedules.filter((item) => item.id_personal === staffId && item.estado).forEach((item) => {
    const start = shortTime(item.hora_inicio), end = shortTime(item.hora_fin), breakReason = item.motivo_pausa_anterior ?? "", key = `${start}-${end}-${breakReason}`;
    const group = grouped.get(key) ?? { days: [], start, end, breakReason };
    if (!group.days.includes(item.dia_semana)) group.days.push(item.dia_semana);
    grouped.set(key, group);
  });
  return [...grouped.values()].map((group) => ({ ...group, days: days.filter((day) => group.days.includes(day.value)).map((day) => day.value) }));
}

function timeMinutes(value: string) {
  const [hour, minute] = shortTime(value).split(":").map(Number);
  return hour * 60 + minute;
}

function minuteTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function staffGridIntervals(schedules: RegularSchedule[], staffId: number, intervalMinutes: number) {
  const active = schedules.filter((item) => item.id_personal === staffId && item.estado);
  if (!active.length) return [];
  const starts = active.map((item) => timeMinutes(item.hora_inicio));
  const ends = active.map((item) => timeMinutes(item.hora_fin));
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  const boundaries = new Set<number>([first, last, ...starts, ...ends]);
  for (let cursor = first + intervalMinutes; cursor < last; cursor += intervalMinutes) boundaries.add(cursor);
  const ordered = [...boundaries].sort((left, right) => left - right);
  return ordered.slice(0, -1).map((start, index) => ({ start, end: ordered[index + 1] }));
}

function WeeklyScheduleForm({ initialStaffId, staff, schedules, close }: { initialStaffId?: number; staff: AvailabilityStaff[]; schedules: RegularSchedule[]; close: () => void }) {
  const [state, action, pending] = useActionState(saveStaffWeek, initial);
  const [staffId, setStaffId] = useState(initialStaffId ?? 0);
  const [groups, setGroups] = useState<ScheduleGroup[]>(() => {
    const current = initialStaffId ? scheduleGroups(schedules, initialStaffId) : [];
    return current.length ? current : [{ days: [], start: "08:00", end: "18:00", breakReason: "" }];
  });
  const payload = groups.flatMap((group) => group.days.map((day) => ({ dia_semana: day, hora_inicio: group.start, hora_fin: group.end, motivo_pausa_anterior: group.breakReason || undefined })));
  const selectStaff = (id: number) => {
    setStaffId(id);
    const current = scheduleGroups(schedules, id);
    setGroups(current.length ? current : [{ days: [], start: "08:00", end: "18:00", breakReason: "" }]);
  };
  const updateGroup = (index: number, patch: Partial<ScheduleGroup>) => setGroups((current) => current.map((group, position) => position === index ? { ...group, ...patch } : group));
  const toggleDay = (index: number, day: Weekday) => setGroups((current) => current.map((group, position) => position === index ? { ...group, days: group.days.includes(day) ? group.days.filter((value) => value !== day) : [...group.days, day] } : group));
  return <><form action={action} className="availability-form availability-week-form"><input type="hidden" name="id_personal" value={staffId || ""} /><input type="hidden" name="horarios" value={JSON.stringify(payload)} /><label className="availability-week-staff"><span>Empleado *</span><select value={staffId || ""} onChange={(event) => selectStaff(Number(event.target.value))} required><option value="">Seleccionar empleado</option>{staff.filter((person) => person.estado === "ACTIVO").map((person) => <StaffOption key={person.id_personal} staff={person} />)}</select><ErrorText state={state} name="id_personal" /></label><div className="availability-week-heading"><div><strong>Grupos de días y horarios</strong><small>Agrupa los días que comparten la misma hora de entrada y salida.</small></div><button type="button" onClick={() => setGroups((current) => [...current, { days: [], start: "08:00", end: "18:00", breakReason: "" }])}><PlusIcon />Agregar grupo</button></div><div className="availability-week-groups">{groups.map((group, index) => <article className="availability-week-group" key={index}><header><strong>Horario {index + 1}</strong>{groups.length > 1 && <button type="button" onClick={() => setGroups((current) => current.filter((_, position) => position !== index))} aria-label={`Eliminar horario ${index + 1}`}><TrashIcon /></button>}</header><div className="availability-week-days">{days.map((day) => <label className={group.days.includes(day.value) ? "active" : ""} key={day.value}><input type="checkbox" checked={group.days.includes(day.value)} onChange={() => toggleDay(index, day.value)} /><span>{day.label.slice(0, 3)}</span></label>)}</div><div className="availability-week-times"><label><span>Desde</span><input type="time" value={group.start} onChange={(event) => updateGroup(index, { start: event.target.value })} /></label><i>—</i><label><span>Hasta</span><input type="time" value={group.end} onChange={(event) => updateGroup(index, { end: event.target.value })} /></label></div><label className="availability-week-break"><span>Motivo de la pausa anterior (opcional)</span><input value={group.breakReason} maxLength={120} placeholder="Ej. Almuerzo" onChange={(event) => updateGroup(index, { breakReason: event.target.value })} /></label>{!group.days.length && <small className="availability-week-warning">Selecciona al menos un día para este horario.</small>}</article>)}</div><ErrorText state={state} name="horarios" /><footer><button type="button" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending || !staffId}>{pending ? "Guardando..." : "Guardar semana laboral"}</button></footer></form><Result state={state} close={close} /></>;
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
function DeleteBlockButton({ block, staffName }: { block: StaffBlock; staffName: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteStaffBlock.bind(null, block.id_bloqueo), initial);
  return <><form action={action} className="availability-delete-form" onSubmit={(event) => { if (!window.confirm(`¿Eliminar definitivamente el bloqueo de ${staffName}?\n\nEl periodo volverá a estar disponible para reservas.`)) event.preventDefault(); }}><button type="submit" className="availability-delete" disabled={pending} title="Eliminar bloqueo" aria-label={`Eliminar bloqueo de ${staffName}`}><TrashIcon /></button></form>{state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={() => router.refresh()} />}</>;
}

type WeekCellState = "available" | "pause" | "unavailable" | "off";

function InteractiveWeekCard({ person, schedules, intervalMinutes, canEdit, editWeek }: { person: AvailabilityStaff; schedules: RegularSchedule[]; intervalMinutes: number; canEdit: boolean; editWeek: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveStaffWeek, initial);
  const [overrides, setOverrides] = useState<Record<string, WeekCellState>>({});
  const active = schedules.filter((item) => item.id_personal === person.id_personal && item.estado);
  const intervals = staffGridIntervals(schedules, person.id_personal, intervalMinutes);
  const rows = intervals.length ? intervals : [{ start: 480, end: 480 + intervalMinutes }];
  const keyFor = (day: Weekday, start: number) => `${day}-${start}`;
  const rangesFor = (day: Weekday) => active.filter((item) => item.dia_semana === day);
  const baseState = (day: Weekday, interval: { start: number; end: number }): WeekCellState => {
    const ranges = rangesFor(day);
    if (!ranges.length) return "off";
    if (ranges.some((range) => timeMinutes(range.hora_inicio) <= interval.start && timeMinutes(range.hora_fin) >= interval.end)) return "available";
    const previous = ranges.some((range) => timeMinutes(range.hora_fin) <= interval.start);
    const next = ranges.filter((range) => timeMinutes(range.hora_inicio) >= interval.end).sort((left, right) => timeMinutes(left.hora_inicio) - timeMinutes(right.hora_inicio))[0];
    return previous && next?.motivo_pausa_anterior?.trim() ? "pause" : "unavailable";
  };
  const cellState = (day: Weekday, interval: { start: number; end: number }) => overrides[keyFor(day, interval.start)] ?? baseState(day, interval);
  const cycleCell = (day: Weekday, interval: { start: number; end: number }) => {
    if (!canEdit) return;
    const current = cellState(day, interval);
    const next: WeekCellState = current === "available" ? "pause" : current === "pause" ? "unavailable" : "available";
    setOverrides((values) => ({ ...values, [keyFor(day, interval.start)]: next }));
  };
  const payload = days.flatMap((day) => {
    const result: Array<{ dia_semana: Weekday; hora_inicio: string; hora_fin: string; motivo_pausa_anterior?: string }> = [];
    let start: number | null = null;
    let reason: string | undefined;
    rows.forEach((interval, index) => {
      const current = cellState(day.value, interval);
      if (current === "available" && start === null) {
        start = interval.start;
        reason = index > 0 && cellState(day.value, rows[index - 1]) === "pause" ? "Hora libre" : undefined;
      }
      const nextAvailable = index < rows.length - 1 && cellState(day.value, rows[index + 1]) === "available";
      if (start !== null && (!nextAvailable || current !== "available")) {
        const end = current === "available" ? interval.end : interval.start;
        if (end > start) result.push({ dia_semana: day.value, hora_inicio: minuteTime(start), hora_fin: minuteTime(end), ...(reason ? { motivo_pausa_anterior: reason } : {}) });
        start = null;
        reason = undefined;
      }
    });
    return result;
  });
  const dirty = Object.keys(overrides).length > 0;
  return <><form action={action} className="availability-person-week-card"><input type="hidden" name="id_personal" value={person.id_personal} /><input type="hidden" name="horarios" value={JSON.stringify(payload)} /><div className="availability-person-week-grid" style={{ "--week-rows": rows.length } as React.CSSProperties}><div className="availability-week-corner">Especialista</div>{days.map((day) => <div className="availability-week-day" key={day.value}>{day.label}</div>)}<div className="availability-week-profile"><StaffCell staff={person} /><BooleanStatus active={Boolean(intervals.length)} inactive="Sin horario" /><button type="button" className="availability-edit" onClick={editWeek}><EditIcon />Editar semana</button>{dirty && <button type="submit" className="directory-primary availability-week-save" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>}</div>{rows.flatMap((interval) => days.map((day) => { const current = cellState(day.value, interval); const label = `${minuteTime(interval.start)}–${minuteTime(interval.end)}`; return <button type="button" className={`availability-week-slot ${current}`} key={`${day.value}-${interval.start}`} onClick={() => cycleCell(day.value, interval)} disabled={!canEdit || pending} title={canEdit ? "Presiona para cambiar: disponible, hora libre o no disponible" : undefined}><strong>{current === "available" ? label : current === "pause" ? "Hora libre" : current === "unavailable" ? "No disponible" : "—"}</strong>{current !== "available" && <small>{current === "off" ? "No trabaja" : label}</small>}</button>; }))}</div></form>{state.resultId && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={() => { setOverrides({}); router.refresh(); }} />}</>;
}

export function AvailabilityManager({ data, initialTab = "regular", canCreate, canEdit }: { data: AvailabilityData; initialTab?: Tab; canCreate: boolean; canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [staffId, setStaffId] = useState(0);
  const [gridInterval, setGridInterval] = useState(120);
  const [editor, setEditor] = useState<Editor>(null);
  useEffect(() => {
    const savedInterval = Number(window.localStorage.getItem(visualIntervalStorageKey));
    if ([30, 60, 120].includes(savedInterval)) queueMicrotask(() => setGridInterval(savedInterval));
  }, []);
  const staffMap = useMemo(() => new Map(data.staff.map((staff) => [staff.id_personal, staff])), [data.staff]);
  const regularStaff = data.staff.filter((item) => item.estado === "ACTIVO" && (!staffId || item.id_personal === staffId));
  const extras = data.extras.filter((item) => !staffId || item.id_personal === staffId);
  const blocks = data.blocks.filter((item) => !staffId || item.id_personal === staffId);
  const close = () => setEditor(null);
  const openNew = () => setEditor(tab === "regular" ? { kind: "week", staffId: staffId || undefined } : { kind: tab === "extras" ? "extra" : "block" });
  return <div className="availability-manager">
    <div className="availability-summary"><article><span>Especialistas</span><strong>{data.staff.filter((item) => item.estado === "ACTIVO").length}</strong><small>disponibles para agenda</small></article><article><span>Horarios habituales</span><strong>{new Set(data.schedules.filter((item) => item.estado).map((item) => item.id_personal)).size}</strong><small>especialistas configurados</small></article><article><span>Próximas excepciones</span><strong>{data.extras.filter((item) => item.estado === "AUTORIZADO").length}</strong><small>horarios autorizados</small></article><article><span>Bloqueos activos</span><strong>{data.blocks.filter((item) => item.estado).length}</strong><small>periodos restringidos</small></article></div>
    <div className="availability-tabs"><button className={tab === "regular" ? "active" : ""} onClick={() => setTab("regular")}>Horarios habituales</button><button className={tab === "extras" ? "active" : ""} onClick={() => setTab("extras")}>Horarios extraordinarios</button><button className={tab === "blocks" ? "active" : ""} onClick={() => setTab("blocks")}>Bloqueos</button></div>
    <div className="availability-toolbar"><div className="availability-toolbar__filters"><label><span>Especialista</span><select value={staffId} onChange={(event) => setStaffId(Number(event.target.value))}><option value={0}>Todos los especialistas</option>{data.staff.map((staff) => <StaffOption staff={staff} key={staff.id_personal} />)}</select></label>{tab === "regular" && <label className="availability-interval-filter"><span>Intervalo visual</span><select value={gridInterval} onChange={(event) => { const value = Number(event.target.value); setGridInterval(value); window.localStorage.setItem(visualIntervalStorageKey, String(value)); }}><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={120}>2 horas</option></select></label>}</div>{(tab === "regular" ? canEdit : canCreate) && <button type="button" className="directory-primary" onClick={openNew}><PlusIcon />{tab === "regular" ? "Configurar semana" : tab === "extras" ? "Horario extraordinario" : "Nuevo bloqueo"}</button>}</div>
    {tab === "regular" ? <><div className="availability-week-legend"><span><i className="available" />Disponible</span><span><i className="pause" />Hora libre</span><span><i className="unavailable" />No disponible</span><small>Presiona un recuadro para cambiar su estado y luego guarda los cambios.</small></div><div className="availability-person-week-list">{regularStaff.map((person) => <InteractiveWeekCard key={`${person.id_personal}-${gridInterval}`} person={person} schedules={data.schedules} intervalMinutes={gridInterval} canEdit={canEdit} editWeek={() => setEditor({ kind: "week", staffId: person.id_personal })} />)}{!regularStaff.length && <div className="availability-empty">No existen especialistas para este filtro.</div>}</div></> : <div className="availability-table"><table><thead>{tab === "extras" ? <tr><th>Especialista</th><th>Fecha</th><th>Horario</th><th>Motivo</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr> : <tr><th>Especialista</th><th>Periodo bloqueado</th><th>Motivo</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr>}</thead><tbody>
      {tab === "extras" && extras.map((item) => <tr key={item.id_horario_extra}><td><StaffCell staff={staffMap.get(item.id_personal)} /></td><td><strong>{dateLabel(item.fecha)}</strong></td><td>{shortTime(item.hora_inicio)} – {shortTime(item.hora_fin)}</td><td>{item.motivo || "Sin motivo"}</td><td><BooleanStatus active={item.estado === "AUTORIZADO"} inactive="Cancelado" /></td>{canEdit && <td><button className="availability-edit" onClick={() => setEditor({ kind: "extra", item })}><EditIcon /></button></td>}</tr>)}
      {tab === "blocks" && blocks.map((item) => { const staff = staffMap.get(item.id_personal); const staffName = staff ? fullName(staff) : "este especialista"; return <tr key={item.id_bloqueo}><td><StaffCell staff={staff} /></td><td><strong>{dateTimeLabel(item.fecha_hora_inicio)}</strong><small>hasta {dateTimeLabel(item.fecha_hora_fin)}</small></td><td>{item.motivo || "Sin motivo"}</td><td><BooleanStatus active={item.estado} inactive="Cancelado" /></td>{canEdit && <td><div className="availability-row-actions"><button type="button" className="availability-edit" onClick={() => setEditor({ kind: "block", item })} title="Editar bloqueo" aria-label={`Editar bloqueo de ${staffName}`}><EditIcon /></button><DeleteBlockButton block={item} staffName={staffName} /></div></td>}</tr>; })}
    </tbody></table>{((tab === "extras" && !extras.length) || (tab === "blocks" && !blocks.length)) && <div className="availability-empty">No existen registros para este filtro.</div>}</div>}
    <Dialog open={editor !== null} close={close} title={editor?.kind === "week" ? "Configurar semana laboral" : editor?.kind === "regular" ? `${editor.item ? "Editar" : "Nuevo"} horario habitual` : editor?.kind === "extra" ? `${editor.item ? "Editar" : "Nuevo"} horario extraordinario` : editor?.kind === "block" ? `${editor.item ? "Editar" : "Nuevo"} bloqueo` : "Disponibilidad"} description={editor?.kind === "week" ? "Define los días y horarios habituales de un empleado específico." : editor?.kind === "regular" ? "Define un tramo semanal de trabajo." : editor?.kind === "extra" ? "Autoriza atención fuera del horario habitual para una fecha." : "Impide nuevas reservas durante una ausencia, descanso o vacación."}>
      {editor?.kind === "week" && <WeeklyScheduleForm initialStaffId={editor.staffId} staff={data.staff} schedules={data.schedules} close={close} />}{editor?.kind === "regular" && <RegularForm item={editor.item} staff={data.staff} close={close} />}{editor?.kind === "extra" && <ExtraForm item={editor.item} staff={data.staff} close={close} />}{editor?.kind === "block" && <BlockForm item={editor.item} staff={data.staff} close={close} />}
    </Dialog>
  </div>;
}
