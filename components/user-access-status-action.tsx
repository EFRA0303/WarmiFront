"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { changeUserAccessState } from "@/app/dashboard/usuarios/actions";
import { CheckIcon, CloseIcon, LockIcon } from "@/components/icons";
import type { UserStatus } from "@/lib/types";

const statusOptions: Array<{
  value: UserStatus;
  label: string;
  description: string;
}> = [
  {
    value: "ACTIVO",
    label: "Activo",
    description: "Habilita el acceso y limpia intentos fallidos.",
  },
  {
    value: "BLOQUEADO",
    label: "Bloqueo temporal",
    description: "Suspende el acceso hasta la fecha indicada.",
  },
  {
    value: "BAJA",
    label: "Dar de baja",
    description: "Deshabilita la cuenta hasta su reactivación.",
  },
];

function effectiveStatus(status: UserStatus, temporarilyBlocked: boolean): UserStatus {
  return temporarilyBlocked ? "BLOQUEADO" : status;
}

function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function StatusVisual({
  status,
  temporarilyBlocked,
}: {
  status: UserStatus;
  temporarilyBlocked: boolean;
}) {
  const current = effectiveStatus(status, temporarilyBlocked);
  const label = current === "ACTIVO" ? "Activo" : current === "BAJA" ? "Baja" : "Bloqueado";
  const detail =
    current === "ACTIVO"
      ? "Cuenta habilitada"
      : current === "BAJA"
        ? "Cuenta inactiva"
        : temporarilyBlocked
          ? "Temporal"
          : "Acceso restringido";

  return (
    <span className="user-status-cell">
      <span className={`status-badge status-badge--${current.toLowerCase()}`}>
        {current === "ACTIVO" ? <CheckIcon /> : current === "BLOQUEADO" ? <LockIcon /> : <CloseIcon />}
        {label}
      </span>
      <small>{detail}</small>
    </span>
  );
}

export function UserAccessStatusAction({
  userId,
  userName,
  currentStatus,
  blockedUntil,
  temporarilyBlocked,
  canEdit,
}: {
  userId: number;
  userName: string;
  currentStatus: UserStatus;
  blockedUntil: string | null;
  temporarilyBlocked: boolean;
  canEdit: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialStatus = effectiveStatus(currentStatus, temporarilyBlocked);
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(initialStatus);
  const [blockedUntilValue, setBlockedUntilValue] = useState(localDateTimeValue(blockedUntil));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setSelectedStatus(effectiveStatus(currentStatus, temporarilyBlocked));
    setBlockedUntilValue(localDateTimeValue(blockedUntil));
    setReason("");
    setError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!isPending) dialogRef.current?.close();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if ((selectedStatus === "BLOQUEADO" || selectedStatus === "BAJA") && trimmedReason.length < 3) {
      setError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }
    if (selectedStatus === "BLOQUEADO") {
      const date = new Date(blockedUntilValue);
      if (!blockedUntilValue || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setError("Selecciona una fecha y hora posterior a la actual.");
        return;
      }
    }

    setError("");
    startTransition(async () => {
      const result = await changeUserAccessState(userId, {
        estado: selectedStatus,
        bloqueado_hasta: selectedStatus === "BLOQUEADO" ? blockedUntilValue : undefined,
        motivo: selectedStatus === "BLOQUEADO" || selectedStatus === "BAJA" ? trimmedReason : undefined,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      dialogRef.current?.close();
    });
  }

  if (!canEdit) return <StatusVisual status={currentStatus} temporarilyBlocked={temporarilyBlocked} />;

  return (
    <>
      <button
        type="button"
        className="user-status-trigger"
        onClick={openDialog}
        aria-label={`Cambiar estado de ${userName}`}
        title="Cambiar estado"
      >
        <StatusVisual status={currentStatus} temporarilyBlocked={temporarilyBlocked} />
      </button>

      <dialog
        ref={dialogRef}
        className="status-dialog access-state-dialog"
        onCancel={(event) => {
          if (isPending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog();
        }}
      >
        <form className="status-dialog__content" onSubmit={submit}>
          <header className="status-dialog__header">
            <span className="status-dialog__icon"><LockIcon /></span>
            <div>
              <span className="page-eyebrow">CONTROL DE ACCESO</span>
              <h2>Cambiar estado</h2>
              <p>Administra el acceso de <strong>{userName}</strong>.</p>
            </div>
            <button type="button" className="status-dialog__close" onClick={closeDialog} disabled={isPending} aria-label="Cerrar">
              <CloseIcon />
            </button>
          </header>

          <section className="status-dialog__section">
            <div className="status-dialog__section-title">
              <strong>Nuevo estado</strong>
              <small>Selecciona cómo podrá acceder esta cuenta</small>
            </div>
            <div className="status-options" role="radiogroup" aria-label="Nuevo estado de la cuenta">
              {statusOptions.map((option) => {
                const selected = selectedStatus === option.value;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`status-option status-option--${option.value.toLowerCase()} ${selected ? "status-option--selected" : ""}`}
                    key={option.value}
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setError("");
                    }}
                    disabled={isPending}
                  >
                    <span className="status-option__dot" />
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                    <span className="status-option__check">{selected && <CheckIcon />}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedStatus === "BLOQUEADO" && (
            <section className="status-dialog__section access-state-fields">
              <label>
                <span>Bloqueado hasta *</span>
                <input
                  type="datetime-local"
                  value={blockedUntilValue}
                  onChange={(event) => setBlockedUntilValue(event.target.value)}
                  required
                  disabled={isPending}
                />
              </label>
              <label>
                <span>Motivo del bloqueo *</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={3}
                  maxLength={255}
                  placeholder="Indica por qué se bloqueará temporalmente..."
                  required
                  disabled={isPending}
                />
              </label>
            </section>
          )}

          {selectedStatus === "BAJA" && (
            <section className="status-dialog__section access-state-fields">
              <label>
                <span>Motivo de la baja *</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={3}
                  maxLength={255}
                  placeholder="Indica por qué se dará de baja esta cuenta..."
                  required
                  disabled={isPending}
                />
              </label>
            </section>
          )}

          {selectedStatus === "ACTIVO" && initialStatus !== "ACTIVO" && (
            <p className="access-state-note">Al reactivar la cuenta se limpiarán el bloqueo y los intentos fallidos.</p>
          )}

          {error && <p className="status-dialog__error" role="alert">{error}</p>}

          <footer className="status-dialog__footer">
            <button type="button" className="status-dialog__cancel" onClick={closeDialog} disabled={isPending}>Cancelar</button>
            <button type="submit" className="status-dialog__confirm" disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar cambio"}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
