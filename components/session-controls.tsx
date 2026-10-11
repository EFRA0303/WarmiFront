"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { SessionStatus } from "@/lib/types";

const options: Array<{ value: "" | SessionStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "FINALIZADA", label: "Finalizadas" },
  { value: "CANCELADA", label: "Canceladas" },
];
export function SessionStatusFilter({
  initialValue,
}: {
  initialValue?: SessionStatus;
}) {
  const [value, setValue] = useState<"" | SessionStatus>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useCloseDetailsOnOutside(detailsRef);
  const selected = options.find((option) => option.value === value)!;
  function select(next: "" | SessionStatus) {
    setValue(next);
    detailsRef.current?.removeAttribute("open");
    if (inputRef.current) {
      inputRef.current.value = next;
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
              key={option.value || "all"}
              className={
                option.value === value ? "directory-select__option--active" : ""
              }
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
