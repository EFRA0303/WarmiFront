"use client";

import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { countryFlag } from "@/lib/phone";
import styles from "./international-phone-input.module.css";

type PhoneCallback = (
  value: string,
  input: HTMLInputElement,
  valid: boolean,
) => void;

type Props = {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  error?: string;
  className?: string;
  onValueChange?: PhoneCallback;
  onPhoneBlur?: PhoneCallback;
  after?: ReactNode;
};

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });

function initialPhone(value?: string | null) {
  const raw = value?.trim() ?? "";
  const parsed = raw ? parsePhoneNumberFromString(raw, "BO") : undefined;
  if (parsed?.isValid())
    return {
      country: (parsed.country ?? "BO") as CountryCode,
      local: parsed.nationalNumber,
    };
  return {
    country: "BO" as CountryCode,
    local: raw.replace(/\D/g, "").replace(/^591/, ""),
  };
}

function evaluate(local: string, country: CountryCode) {
  if (!local) return { value: "", valid: false };
  const parsed = parsePhoneNumberFromString(local, country);
  return parsed?.isValid()
    ? { value: parsed.number, valid: true }
    : { value: "", valid: false };
}

export function InternationalPhoneInput({
  name,
  label,
  defaultValue,
  required,
  error,
  className,
  onValueChange,
  onPhoneBlur,
  after,
}: Props) {
  const initial = useMemo(() => initialPhone(defaultValue), [defaultValue]);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [local, setLocal] = useState(initial.local);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const result = evaluate(local, country);
  const invalid = Boolean(error) || (touched && Boolean(local) && !result.valid);

  const countries = useMemo(() => {
    const items = getCountries().map((code) => ({
      code,
      name: regionNames.of(code) ?? code,
      callingCode: getCountryCallingCode(code),
    }));
    return items.sort((a, b) => {
      if (a.code === "BO") return -1;
      if (b.code === "BO") return 1;
      return a.name.localeCompare(b.name, "es");
    });
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    if (!term) return countries;
    return countries.filter(({ code, name, callingCode }) =>
      `${code} ${name} +${callingCode}`.toLocaleLowerCase("es").includes(term),
    );
  }, [countries, query]);

  function updateValidity(
    nextLocal: string,
    nextCountry: CountryCode,
    input: HTMLInputElement,
    callback?: PhoneCallback,
  ) {
    const next = evaluate(nextLocal, nextCountry);
    input.dataset.e164 = next.value;
    input.setCustomValidity(
      nextLocal && !next.valid
        ? `Ingresa un número válido para ${regionNames.of(nextCountry) ?? nextCountry}.`
        : "",
    );
    callback?.(next.value, input, next.valid);
  }

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div ref={rootRef} className={`${styles.field}${className ? ` ${className}` : ""}`}>
      <span className={styles.label}>
        {label} {required && <b>*</b>}
      </span>
      <input type="hidden" name={name} value={result.value} />
      <div className={`${styles.control}${invalid ? ` ${styles.controlInvalid}` : ""}`}>
        <button
          className={styles.countryButton}
          type="button"
          role="combobox"
          aria-label="Seleccionar país"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen((current) => !current);
            setQuery("");
          }}
        >
          <span>{countryFlag(country)}</span>
          <strong>+{getCountryCallingCode(country)}</strong>
          <ChevronRightIcon />
        </button>
        <input
          ref={inputRef}
          className={styles.localInput}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          maxLength={15}
          value={local}
          placeholder="Número local"
          aria-invalid={invalid}
          onChange={(event) => {
            const nextLocal = event.target.value.replace(/\D/g, "");
            setLocal(nextLocal);
            setTouched(false);
            updateValidity(nextLocal, country, event.currentTarget, onValueChange);
          }}
          onBlur={(event) => {
            setTouched(true);
            updateValidity(local, country, event.currentTarget, onPhoneBlur);
          }}
          onInvalid={(event) => setTouched(Boolean(event.currentTarget.value))}
        />
      </div>

      {open && (
        <div className={styles.panel}>
          <label className={styles.search}>
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar país o código..."
            />
          </label>
          <div className={styles.options} id={listId} role="listbox">
            {filtered.map((item) => (
              <button
                className={styles.option}
                key={item.code}
                type="button"
                role="option"
                aria-selected={item.code === country}
                onClick={() => {
                  setCountry(item.code);
                  setOpen(false);
                  setTouched(Boolean(local));
                  if (inputRef.current) {
                    updateValidity(local, item.code, inputRef.current, onValueChange);
                    inputRef.current.focus();
                  }
                }}
              >
                <span className={styles.flag}>{countryFlag(item.code)}</span>
                <span className={styles.countryName}>{item.name}</span>
                <span className={styles.callingCode}>+{item.callingCode}</span>
                {item.code === country && <CheckIcon />}
              </button>
            ))}
            {!filtered.length && <p className={styles.empty}>No encontramos ese país.</p>}
          </div>
        </div>
      )}

      {!error && touched && local && !result.valid && (
        <small className={styles.error}>
          Ingresa un número válido para {regionNames.of(country) ?? country}.
        </small>
      )}
      {error && <small className={styles.error}>{error}</small>}
      {!error && !invalid && (
        <small className={styles.hint}>Se guardará como +{getCountryCallingCode(country)}…</small>
      )}
      {after}
    </div>
  );
}
