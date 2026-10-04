"use client";

import { useEffect, useRef, useState, useTransition, type FocusEvent, type FormEvent } from "react";
import { checkRegistrationAvailability } from "@/app/dashboard/registration-actions";
import type { PersonSummary, RegistrationState } from "@/lib/types";

function errorFor(state: RegistrationState, name: string) {
  return state.fieldErrors?.[name];
}

export function PersonFields({ state, person }: { state: RegistrationState; person?: PersonSummary }) {
  const [availability, setAvailability] = useState<Record<string, { available?: boolean; message: string }>>({});
  const [checking, startChecking] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of Object.values(activeTimers)) clearTimeout(timer);
    };
  }, []);

  function normalizeName(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = event.currentTarget.value
      .trim()
      .toLocaleLowerCase("es")
      .replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase("es")}`);
  }

  function formatNameWhileTyping(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const position = input.selectionStart;
    input.value = input.value
      .toLocaleLowerCase("es")
      .replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase("es")}`);
    if (position !== null) input.setSelectionRange(position, position);
  }

  function runUniqueCheck(field: "ci" | "telefono1", input: HTMLInputElement) {
    if (person) return;
    const value = input.value.trim();
    input.setCustomValidity("");
    if (!value) {
      setAvailability((current) => ({ ...current, [field]: { available: true, message: "" } }));
      return;
    }
    setAvailability((current) => ({ ...current, [field]: { message: "Verificando disponibilidad..." } }));
    startChecking(async () => {
      const result = await checkRegistrationAvailability(field, value);
      if (input.value.trim() !== value) return;
      const message = result.message;
      input.setCustomValidity(result.ok && result.available === false ? message : "");
      setAvailability((current) => ({ ...current, [field]: { available: result.available, message } }));
    });
  }

  function scheduleUniqueCheck(field: "ci" | "telefono1", input: HTMLInputElement) {
    input.setCustomValidity("");
    clearTimeout(timers.current[field]);
    setAvailability((current) => ({ ...current, [field]: { message: "" } }));
    if (!input.value.trim() || person) return;
    timers.current[field] = setTimeout(() => runUniqueCheck(field, input), 550);
  }

  function checkUniqueOnBlur(field: "ci" | "telefono1", event: FocusEvent<HTMLInputElement>) {
    clearTimeout(timers.current[field]);
    runUniqueCheck(field, event.currentTarget);
  }

  function feedback(field: string) {
    const item = availability[field];
    if (!item?.message) return null;
    const className = item.available === true
      ? "availability availability--available"
      : item.available === false
        ? "availability availability--taken"
        : "availability";
    return <small className={className}>{item.message}</small>;
  }

  return (
    <div className="registration-grid">
      <label className="registration-field">
        <span>Nombre <b>*</b></span>
        <input name="nombre" maxLength={100} required defaultValue={person?.nombre} onInput={formatNameWhileTyping} onBlur={normalizeName} aria-invalid={Boolean(errorFor(state, "nombre"))} />
        {errorFor(state, "nombre") && <small>{errorFor(state, "nombre")}</small>}
      </label>
      <label className="registration-field">
        <span>Apellido paterno <b>*</b></span>
        <input name="ap_paterno" maxLength={100} required defaultValue={person?.ap_paterno} onInput={formatNameWhileTyping} onBlur={normalizeName} aria-invalid={Boolean(errorFor(state, "ap_paterno"))} />
        {errorFor(state, "ap_paterno") && <small>{errorFor(state, "ap_paterno")}</small>}
      </label>
      <label className="registration-field">
        <span>Apellido materno</span>
        <input name="ap_materno" maxLength={100} defaultValue={person?.ap_materno ?? ""} onInput={formatNameWhileTyping} onBlur={normalizeName} />
      </label>
      <label className="registration-field">
        <span>Documento de identidad</span>
        <input name="ci" maxLength={20} defaultValue={person?.ci ?? ""} onInput={(event) => scheduleUniqueCheck("ci", event.currentTarget)} onBlur={(event) => checkUniqueOnBlur("ci", event)} />
        {checking && !availability.ci?.message ? null : feedback("ci")}
      </label>
      <label className="registration-field">
        <span>Fecha de nacimiento</span>
        <input name="fecha_nac" type="date" defaultValue={person?.fecha_nac?.slice(0, 10) ?? ""} />
      </label>
      <label className="registration-field">
        <span>Género <b>*</b></span>
        <select name="genero" defaultValue={person?.genero ?? ""} required aria-invalid={Boolean(errorFor(state, "genero"))}>
          <option value="" disabled>Seleccionar</option>
          <option value="FEMENINO">Femenino</option>
          <option value="MASCULINO">Masculino</option>
        </select>
        {errorFor(state, "genero") && <small>{errorFor(state, "genero")}</small>}
      </label>
      <label className="registration-field">
        <span>Teléfono principal <b>*</b></span>
        <input name="telefono1" type="tel" maxLength={30} required defaultValue={person?.telefono1} onInput={(event) => scheduleUniqueCheck("telefono1", event.currentTarget)} onBlur={(event) => checkUniqueOnBlur("telefono1", event)} aria-invalid={Boolean(errorFor(state, "telefono1"))} />
        {errorFor(state, "telefono1") && <small>{errorFor(state, "telefono1")}</small>}
        {feedback("telefono1")}
      </label>
      <label className="registration-field">
        <span>Teléfono alternativo</span>
        <input name="telefono2" type="tel" maxLength={30} defaultValue={person?.telefono2 ?? ""} />
      </label>
      <label className="registration-field registration-field--wide">
        <span>Dirección</span>
        <input name="direccion" maxLength={255} defaultValue={person?.direccion ?? ""} />
      </label>
    </div>
  );
}
