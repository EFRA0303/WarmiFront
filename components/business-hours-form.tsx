"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, CheckIcon, ClockIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { updateBusinessHours } from "@/app/dashboard/horarios-atencion/actions";
import type { BusinessHours, RegistrationState, Weekday } from "@/lib/types";

const initialState: RegistrationState = {};
const days: Array<{ value: Weekday; label: string }> = [
  { value: "LUNES", label: "Lunes" }, { value: "MARTES", label: "Martes" },
  { value: "MIERCOLES", label: "Miércoles" }, { value: "JUEVES", label: "Jueves" },
  { value: "VIERNES", label: "Viernes" }, { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
];
type TimeRange = { hora_inicio: string; hora_fin: string };
type Exception = BusinessHours["excepciones"][number];
type Holiday = BusinessHours["feriados"][number];
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function boliviaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function holidayDateParts(value: string | null) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : boliviaToday();
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
}
function updateHolidayDate(value: string | null, field: "year" | "month" | "day", nextValue: number) {
  const parts = { ...holidayDateParts(value), [field]: nextValue };
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  parts.day = Math.min(Math.max(parts.day, 1), lastDay);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function daysInMonth(month: number, year: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function holidayCalendarValue(holiday: Holiday) {
  if (holiday.tipo === "DINAMICO") return holiday.fecha ?? boliviaToday();
  const year = Number(boliviaToday().slice(0, 4));
  const month = holiday.mes ?? 1;
  const day = Math.min(holiday.dia ?? 1, daysInMonth(month, year));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function holidayWeekday(holiday: Holiday) {
  const currentYear = Number(boliviaToday().slice(0, 4));
  const date = holiday.tipo === "DINAMICO"
    ? holidayDateParts(holiday.fecha)
    : { year: currentYear, month: holiday.mes ?? 1, day: holiday.dia ?? 1 };
  const lastDay = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
  const safeDate = new Date(Date.UTC(date.year, date.month - 1, Math.min(Math.max(date.day, 1), lastDay)));
  const weekday = new Intl.DateTimeFormat("es-BO", { weekday: "short", timeZone: "UTC" }).format(safeDate).replace(".", "");
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}
function nextExceptionDate(exceptions: Exception[]) {
  const date = new Date(`${boliviaToday()}T12:00:00Z`);
  for (let index = 0; index < 370; index += 1) {
    const value = date.toISOString().slice(0, 10);
    if (!exceptions.some((item) => item.fecha === value)) return value;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return boliviaToday();
}

export function BusinessHoursForm({ schedule }: { schedule: BusinessHours }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateBusinessHours, initialState);
  const [interval, setInterval] = useState(schedule.intervalo_minutos);
  const [weekly, setWeekly] = useState<Record<Weekday, TimeRange[]>>(() =>
    Object.fromEntries(days.map((day) => [day.value, schedule.horarios_semanales.filter((item) => item.dia_semana === day.value).map(({ hora_inicio, hora_fin }) => ({ hora_inicio, hora_fin }))])) as Record<Weekday, TimeRange[]>,
  );
  const [exceptions, setExceptions] = useState<Exception[]>(schedule.excepciones);
  const [holidays, setHolidays] = useState<Holiday[]>(schedule.feriados);
  const [holidayDayDrafts, setHolidayDayDrafts] = useState<Record<number, string>>({});
  const payload = useMemo(() => ({
    intervalo_minutos: interval,
    horarios_semanales: days.flatMap((day) => weekly[day.value].map((range) => ({ dia_semana: day.value, ...range }))),
    excepciones: exceptions.map((item) => ({ fecha: item.fecha, tipo: item.tipo, motivo: item.motivo || undefined, tramos: item.tipo === "CERRADO" ? [] : item.tramos.map(({ hora_inicio, hora_fin }) => ({ hora_inicio, hora_fin })) })),
    feriados: holidays.map((item) => ({ tipo: item.tipo, nombre: item.nombre, ...(item.tipo === "FIJO" ? { mes: item.mes, dia: item.dia } : { fecha: item.fecha }) })),
  }), [exceptions, holidays, interval, weekly]);

  function setRanges(day: Weekday, ranges: TimeRange[]) { setWeekly((current) => ({ ...current, [day]: ranges })); }
  function updateRange(day: Weekday, index: number, field: keyof TimeRange, value: string) {
    setRanges(day, weekly[day].map((range, position) => position === index ? { ...range, [field]: value } : range));
  }
  function copyMonday() {
    const source = weekly.LUNES;
    setWeekly((current) => ({ ...current, MARTES: source.map((range) => ({ ...range })), MIERCOLES: source.map((range) => ({ ...range })), JUEVES: source.map((range) => ({ ...range })), VIERNES: source.map((range) => ({ ...range })) }));
  }
  function updateException(index: number, patch: Partial<Exception>) {
    setExceptions((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  }
  function updateHoliday(index: number, patch: Partial<Holiday>) {
    setHolidays((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  }
  function editHolidayDay(index: number, holiday: Holiday, rawValue: string) {
    if (rawValue === "") {
      setHolidayDayDrafts((current) => ({ ...current, [index]: "" }));
      return;
    }
    if (!/^\d{1,2}$/.test(rawValue)) return;
    const day = Number(rawValue);
    const date = holidayDateParts(holiday.fecha);
    const month = holiday.tipo === "FIJO" ? holiday.mes ?? 1 : date.month;
    const year = holiday.tipo === "FIJO" ? Number(boliviaToday().slice(0, 4)) : date.year;
    if (day < 1 || day > daysInMonth(month, year)) return;
    setHolidayDayDrafts((current) => ({ ...current, [index]: rawValue }));
    if (holiday.tipo === "FIJO") updateHoliday(index, { dia: day });
    else updateHoliday(index, { fecha: updateHolidayDate(holiday.fecha, "day", day) });
  }
  function finishHolidayDay(index: number) {
    setHolidayDayDrafts((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }
  function selectHolidayDate(index: number, holiday: Holiday, value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const selected = holidayDateParts(value);
    if (holiday.tipo === "FIJO") updateHoliday(index, { dia: selected.day, mes: selected.month });
    else updateHoliday(index, { fecha: value });
    finishHolidayDay(index);
  }

  return <>
    <form action={action} className="hours-card">
      <input type="hidden" name="configuracion" value={JSON.stringify(payload)} />
      <header className="hours-heading"><span className="hours-heading__icon"><ClockIcon /></span><div><span className="page-eyebrow">CONFIGURACIÓN DE AGENDA</span><h1>Horarios de atención</h1><p>Define la apertura general del spa y los días con atención excepcional.</p></div></header>
      <div className="hours-toolbar"><label><span>Intervalo de la agenda</span><select value={interval} onChange={(event) => setInterval(Number(event.target.value))}>{[10, 15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value} minutos</option>)}</select></label><div><b>¿Cómo funciona?</b><span>Este horario establece cuándo abre y cierra el spa. Las pausas se configuran por empleado.</span></div></div>

      <section className="hours-content">
        <div className="hours-section-heading"><div><span className="page-eyebrow">01 · SEMANA HABITUAL</span><h2>Horario semanal</h2><p>Activa cada día y agrega uno o más tramos de atención general.</p></div><button type="button" className="hours-copy" onClick={copyMonday}>Copiar lunes a viernes</button></div>
        <div className="hours-week">{days.map((day) => {
          const ranges = weekly[day.value], open = ranges.length > 0;
          return <article className={`hours-day${open ? " open" : ""}`} key={day.value}>
            <header><div><strong>{day.label}</strong><small>{open ? `${ranges.length} ${ranges.length === 1 ? "tramo" : "tramos"}` : "Sin atención"}</small></div><label className="hours-switch"><input type="checkbox" checked={open} onChange={() => setRanges(day.value, open ? [] : [{ hora_inicio: "08:00", hora_fin: day.value === "SABADO" ? "12:00" : "18:00" }])} /><span>{open && <CheckIcon />}</span></label></header>
            {open && <div className="hours-day__ranges">{ranges.map((range, index) => <div key={`${day.value}-${index}`}><div className="hours-range"><label><span>Desde</span><input type="time" value={range.hora_inicio} onChange={(event) => updateRange(day.value, index, "hora_inicio", event.target.value)} /></label><i>—</i><label><span>Hasta</span><input type="time" value={range.hora_fin} onChange={(event) => updateRange(day.value, index, "hora_fin", event.target.value)} /></label><button type="button" title="Eliminar tramo" onClick={() => setRanges(day.value, ranges.filter((_, position) => position !== index))}><TrashIcon /></button></div></div>)}<button type="button" className="hours-add-range" onClick={() => setRanges(day.value, [...ranges, { hora_inicio: ranges.at(-1)?.hora_fin ?? "14:00", hora_fin: "18:00" }])}><PlusIcon />Agregar tramo</button></div>}
          </article>;
        })}</div>
      </section>

      <section className="hours-content hours-content--exceptions">
        <div className="hours-section-heading"><div><span className="page-eyebrow">02 · CAMBIOS POR FECHA</span><h2>Horarios especiales y cierres puntuales</h2><p>Habilita un domingo, modifica una jornada o cierra una fecha específica.</p></div><button type="button" className="directory-primary" onClick={() => setExceptions((current) => [...current, { fecha: nextExceptionDate(current), tipo: "CERRADO", motivo: "", tramos: [] }])}><PlusIcon />Nueva excepción</button></div>
        {exceptions.length ? <div className="hours-exceptions">{exceptions.map((item, index) => <article className={`hours-exception hours-exception--${item.tipo.toLowerCase()}`} key={`${item.fecha}-${index}`}>
          <div className="hours-exception__main"><label><span>Fecha</span><input type="date" value={item.fecha} onChange={(event) => updateException(index, { fecha: event.target.value })} /></label><label><span>Tipo</span><select value={item.tipo} onChange={(event) => { const tipo = event.target.value as Exception["tipo"]; updateException(index, { tipo, tramos: tipo === "HORARIO_ESPECIAL" ? (item.tramos.length ? item.tramos : [{ hora_inicio: "08:00", hora_fin: "12:00" }]) : [] }); }}><option value="CERRADO">Cierre puntual</option><option value="HORARIO_ESPECIAL">Atención especial</option></select></label><label className="hours-exception__reason"><span>Motivo</span><input value={item.motivo ?? ""} maxLength={180} placeholder="Ej. Mantenimiento" onChange={(event) => updateException(index, { motivo: event.target.value })} /></label><button type="button" title="Eliminar excepción" onClick={() => setExceptions((current) => current.filter((_, position) => position !== index))}><TrashIcon /></button></div>
          {item.tipo === "HORARIO_ESPECIAL" && <div className="hours-exception__ranges">{item.tramos.map((range, rangeIndex) => <div className="hours-range" key={rangeIndex}><label><span>Desde</span><input type="time" value={range.hora_inicio} onChange={(event) => updateException(index, { tramos: item.tramos.map((current, position) => position === rangeIndex ? { ...current, hora_inicio: event.target.value } : current) })} /></label><i>—</i><label><span>Hasta</span><input type="time" value={range.hora_fin} onChange={(event) => updateException(index, { tramos: item.tramos.map((current, position) => position === rangeIndex ? { ...current, hora_fin: event.target.value } : current) })} /></label><button type="button" title="Eliminar tramo" onClick={() => updateException(index, { tramos: item.tramos.filter((_, position) => position !== rangeIndex) })}><TrashIcon /></button></div>)}<button type="button" className="hours-add-range" onClick={() => updateException(index, { tramos: [...item.tramos, { hora_inicio: item.tramos.at(-1)?.hora_fin ?? "14:00", hora_fin: "18:00" }] })}><PlusIcon />Agregar tramo especial</button></div>}
        </article>)}</div> : <div className="hours-empty"><ClockIcon /><h3>No hay excepciones registradas</h3><p>El horario semanal se aplicará hasta que agregues un feriado o una apertura especial.</p></div>}
      </section>
      <section className="hours-content hours-content--holidays">
        <div className="hours-section-heading"><div><span className="page-eyebrow">03 · CALENDARIO ANUAL</span><h2>Feriados por mes</h2><p>Los fijos se repiten cada año; los especiales se registran para el año en que correspondan.</p></div><div className="hours-holiday-actions"><button type="button" className="hours-copy" onClick={() => setHolidays((current) => [...current, { tipo: "FIJO", nombre: "", mes: new Date().getMonth() + 1, dia: 1, fecha: null }])}><PlusIcon />Feriado fijo</button><button type="button" className="directory-primary" onClick={() => setHolidays((current) => [...current, { tipo: "DINAMICO", nombre: "", mes: null, dia: null, fecha: boliviaToday() }])}><PlusIcon />Feriado especial</button></div></div>
        {holidays.length ? <div className="hours-holiday-groups">{([
          { type: "FIJO", title: "Feriados fijos", description: "Se repiten cada año." },
          { type: "DINAMICO", title: "Feriados especiales", description: "Son fechas que pueden cambiar cada año." },
        ] as const).map((group) => {
          const groupItems = holidays.map((holiday, index) => ({ holiday, index })).filter(({ holiday }) => holiday.tipo === group.type);
          return <section className={`hours-holiday-group hours-holiday-group--${group.type.toLowerCase()}`} key={group.type}>
            <header className="hours-holiday-group__header"><div><span>{group.type === "FIJO" ? "CALENDARIO PERMANENTE" : "FECHAS VARIABLES"}</span><h3>{group.title}</h3><p>{group.description}</p></div><b>{groupItems.length}</b></header>
            {groupItems.length ? <div className="hours-holiday-months">{months.map((month, monthIndex) => {
              const items = groupItems.filter(({ holiday }) => holiday.tipo === "FIJO" ? holiday.mes === monthIndex + 1 : Number(holiday.fecha?.slice(5, 7)) === monthIndex + 1);
              if (!items.length) return null;
              return <article className="hours-holiday-month" key={`${group.type}-${month}`}><header><strong>{month}</strong><span>{items.length}</span></header><div>{items.map(({ holiday, index }) => {
                const date = holidayDateParts(holiday.fecha);
                const savedDay = holiday.tipo === "FIJO" ? holiday.dia ?? 1 : date.day;
                const dayValue = holidayDayDrafts[index] ?? String(savedDay);
                return <div className={`hours-holiday hours-holiday--${holiday.tipo.toLowerCase()}`} key={`${holiday.tipo}-${index}`}>
                  <label className="hours-holiday__name"><span>Nombre del feriado</span><input value={holiday.nombre} maxLength={150} placeholder="Ej. Navidad" onChange={(event) => updateHoliday(index, { nombre: event.target.value })} /></label>
                  <div className="hours-holiday__field"><span className="hours-holiday__day-label">Día <b>{holidayWeekday(holiday)}</b></span><div className="hours-holiday__day-control"><input type="text" inputMode="numeric" maxLength={2} pattern="[0-9]*" value={dayValue} aria-label="Día del feriado" onFocus={(event) => event.currentTarget.select()} onChange={(event) => editHolidayDay(index, holiday, event.target.value)} onBlur={() => finishHolidayDay(index)} /><label className="hours-holiday__calendar" title="Elegir fecha en el calendario"><CalendarIcon /><input className="hours-holiday__calendar-input" type="date" value={holidayCalendarValue(holiday)} aria-label="Elegir fecha en el calendario" onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => selectHolidayDate(index, holiday, event.target.value)} /></label></div></div>
                  <label><span>Mes</span><select value={holiday.tipo === "FIJO" ? holiday.mes ?? 1 : date.month} onChange={(event) => { const month = Number(event.target.value); finishHolidayDay(index); if (holiday.tipo === "FIJO") updateHoliday(index, { mes: month, dia: Math.min(holiday.dia ?? 1, daysInMonth(month, Number(boliviaToday().slice(0, 4)))) }); else updateHoliday(index, { fecha: updateHolidayDate(holiday.fecha, "month", month) }); }}>{months.map((name, value) => <option value={value + 1} key={name}>{name}</option>)}</select></label>
                  {holiday.tipo === "DINAMICO" && <label><span>Año</span><input type="number" min="2000" max="2100" value={date.year} onChange={(event) => updateHoliday(index, { fecha: updateHolidayDate(holiday.fecha, "year", Number(event.target.value)) })} /></label>}
                  <button type="button" title="Eliminar feriado" onClick={() => { setHolidays((current) => current.filter((_, position) => position !== index)); setHolidayDayDrafts({}); }}><TrashIcon /></button>
                </div>;
              })}</div></article>;
            })}</div> : <div className="hours-holiday-group__empty">Aún no agregaste feriados de este tipo.</div>}
          </section>;
        })}</div> : <div className="hours-empty"><ClockIcon /><h3>No hay feriados configurados</h3><p>Agrega fechas fijas o feriados que cambian según el año.</p></div>}
      </section>
      {state.fieldErrors?.form && <p className="hours-form-error">{state.fieldErrors.form}</p>}
      <footer className="hours-footer"><p>La disponibilidad individual y los bloqueos de cada profesional continuarán aplicándose dentro de estos horarios.</p><button type="submit" className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar configuración"}</button></footer>
    </form>
    <SubmissionResultDialog state={state} onSuccess={() => router.refresh()} />
  </>;
}
