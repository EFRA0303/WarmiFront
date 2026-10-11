"use client";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CloseIcon, EditIcon, PlusIcon, ShieldIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  saveAuditConfig,
  saveDocumentConfig,
} from "@/app/dashboard/seguridad/actions";
import type {
  AuditConfig,
  Company,
  DocumentConfig,
  RegistrationState,
} from "@/lib/types";
const initial: RegistrationState = {};
function Dialog({
  close,
  title,
  description,
  children,
}: {
  close: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="session-dialog inventory-dialog"
      onCancel={close}
      onClick={(e) => e.target === ref.current && close()}
    >
      <section>
        <header>
          <span>
            <ShieldIcon />
          </span>
          <div>
            <b className="page-eyebrow">CONFIGURACIÓN</b>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button onClick={close}>
            <CloseIcon />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
function Error({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? (
    <small className="session-error">{state.fieldErrors[name]}</small>
  ) : null;
}
export function DocumentConfigDialog({
  item,
  companies,
}: {
  item?: DocumentConfig;
  companies: Company[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveDocumentConfig.bind(null, item?.id_configuracion ?? null),
    initial,
  );
  return (
    <>
      {item ? (
        <button onClick={() => setOpen(true)} title="Editar">
          <EditIcon />
        </button>
      ) : (
        <button className="directory-primary" onClick={() => setOpen(true)}>
          <PlusIcon />
          Nueva configuración
        </button>
      )}
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title={item ? "Editar documentos" : "Configurar documentos"}
          description="Define qué datos de la empresa aparecerán al imprimir."
        >
          <form action={action} className="session-form">
            <div className="session-grid">
              <label className="session-wide">
                <span>Empresa *</span>
                <select
                  name="id_empresa"
                  defaultValue={item?.id_empresa ?? ""}
                  disabled={Boolean(item)}
                  required
                >
                  <option value="" disabled>
                    Seleccionar empresa
                  </option>
                  {companies.map((c) => (
                    <option key={c.id_empresa} value={c.id_empresa}>
                      {c.nombre_comercial}
                    </option>
                  ))}
                </select>
                {item && (
                  <input
                    type="hidden"
                    name="id_empresa"
                    value={item.id_empresa}
                  />
                )}
                <Error state={state} name="id_empresa" />
              </label>
              <label className="session-wide">
                <span>Encabezado</span>
                <input
                  name="encabezado"
                  maxLength={255}
                  defaultValue={item?.encabezado ?? ""}
                />
              </label>
              <label className="session-wide">
                <span>Pie de página</span>
                <input
                  name="pie_pagina"
                  maxLength={255}
                  defaultValue={item?.pie_pagina ?? ""}
                />
              </label>
              <div className="inventory-checks session-wide">
                {[
                  ["mostrar_logo", "Logo"],
                  ["mostrar_direccion", "Dirección"],
                  ["mostrar_telefono", "Teléfono"],
                  ["mostrar_correo", "Correo"],
                ].map(([name, label]) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      name={name}
                      defaultChecked={
                        item
                          ? Boolean(item[name as keyof DocumentConfig])
                          : true
                      }
                    />
                    <span>Mostrar {label}</span>
                  </label>
                ))}
              </div>
            </div>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="directory-primary" disabled={pending}>
                {pending ? "Guardando..." : "Guardar"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              state={state}
              onSuccess={() => setOpen(false)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
export function AuditConfigDialog({ item }: { item?: AuditConfig }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveAuditConfig.bind(null, item?.id_configuracion ?? null),
    initial,
  );
  return (
    <>
      {item ? (
        <button onClick={() => setOpen(true)} title="Editar regla">
          <EditIcon />
        </button>
      ) : (
        <button className="directory-primary" onClick={() => setOpen(true)}>
          <PlusIcon />
          Nueva regla
        </button>
      )}
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title={item ? "Editar regla" : "Nueva regla de auditoría"}
          description={
            item?.es_obligatorio
              ? "Este evento es obligatorio y no puede deshabilitarse."
              : "Configura si el evento debe registrarse."
          }
        >
          <form action={action} className="session-form">
            <div className="session-grid">
              <label>
                <span>Código *</span>
                <input
                  name="codigo_evento"
                  maxLength={80}
                  defaultValue={item?.codigo_evento ?? ""}
                  readOnly={item?.es_obligatorio}
                />
                <Error state={state} name="codigo_evento" />
              </label>
              <label>
                <span>Nombre *</span>
                <input
                  name="nombre"
                  maxLength={120}
                  defaultValue={item?.nombre ?? ""}
                />
                <Error state={state} name="nombre" />
              </label>
              <label>
                <span>Categoría *</span>
                <input
                  name="categoria"
                  maxLength={60}
                  defaultValue={item?.categoria ?? ""}
                />
                <Error state={state} name="categoria" />
              </label>
              <label className="session-wide">
                <span>Descripción</span>
                <textarea
                  name="descripcion"
                  maxLength={255}
                  rows={3}
                  defaultValue={item?.descripcion ?? ""}
                />
              </label>
              <div className="inventory-checks session-wide">
                <label>
                  <input
                    type="checkbox"
                    name="habilitado"
                    defaultChecked={item?.habilitado ?? true}
                    disabled={item?.es_obligatorio}
                  />
                  {item?.es_obligatorio && (
                    <input type="hidden" name="habilitado" value="on" />
                  )}
                  <span>Evento habilitado</span>
                </label>
              </div>
            </div>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="directory-primary" disabled={pending}>
                {pending ? "Guardando..." : "Guardar regla"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              state={state}
              onSuccess={() => setOpen(false)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
