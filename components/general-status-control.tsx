"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { CheckIcon, CloseIcon, LockIcon } from "@/components/icons";
import type { GeneralStatus, RegistrationState } from "@/lib/types";

type ChangeStatusAction = (
  id: number,
  status: GeneralStatus,
  reason: string,
  updateAccess: boolean,
) => Promise<RegistrationState>;

const statusOptions: Array<{ value: GeneralStatus; label: string; description: string }> = [
  { value: "ACTIVO", label: "Activo", description: "Habilita nuevamente este registro." },
  { value: "BAJA", label: "Dar de baja", description: "Deshabilita el registro hasta su reactivación." },
];

function StatusVisual({ status }: { status: GeneralStatus }) {
  return (
    <span className="user-status-cell">
      <span className={`status-badge status-badge--${status.toLowerCase()}`}>
        {status === "ACTIVO" ? <CheckIcon /> : <CloseIcon />}
        {status === "ACTIVO" ? "Activo" : "Baja"}
      </span>
      <small>{status === "ACTIVO" ? "Registro habilitado" : "Registro inactivo"}</small>
    </span>
  );
}

export function GeneralStatusControl({ id, name, status, reason: currentReason, accessPolicy = "none", action }: {
  id: number;
  name: string;
  status: GeneralStatus;
  reason?: string | null;
  accessPolicy?: "none" | "optional" | "required";
  action: ChangeStatusAction;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<GeneralStatus>(status);
  const [reason, setReason] = useState("");
  const [updateAccess, setUpdateAccess] = useState(accessPolicy === "required");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setSelectedStatus(status);
    setReason("");
    setUpdateAccess(accessPolicy === "required");
    setError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!isPending) dialogRef.current?.close();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (selectedStatus === "BAJA" && trimmedReason.length < 3) {
      setError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await action(
        id,
        selectedStatus,
        trimmedReason,
        accessPolicy === "required" || updateAccess,
      );
      if (result.outcome !== "success") {
        setError(result.message || "No fue posible cambiar el estado.");
        return;
      }
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button type="button" className="user-status-trigger" onClick={openDialog} aria-label={`Cambiar estado de ${name}`} title="Cambiar estado">
        <StatusVisual status={status} />
      </button>

      <dialog ref={dialogRef} className="status-dialog access-state-dialog" onCancel={(event) => { if (isPending) event.preventDefault(); }} onClick={(event) => { if (event.target === dialogRef.current) closeDialog(); }}>
        <form className="status-dialog__content" onSubmit={submit}>
          <header className="status-dialog__header">
            <span className="status-dialog__icon"><LockIcon /></span>
            <div>
              <span className="page-eyebrow">CONTROL DE ESTADO</span>
              <h2>Cambiar estado</h2>
              <p>Administra el estado de <strong>{name}</strong>.</p>
            </div>
            <button type="button" className="status-dialog__close" onClick={closeDialog} disabled={isPending} aria-label="Cerrar"><CloseIcon /></button>
          </header>

          <section className="status-dialog__section">
            <div className="status-dialog__section-title">
              <strong>Nuevo estado</strong>
              <small>Selecciona cómo quedará este registro</small>
            </div>
            <div className="status-options status-options--general" role="radiogroup" aria-label="Nuevo estado del registro">
              {statusOptions.map((option) => {
                const selected = selectedStatus === option.value;
                return (
                  <button type="button" role="radio" aria-checked={selected} className={`status-option status-option--${option.value.toLowerCase()} ${selected ? "status-option--selected" : ""}`} key={option.value} onClick={() => { setSelectedStatus(option.value); setError(""); }} disabled={isPending}>
                    <span className="status-option__dot" />
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                    <span className="status-option__check">{selected && <CheckIcon />}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedStatus === "BAJA" && (
            <section className="status-dialog__section access-state-fields">
              <label>
                <span>Motivo de la baja *</span>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={255} placeholder="Indica por qué se dará de baja este registro..." required disabled={isPending} />
              </label>
              {status === "BAJA" && currentReason && !reason && <small className="current-status-reason">Motivo actual: {currentReason}</small>}
            </section>
          )}

          {selectedStatus === "ACTIVO" && status !== "ACTIVO" && <p className="access-state-note">Al reactivar, el registro volverá a estar disponible en el sistema.</p>}

          {accessPolicy === "optional" && (
            <label className="linked-access-option">
              <input
                type="checkbox"
                checked={updateAccess}
                onChange={(event) => setUpdateAccess(event.target.checked)}
                disabled={isPending}
              />
              <span>
                <strong>{selectedStatus === "ACTIVO" ? "Reactivar también su cuenta" : "Dar de baja también su cuenta"}</strong>
                <small>El acceso del usuario vinculado se actualizará junto con el paciente.</small>
              </span>
            </label>
          )}

          {accessPolicy === "required" && (
            <p className="linked-access-required">
              <LockIcon />
              <span><strong>La cuenta de acceso se actualizará también.</strong> El empleado no conservará acceso cuando esté de baja.</span>
            </p>
          )}
          {error && <p className="status-dialog__error" role="alert">{error}</p>}

          <footer className="status-dialog__footer">
            <button type="button" className="status-dialog__cancel" onClick={closeDialog} disabled={isPending}>Cancelar</button>
            <button type="submit" className="status-dialog__confirm" disabled={isPending}>{isPending ? "Guardando..." : "Confirmar cambio"}</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
