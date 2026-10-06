"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { GeneralStatus } from "@/lib/types";

const options: Array<{ value: "" | GeneralStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "ACTIVO", label: "Activos" },
  { value: "BAJA", label: "Dados de baja" },
];

export function GeneralStatusFilter({ initialValue }: { initialValue?: GeneralStatus }) {
  const [value, setValue] = useState<"" | GeneralStatus>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value)!;
  useCloseDetailsOnOutside(detailsRef);

  function select(nextValue: "" | GeneralStatus) {
    setValue(nextValue);
    detailsRef.current?.removeAttribute("open");
    if (inputRef.current) {
      inputRef.current.value = nextValue;
      inputRef.current.form?.requestSubmit();
    }
  }

  return (
    <div className="directory-status-control">
      <span>Estado</span>
      <details className="directory-select" ref={detailsRef}>
        <summary>
          <strong>{selected.label}</strong>
          <ChevronRightIcon />
        </summary>
        <div className="directory-select__menu">
          {options.map((option) => (
            <button
              type="button"
              className={option.value === value ? "directory-select__option--active" : ""}
              key={option.value || "all"}
              onClick={() => select(option.value)}
            >
              {option.label}
              {option.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      </details>
      <input ref={inputRef} type="hidden" name="estado" defaultValue={value} />
    </div>
  );
}
