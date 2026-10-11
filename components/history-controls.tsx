"use client";
import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { HistoryStatus } from "@/lib/types";
const options: Array<{ value: "" | HistoryStatus; label: string }> = [{ value: "", label: "Todos" }, { value: "ACTIVO", label: "Activos" }, { value: "CERRADO", label: "Cerrados" }];
export function HistoryStatusFilter({ initialValue }: { initialValue?: HistoryStatus }) {
  const [value, setValue] = useState<"" | HistoryStatus>(initialValue || ""); const detailsRef = useRef<HTMLDetailsElement>(null); const inputRef = useRef<HTMLInputElement>(null); useCloseDetailsOnOutside(detailsRef); const selected = options.find((item) => item.value === value)!;
  function select(next: "" | HistoryStatus) { setValue(next); detailsRef.current?.removeAttribute("open"); if (inputRef.current) { inputRef.current.value = next; inputRef.current.form?.requestSubmit(); } }
  return <div className="directory-status-control"><span>Estado</span><details className="directory-select" ref={detailsRef}><summary><strong>{selected.label}</strong><ChevronRightIcon /></summary><div className="directory-select__menu">{options.map((item) => <button type="button" key={item.value || "all"} className={item.value === value ? "directory-select__option--active" : ""} onClick={() => select(item.value)}>{item.label}{item.value === value && <CheckIcon />}</button>)}</div></details><input ref={inputRef} type="hidden" name="estado" defaultValue={value} /></div>;
}
