"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { ValuationType } from "@/lib/types";

const options: Array<{ value: "" | ValuationType; label: string }> = [
  { value: "", label: "Todos" },
  { value: "INICIAL", label: "Inicial" },
  { value: "EVOLUCION", label: "Evolución" },
  { value: "FINAL", label: "Final" },
];
export function ValuationTypeFilter({ initialValue }: { initialValue?: ValuationType }) {
  const [value, setValue] = useState<"" | ValuationType>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useCloseDetailsOnOutside(detailsRef);
  const selected = options.find((option) => option.value === value)!;
  function select(next: "" | ValuationType) {
    setValue(next);
    detailsRef.current?.removeAttribute("open");
    if (inputRef.current) {
      inputRef.current.value = next;
      inputRef.current.form?.requestSubmit();
    }
  }
  return (
    <div className="directory-status-control">
      <span>Tipo</span>
      <details className="directory-select" ref={detailsRef}>
        <summary><strong>{selected.label}</strong><ChevronRightIcon /></summary>
        <div className="directory-select__menu">
          {options.map((option) => (
            <button type="button" key={option.value || "all"} className={option.value === value ? "directory-select__option--active" : ""} onClick={() => select(option.value)}>
              {option.label}{option.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      </details>
      <input ref={inputRef} type="hidden" name="tipo" defaultValue={value} />
    </div>
  );
}
