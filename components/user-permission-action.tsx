"use client";

import { useRef, useState, useTransition } from "react";
import { getUserPermissionContext } from "@/app/dashboard/usuarios/actions";
import { updateUserPermissionExceptions } from "@/app/dashboard/sistema/roles-permisos/actions";
import { CloseIcon, SettingsIcon, ShieldIcon } from "@/components/icons";
import type { UserPermissionContext } from "@/lib/types";

type PermissionMode = "inherit" | "allow" | "deny";

function initialModes(context: UserPermissionContext) {
  return Object.fromEntries(
    context.exceptions.map((item) => [
      item.id_permiso,
      item.permitido ? "allow" : "deny",
    ]),
  ) as Record<number, PermissionMode>;
}

function groups(context: UserPermissionContext) {
  const grouped = new Map<string, typeof context.permissions>();
  for (const permission of context.permissions) {
    const key = permission.permiso.split(".")[0] || "otros";
    grouped.set(key, [...(grouped.get(key) ?? []), permission]);
  }
  return [...grouped.entries()];
}

type UserPermissionActionProps = {
  userId: number;
  userName: string;
  roleId: number;
  roleName: string;
};

export function UserPermissionAction({
  userId,
  userName,
  roleId,
  roleName,
}: UserPermissionActionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [context, setContext] = useState<UserPermissionContext | null>(null);
  const [modes, setModes] = useState<Record<number, PermissionMode>>({});
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inherited = new Set(context?.rolePermissionIds ?? []);

  function open() {
    setContext(null);
    setModes({});
    setError("");
    dialogRef.current?.showModal();

    startTransition(async () => {
      const result = await getUserPermissionContext(userId, roleId);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setContext(result.value);
      setModes(initialModes(result.value));
    });
  }

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  function save() {
    if (!context) return;

    setError("");
    const exceptions = Object.entries(modes).flatMap(([id, mode]) =>
      mode === "inherit"
        ? []
        : [{ id_permiso: Number(id), permitido: mode === "allow" }],
    );

    startTransition(async () => {
      const result = await updateUserPermissionExceptions(userId, exceptions);
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
        className="status-action-button permission-action-button"
        onClick={open}
        title="Permisos especiales"
        aria-label={`Configurar permisos especiales de ${userName}`}
      >
        <SettingsIcon />
      </button>
      <dialog
        ref={dialogRef}
        className="status-dialog permission-dialog"
        onCancel={(event) => pending && event.preventDefault()}
      >
        <div className="status-dialog__content">
          <header className="status-dialog__header">
            <span className="status-dialog__icon"><ShieldIcon /></span>
            <div>
              <span className="page-eyebrow">EXCEPCIONES INDIVIDUALES</span>
              <h2>Permisos especiales</h2>
              <p>
                <strong>{userName}</strong> parte de la configuración del rol{" "}
                {roleName}; aquí puedes ajustarla solo para esta cuenta.
              </p>
            </div>
            <button
              type="button"
              className="status-dialog__close"
              onClick={close}
              disabled={pending}
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </header>

          {!context && pending && (
            <div className="permission-dialog__loading" role="status">
              <span aria-hidden="true" />
              <strong>Cargando permisos...</strong>
              <small>Estamos consultando el rol y los ajustes de esta cuenta.</small>
            </div>
          )}

          {context && (
            <>
              <div className="permission-dialog__notice">
                <ShieldIcon />
                <p>
                  Los permisos definidos en el rol aparecen activados. ON concede
                  acceso y OFF lo quita para este usuario.
                </p>
              </div>
              <div className="permission-dialog__body">
                {groups(context).map(([group, permissions]) => (
                  <section className="user-permission-group" key={group}>
                    <header>
                      <strong>{group}</strong>
                      <span>{permissions.length} permisos</span>
                    </header>
                    {permissions.map((permission) => {
                      const mode = modes[permission.id_permiso] ?? "inherit";
                      const inheritedAllowed = inherited.has(permission.id_permiso);
                      const effective =
                        mode === "allow" ||
                        (mode === "inherit" && inheritedAllowed);

                      return (
                        <div className="user-permission-row" key={permission.id_permiso}>
                          <div>
                            <strong>{permission.permiso}</strong>
                            <small>{permission.descripcion || "Permiso del sistema"}</small>
                          </div>
                          <div className="user-permission-control">
                            <span className="user-permission-control__source">
                              {mode === "inherit" ? "Del rol" : "Ajuste individual"}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={effective}
                              aria-label={`${permission.permiso}: ${effective ? "ON, acceso permitido" : "OFF, acceso denegado"}`}
                              className={`permission-switch${effective ? " permission-switch--on" : " permission-switch--off"}`}
                              disabled={pending}
                              onClick={() =>
                                setModes((current) => {
                                  const nextAllowed = !effective;
                                  const nextMode: PermissionMode =
                                    nextAllowed === inheritedAllowed
                                      ? "inherit"
                                      : nextAllowed
                                        ? "allow"
                                        : "deny";
                                  return {
                                    ...current,
                                    [permission.id_permiso]: nextMode,
                                  };
                                })
                              }
                            >
                              <span className="permission-switch__track">
                                <span className="permission-switch__label">
                                  {effective ? "ON" : "OFF"}
                                </span>
                                <span className="permission-switch__thumb" />
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>
            </>
          )}

          {error && <p className="status-dialog__error" role="alert">{error}</p>}
          <footer className="status-dialog__footer">
            <button
              type="button"
              className="status-dialog__cancel"
              onClick={close}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="status-dialog__confirm"
              onClick={save}
              disabled={pending || !context}
            >
              {pending && context ? "Guardando..." : "Guardar excepciones"}
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
