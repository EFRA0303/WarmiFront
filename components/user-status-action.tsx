"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { updateUser } from "@/app/dashboard/usuarios/actions";
import {
  CloseIcon,
  EditIcon,
  LockIcon,
} from "@/components/icons";

export function UserStatusAction({
  userId,
  userName,
  email,
  username,
  creatorName,
  createdAt,
  updatedAt,
}: {
  userId: number;
  userName: string;
  email: string;
  username: string | null;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [emailValue, setEmailValue] = useState(email);
  const [usernameValue, setUsernameValue] = useState(username || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setEmailValue(email);
    setUsernameValue(username || "");
    setError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!isPending) dialogRef.current?.close();
  }

  const hasChanges =
    emailValue.trim().toLowerCase() !== email.toLowerCase() ||
    usernameValue.trim() !== (username || "");

  function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;
    setError("");
    startTransition(async () => {
      const result = await updateUser(userId, {
        correo_acceso: emailValue,
        nombre_usuario: usernameValue.trim() || null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        className="status-action-button"
        onClick={openDialog}
        aria-label={`Editar usuario ${userName}`}
        title="Editar usuario"
      >
        <EditIcon />
      </button>

      <dialog
        ref={dialogRef}
        className="status-dialog"
        onCancel={(event) => {
          if (isPending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog();
        }}
      >
        <form className="status-dialog__content" onSubmit={submitChange}>
          <header className="status-dialog__header">
            <span className="status-dialog__icon">
              <LockIcon />
            </span>
            <div>
              <span className="page-eyebrow">GESTIÓN DE CUENTA</span>
              <h2>Editar usuario</h2>
              <p>
                Actualiza el acceso de <strong>{userName}</strong>.
              </p>
            </div>
            <button
              type="button"
              className="status-dialog__close"
              onClick={closeDialog}
              disabled={isPending}
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </header>

          <section className="status-dialog__section">
            <div className="status-dialog__section-title">
              <strong>Datos de acceso</strong>
              <small>Información utilizada para ingresar al sistema</small>
            </div>
            <div className="status-dialog__fields">
              <label>
                <span>Correo de acceso</span>
                <input
                  type="email"
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  maxLength={150}
                  autoComplete="off"
                  required
                  disabled={isPending}
                />
              </label>
              <label>
                <span>Nombre de usuario</span>
                <input
                  type="text"
                  value={usernameValue}
                  onChange={(event) => setUsernameValue(event.target.value)}
                  maxLength={50}
                  autoComplete="off"
                  placeholder="Opcional"
                  disabled={isPending}
                />
              </label>
            </div>
          </section>

          {error && (
            <p className="status-dialog__error" role="alert">
              {error}
            </p>
          )}

          <section className="status-audit" aria-label="Información de auditoría">
            <div>
              <span>Creado por</span>
              <strong>{creatorName}</strong>
            </div>
            <div>
              <span>Fecha de creación</span>
              <strong>{formatDate(createdAt)}</strong>
            </div>
            <div>
              <span>Última modificación</span>
              <strong>{formatDate(updatedAt)}</strong>
            </div>
          </section>

          <footer className="status-dialog__footer">
            <button
              type="button"
              className="status-dialog__cancel"
              onClick={closeDialog}
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="status-dialog__confirm"
              disabled={isPending || !hasChanges}
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  }).format(date);
}
