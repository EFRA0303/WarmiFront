"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import type { CurrencyOption } from "@/lib/types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function CurrencyCombobox({
  currencies,
  defaultValue = "BOB",
}: {
  currencies: CurrencyOption[];
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = currencies.find((currency) => currency.code === value);
  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return currencies;
    return currencies.filter((currency) =>
      normalize(`${currency.code} ${currency.name} ${currency.countries}`).includes(term),
    );
  }, [currencies, query]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div
      ref={rootRef}
      className="currency-combobox"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <input type="hidden" name="moneda" value={value} />
      <button
        className="currency-combobox__trigger"
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span className="currency-combobox__code">{selected?.code ?? value}</span>
        <span className="currency-combobox__selection">
          <strong>{selected?.name ?? value}</strong>
          <small>{selected?.countries ?? "Código ISO 4217"}</small>
        </span>
        <ChevronRightIcon />
      </button>

      {open && (
        <div className="currency-combobox__panel">
          <label className="currency-combobox__search">
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por país, moneda o código..."
            />
          </label>
          <div className="currency-combobox__options" id={listId} role="listbox">
            {results.map((currency) => (
              <button
                key={currency.code}
                type="button"
                role="option"
                aria-selected={currency.code === value}
                onClick={() => {
                  setValue(currency.code);
                  setOpen(false);
                }}
              >
                <span className="currency-combobox__code">{currency.code}</span>
                <span>
                  <strong>{currency.name}</strong>
                  <small>{currency.countries}</small>
                </span>
                {currency.code === value && <CheckIcon />}
              </button>
            ))}
            {!results.length && (
              <p>No encontramos una moneda con esa búsqueda.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
