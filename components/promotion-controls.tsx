"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { PromotionStatus } from "@/lib/types";

const options: Array<{ value: "" | PromotionStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "PROGRAMADA", label: "Programadas" },
  { value: "ACTIVA", label: "Activas" },
  { value: "FINALIZADA", label: "Finalizadas" },
  { value: "CANCELADA", label: "Canceladas" },
];

export function PromotionStatusFilter({ initialValue }: { initialValue?: PromotionStatus }) {
  const [value, setValue] = useState<"" | PromotionStatus>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value)!;
  useCloseDetailsOnOutside(detailsRef);

  function select(next: "" | PromotionStatus) {
    setValue(next);
    detailsRef.current?.removeAttribute("open");
    if (inputRef.current) {
      inputRef.current.value = next;
      inputRef.current.form?.requestSubmit();
    }
  }

  return <div className="directory-status-control"><span>Estado</span><details className="directory-select" ref={detailsRef}><summary><strong>{selected.label}</strong><ChevronRightIcon /></summary><div className="directory-select__menu">{options.map((option) => <button type="button" className={option.value === value ? "directory-select__option--active" : ""} key={option.value || "all"} onClick={() => select(option.value)}>{option.label}{option.value === value && <CheckIcon />}</button>)}</div></details><input ref={inputRef} type="hidden" name="estado" defaultValue={value} /></div>;
}
