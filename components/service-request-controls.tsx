"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { ServiceRequestStatus } from "@/lib/types";

const options: Array<{ value: "" | ServiceRequestStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "VALORADO", label: "Valoradas" },
  { value: "ACEPTADO", label: "Aceptadas" },
  { value: "DESCARTADO", label: "Descartadas" },
];
export function ServiceRequestStatusFilter({ initialValue }: { initialValue?: ServiceRequestStatus }) {
  const [value, setValue] = useState<"" | ServiceRequestStatus>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useCloseDetailsOnOutside(detailsRef);
  const selected = options.find((option) => option.value === value)!;
  function select(next: "" | ServiceRequestStatus) {
    setValue(next); detailsRef.current?.removeAttribute("open");
    if (inputRef.current) { inputRef.current.value = next; inputRef.current.form?.requestSubmit(); }
  }
  return <div className="directory-status-control"><span>Estado</span><details className="directory-select" ref={detailsRef}><summary><strong>{selected.label}</strong><ChevronRightIcon /></summary><div className="directory-select__menu">{options.map((option) => <button type="button" key={option.value || "all"} className={option.value === value ? "directory-select__option--active" : ""} onClick={() => select(option.value)}>{option.label}{option.value === value && <CheckIcon />}</button>)}</div></details><input ref={inputRef} type="hidden" name="estado" defaultValue={value} /></div>;
}
