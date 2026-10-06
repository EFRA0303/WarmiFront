"use client";

import { useRef, useState } from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  ColumnsIcon,
} from "@/components/icons";
import type { UserStatus, UserType } from "@/lib/types";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";

const statusOptions: Array<{ value: "" | UserStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "ACTIVO", label: "Activos" },
  { value: "BLOQUEADO", label: "Bloqueados" },
  { value: "BAJA", label: "Dados de baja" },
];

const typeOptions: Array<{ value: "" | UserType; label: string }> = [
  { value: "", label: "Todos" },
  { value: "PACIENTE", label: "Pacientes" },
  { value: "PERSONAL", label: "Personal" },
];

const columns = [
  { key: "person", label: "Persona" },
  { key: "account", label: "Cuenta" },
  { key: "role", label: "Rol" },
  { key: "access", label: "Actividad" },
  { key: "security", label: "Seguridad" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
] as const;

export function StatusFilter({ initialValue }: { initialValue?: UserStatus }) {
  const [value, setValue] = useState<"" | UserStatus>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = statusOptions.find((option) => option.value === value)!;
  useCloseDetailsOnOutside(detailsRef);

  function selectStatus(nextValue: "" | UserStatus) {
    setValue(nextValue);
    detailsRef.current?.removeAttribute("open");
    if (inputRef.current) {
      inputRef.current.value = nextValue;
      inputRef.current.form?.requestSubmit();
    }
  }

  return (
    <div className="custom-status-control">
      <span className="custom-control-label">Estado</span>
      <details className="custom-select" ref={detailsRef}>
        <summary>
          <strong>{selected.label}</strong>
          <ChevronRightIcon />
        </summary>
        <div className="custom-select__menu">
          {statusOptions.map((option) => (
            <button
              type="button"
              className={option.value === value ? "custom-select__option--active" : ""}
              key={option.value || "all"}
              onClick={() => selectStatus(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      </details>
      <input ref={inputRef} type="hidden" name="estado" defaultValue={value} />
    </div>
  );
}

export function UserTypeFilter({ initialValue }: { initialValue?: UserType }) {
  const [value, setValue] = useState<"" | UserType>(initialValue || "");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = typeOptions.find((option) => option.value === value)!;
  useCloseDetailsOnOutside(detailsRef);

  function selectType(nextValue: "" | UserType) {
    setValue(nextValue);
    detailsRef.current?.removeAttribute("open");
    if (inputRef.current) {
      inputRef.current.value = nextValue;
      inputRef.current.form?.requestSubmit();
    }
  }

  return (
    <div className="custom-status-control custom-type-control">
      <span className="custom-control-label">Tipo</span>
      <details className="custom-select" ref={detailsRef}>
        <summary>
          <strong>{selected.label}</strong>
          <ChevronRightIcon />
        </summary>
        <div className="custom-select__menu">
          {typeOptions.map((option) => (
            <button
              type="button"
              className={option.value === value ? "custom-select__option--active" : ""}
              key={option.value || "all"}
              onClick={() => selectType(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      </details>
      <input ref={inputRef} type="hidden" name="tipo" defaultValue={value} />
    </div>
  );
}

export function ColumnSelector({ showActions }: { showActions: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseDetailsOnOutside(detailsRef);

  function toggleColumn(key: (typeof columns)[number]["key"], visible: boolean) {
    document.documentElement.classList.toggle(`users-hide-${key}`, !visible);
  }

  return (
    <details ref={detailsRef} className="column-selector">
      <summary className="table-action">
        <ColumnsIcon />
        <span>Columnas</span>
        <ChevronRightIcon className="table-action__chevron" />
      </summary>
      <div className="column-selector__menu">
        <div className="column-selector__heading">
          <strong>Columnas visibles</strong>
          <small>Personaliza la tabla</small>
        </div>
        {columns.filter((column) => column.key !== "actions" || showActions).map((column) => (
          <label key={column.key}>
            <input
              type="checkbox"
              defaultChecked
              onChange={(event) => toggleColumn(column.key, event.target.checked)}
            />
            <span className="column-checkbox">
              <CheckIcon />
            </span>
            <span>{column.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
