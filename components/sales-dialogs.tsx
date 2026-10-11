"use client";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { CloseIcon, FileTextIcon, PlusIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  cancelPayment,
  cancelSaleNote,
  createPayment,
  createSaleNote,
} from "@/app/dashboard/ventas/actions";
import type {
  RegistrationState,
  SaleNote,
  SalePayment,
  SalesOptions,
} from "@/lib/types";
const initial: RegistrationState = {};
const now = () => new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 16);
function Dialog({
  close,
  title,
  description,
  children,
  wide,
}: {
  close: () => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`session-dialog sales-dialog${wide ? " sales-dialog--wide" : ""}`}
      onCancel={close}
      onClick={(e) => e.target === ref.current && close()}
    >
      <section>
        <header>
          <span>
            <FileTextIcon />
          </span>
          <div>
            <b className="page-eyebrow">VENTAS</b>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar">
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
export function NewSaleDialog({ options }: { options: SalesOptions }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([0]);
  const [state, action, pending] = useActionState(createSaleNote, initial);
  const [date] = useState(now);
  return (
    <>
      <button
        className="directory-primary"
        type="button"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Nueva nota
      </button>
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title="Emitir nota de venta"
          description="Agrega servicios, productos o paquetes; los totales se calculan en el servidor."
          wide
        >
          <form action={action} className="session-form">
            <input type="hidden" name="detail_count" value={rows.length} />
            <div className="session-grid">
              <label>
                <span>Número de nota *</span>
                <input name="numero_nota" maxLength={30} required />
                <Error state={state} name="numero_nota" />
              </label>
              <label>
                <span>Fecha de emisión *</span>
                <input
                  name="fecha_emision"
                  type="datetime-local"
                  defaultValue={date}
                  required
                />
                <Error state={state} name="fecha_emision" />
              </label>
              <label>
                <span>Paciente</span>
                <select name="id_paciente" defaultValue="">
                  <option value="">Venta general</option>
                  {options.patients.map((p) => (
                    <option value={p.id_paciente} key={p.id_paciente}>
                      {p.ap_paterno} {p.ap_materno} {p.nombre}
                      {p.ci ? ` · CI ${p.ci}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Adquisición vinculada</span>
                <select name="id_adquisicion" defaultValue="">
                  <option value="">Sin adquisición</option>
                  {options.acquisitions.map((a) => (
                    <option value={a.id_adquisicion} key={a.id_adquisicion}>
                      {a.concepto} · Bs {Number(a.total).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Descuento general</span>
                <input
                  name="descuento"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                />
                <Error state={state} name="descuento" />
              </label>
              <label className="session-wide">
                <span>Observaciones</span>
                <textarea name="observaciones" rows={2} maxLength={255} />
              </label>
            </div>
            <div className="sale-details-head">
              <div>
                <strong>Conceptos de la venta</strong>
                <Error state={state} name="detalles" />
              </div>
              <button
                type="button"
                onClick={() =>
                  setRows((current) => [...current, current.length])
                }
              >
                <PlusIcon />
                Agregar concepto
              </button>
            </div>
            <div className="sale-details">
              {rows.map((_, index) => (
                <div className="sale-detail" key={index}>
                  <label>
                    <span>Concepto *</span>
                    <select name={`item_${index}`} defaultValue="" required>
                      <option value="" disabled>
                        Seleccionar
                      </option>
                      {options.items.map((item) => (
                        <option
                          value={`${item.tipo}:${item.id}`}
                          key={`${item.tipo}-${item.id}`}
                        >
                          {item.nombre} · {item.tipo.toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <Error state={state} name={`item_${index}`} />
                  </label>
                  <label>
                    <span>Cantidad *</span>
                    <input
                      name={`cantidad_${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue="1"
                      required
                    />
                    <Error state={state} name={`cantidad_${index}`} />
                  </label>
                  <label>
                    <span>Precio unitario *</span>
                    <input
                      name={`precio_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                    <Error state={state} name={`precio_${index}`} />
                  </label>
                  <label>
                    <span>Descuento</span>
                    <input
                      name={`descuento_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                    />
                  </label>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      aria-label="Quitar concepto"
                      onClick={() =>
                        setRows((current) =>
                          current.filter((__, i) => i !== index),
                        )
                      }
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="directory-primary" disabled={pending}>
                {pending ? "Emitiendo..." : "Emitir nota"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              key={state.resultId}
              state={state}
              onSuccess={() => setOpen(false)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
export function NewPaymentDialog({ options }: { options: SalesOptions }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPayment, initial);
  const [date] = useState(now);
  return (
    <>
      <button
        className="directory-primary"
        type="button"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Registrar pago
      </button>
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title="Registrar pago"
          description="Puedes registrar pagos parciales hasta completar el saldo."
        >
          <form action={action} className="session-form">
            <div className="session-grid">
              <label className="session-wide">
                <span>Nota de venta *</span>
                <select name="id_nota_venta" defaultValue="" required>
                  <option value="" disabled>
                    Seleccionar nota
                  </option>
                  {options.notes.map((n) => (
                    <option value={n.id_nota_venta} key={n.id_nota_venta}>
                      {n.numero_nota} · {n.paciente} · saldo Bs{" "}
                      {Number(n.saldo).toFixed(2)}
                    </option>
                  ))}
                </select>
                <Error state={state} name="id_nota_venta" />
              </label>
              <label>
                <span>Monto *</span>
                <input
                  name="monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
                <Error state={state} name="monto" />
              </label>
              <label>
                <span>Método *</span>
                <select name="metodo_pago" defaultValue="EFECTIVO">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="QR">QR</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>
              <label>
                <span>Fecha *</span>
                <input
                  name="fecha_pago"
                  type="datetime-local"
                  defaultValue={date}
                  required
                />
                <Error state={state} name="fecha_pago" />
              </label>
              <label className="session-wide">
                <span>Observaciones</span>
                <textarea name="observaciones" rows={3} maxLength={255} />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="directory-primary" disabled={pending}>
                {pending ? "Registrando..." : "Registrar pago"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              key={state.resultId}
              state={state}
              onSuccess={() => setOpen(false)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
function CancelAction({
  id,
  type,
  name,
}: {
  id: number;
  type: "note" | "payment";
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<RegistrationState>({});
  return (
    <>
      <button
        type="button"
        className="cancel"
        title={type === "note" ? "Anular nota" : "Anular pago"}
        onClick={() => setOpen(true)}
      >
        <CloseIcon />
      </button>
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title={type === "note" ? "Anular nota de venta" : "Anular pago"}
          description="El registro permanecerá visible en el historial."
        >
          <div className="session-confirm">
            <p>
              ¿Confirmas la anulación de <strong>{name}</strong>?
            </p>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Volver
              </button>
              <button
                type="button"
                className="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const response =
                      type === "note"
                        ? await cancelSaleNote(id)
                        : await cancelPayment(id);
                    setOpen(false);
                    setResult(response);
                  })
                }
              >
                {pending ? "Procesando..." : "Anular"}
              </button>
            </footer>
          </div>
        </Dialog>
      )}
      {result.resultId && (
        <SubmissionResultDialog
          key={result.resultId}
          state={result}
          onSuccess={() => setResult({})}
        />
      )}
    </>
  );
}
export const SaleNoteAction = ({ item }: { item: SaleNote }) =>
  item.estado === "EMITIDA" ? (
    <div className="session-actions">
      <CancelAction
        id={item.id_nota_venta}
        type="note"
        name={item.numero_nota}
      />
    </div>
  ) : null;
export const PaymentAction = ({ item }: { item: SalePayment }) =>
  item.estado === "REGISTRADO" ? (
    <div className="session-actions">
      <CancelAction
        id={item.id_pago}
        type="payment"
        name={`pago #${item.id_pago}`}
      />
    </div>
  ) : null;
