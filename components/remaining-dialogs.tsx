"use client";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  BoxIcon,
  CloseIcon,
  PlusIcon,
} from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  changeAcquisition,
  createAcquisition,
  createConsumption,
  createSaleOutput,
} from "@/app/dashboard/operaciones/actions";
import type {
  Acquisition,
  AcquisitionOptions,
  InventoryOperationOptions,
  RegistrationState,
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
      className={`session-dialog inventory-dialog${wide ? " package-dialog--wide" : ""}`}
      onCancel={close}
      onClick={(e) => e.target === ref.current && close()}
    >
      <section>
        <header>
          <span>
            <BoxIcon />
          </span>
          <div>
            <b className="page-eyebrow">GESTIÓN INTEGRAL</b>
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
export function AcquisitionDialog({
  options,
}: {
  options: AcquisitionOptions;
}) {
  const [open, setOpen] = useState(false);
  return <><button className="directory-primary" type="button" onClick={() => setOpen(true)}><PlusIcon />Nueva adquisición</button>{open && <AcquisitionForm options={options} close={() => setOpen(false)} />}</>;
}
function AcquisitionForm({ options, close }: { options: AcquisitionOptions; close: () => void }) {
  const [selected, setSelected] = useState("");
  const [operationKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState(createAcquisition, initial);
  const [date] = useState(now);
  const offer = options.offers.find((o) => `${o.tipo}:${o.id}` === selected);
  return (
    <>
        <Dialog
          close={close}
          title="Adquirir servicio, paquete o promoción"
          description="Genera automáticamente la nota y el saldo. El primer abono se registra por separado para habilitar la atención."
          wide
        >
          <form action={action} className="session-form">
            <input type="hidden" name="clave_operacion" value={operationKey} />
            <input
              type="hidden"
              name="service_count"
              value={offer?.servicios.length ?? 0}
            />
            <div className="session-grid">
              <label>
                <span>Paciente *</span>
                <select name="id_paciente" defaultValue="" required>
                  <option value="" disabled>
                    Seleccionar paciente
                  </option>
                  {options.patients.map((p) => (
                    <option key={p.id_paciente} value={p.id_paciente}>
                      {p.ap_paterno} {p.ap_materno} {p.nombre}
                      {p.ci ? ` · CI ${p.ci}` : ""}
                    </option>
                  ))}
                </select>
                <Error state={state} name="id_paciente" />
              </label>
              <label>
                <span>Servicio, paquete o promoción *</span>
                <select
                  name="offer"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Seleccionar oferta
                  </option>
                  {options.offers.map((o) => (
                    <option
                      key={`${o.tipo}-${o.id}`}
                      value={`${o.tipo}:${o.id}`}
                    >
                      {o.nombre} ·{" "}
                       {o.tipo !== "PROMOCION"
                        ? `Bs ${Number(o.precio).toFixed(2)}`
                        : "Promoción"}
                    </option>
                  ))}
                </select>
                <Error state={state} name="offer" />
              </label>
              <label>
                <span>Fecha *</span>
                <input
                  name="fecha_adquisicion"
                  type="datetime-local"
                  defaultValue={date}
                  required
                />
                <Error state={state} name="fecha_adquisicion" />
              </label>
            </div>
            {offer && (
              <div className="sale-details">
                {offer.servicios.map((s, i) => (
                  <div
                    className="sale-detail acquisition-detail"
                    key={s.id_servicio}
                  >
                    <input
                      type="hidden"
                      name={`service_id_${i}`}
                      value={s.id_servicio}
                    />
                    <input
                      type="hidden"
                      name={`sessions_${i}`}
                      value={s.sesiones_incluidas}
                    />
                    <div>
                      <strong>{s.servicio}</strong>
                      <small>{s.sesiones_incluidas} sesiones</small>
                    </div>
                    <label>
                       <span>Precio referencial por sesión</span>
                      <input
                        name={`price_${i}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number(s.precio).toFixed(2)}
                        readOnly
                        required
                      />
                      <Error state={state} name={`price_${i}`} />
                    </label>
                  </div>
                ))}
              </div>
            )}
            <footer>
              <button type="button" onClick={close}>
                Cancelar
              </button>
              <button
                className="directory-primary"
                disabled={pending || !offer}
              >
                {pending ? "Guardando..." : "Registrar adquisición"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              key={state.resultId}
              state={state}
              onSuccess={close}
            />
          )}
        </Dialog>
    </>
  );
}
export function AcquisitionActions({ item }: { item: Acquisition }) {
  const [choice, setChoice] = useState<"CANCELADA" | null>(null),
    [pending, start] = useTransition(),
    [result, setResult] = useState<RegistrationState>({});
  const [reason, setReason] = useState("");
  if (item.estado !== "ACTIVA") return null;
  return (
    <>
      <div className="session-actions">
        <button
          className="cancel"
          title="Cancelar"
          onClick={() => setChoice("CANCELADA")}
        >
          <CloseIcon />
        </button>
      </div>
      {choice && (
        <Dialog
          close={() => setChoice(null)}
          title="Cancelar adquisición"
          description="El registro permanecerá en el historial."
        >
          <div className="session-confirm">
            <p>
              ¿Confirmas el cambio de <strong>{item.origen}</strong>?
            </p>
            <label>Motivo *<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={255} required /></label>
            <p>También se anulará la nota vinculada. No se permite si hay pagos o atención que requieran devolución.</p>
            <footer>
              <button onClick={() => setChoice(null)}>Volver</button>
              <button
                className={choice === "CANCELADA" ? "danger" : "finish"}
                disabled={pending || reason.trim().length < 5}
                onClick={() =>
                  start(async () => {
                    const r = await changeAcquisition(
                      item.id_adquisicion,
                      choice,
                      reason,
                    );
                    setChoice(null);
                    setResult(r);
                  })
                }
              >
                Confirmar
              </button>
            </footer>
          </div>
        </Dialog>
      )}
      {result.resultId && (
        <SubmissionResultDialog
          state={result}
          onSuccess={() => setResult({})}
        />
      )}
    </>
  );
}
export function StockOperationDialog({
  type,
  options,
}: {
  type: "consumption" | "output";
  options: InventoryOperationOptions;
}) {
  const [open, setOpen] = useState(false);
  return <><button className="directory-primary" onClick={() => setOpen(true)}><PlusIcon />{type === "consumption" ? "Registrar consumo" : "Registrar salida"}</button>{open && <StockOperationForm type={type} options={options} close={() => setOpen(false)} />}</>;
}
function StockOperationForm({ type, options, close }: { type: "consumption" | "output"; options: InventoryOperationOptions; close: () => void }) {
  const [referenceId, setReferenceId] = useState("");
  const selectedDetail = options.saleDetails.find(item => item.id_detalle === Number(referenceId));
  const action = type === "consumption" ? createConsumption : createSaleOutput;
  const [state, formAction, pending] = useActionState(action, initial);
  const refs = type === "consumption" ? options.sessions : options.saleDetails;
  return (
    <>
        <Dialog
          close={close}
          title={
            type === "consumption" ? "Consumo por sesión" : "Salida por venta"
          }
          description={type === "consumption" ? "Registra lo realmente utilizado en una sesión en curso, en unidad base." : "Salida parcial en unidad base de una nota pagada. Para entrega completa automática usa Ventas → Notas → Entregar."}
        >
          <form action={formAction} className="session-form">
            <div className="session-grid">
              <label className="session-wide">
                <span>
                  {type === "consumption" ? "Sesión" : "Detalle vendido"} *
                </span>
                <select
                  name={type === "consumption" ? "id_sesion" : "id_detalle"}
                  value={referenceId}
                  onChange={e => setReferenceId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Seleccionar
                  </option>
                  {refs.map((r) => (
                    <option
                      key={
                        type === "consumption"
                          ? (r as InventoryOperationOptions["sessions"][number])
                              .id_sesion
                          : (
                              r as InventoryOperationOptions["saleDetails"][number]
                            ).id_detalle
                      }
                      value={
                        type === "consumption"
                          ? (r as InventoryOperationOptions["sessions"][number])
                              .id_sesion
                          : (
                              r as InventoryOperationOptions["saleDetails"][number]
                            ).id_detalle
                      }
                    >
                      {type === "consumption"
                        ? `${(r as InventoryOperationOptions["sessions"][number]).paciente} · ${(r as InventoryOperationOptions["sessions"][number]).servicio}`
                        : `${(r as InventoryOperationOptions["saleDetails"][number]).numero_nota} · ${(r as InventoryOperationOptions["saleDetails"][number]).producto} · pendiente ${(r as InventoryOperationOptions["saleDetails"][number]).pendiente}`}
                    </option>
                  ))}
                </select>
                <Error
                  state={state}
                  name={type === "consumption" ? "id_sesion" : "id_detalle"}
                />
              </label>
              <label className="session-wide">
                <span>Lote *</span>
                <select name="id_lote" key={referenceId} defaultValue="" required disabled={!referenceId}>
                  <option value="" disabled>
                    Seleccionar lote
                  </option>
                  {options.lots
                    .filter((l) => Number(l.stock_actual) > 0 && (type === "consumption" || l.id_producto === selectedDetail?.id_producto))
                    .map((l) => (
                      <option key={l.id_lote} value={l.id_lote}>
                        {l.producto} · {l.numero_lote || `#${l.id_lote}`} ·
                        stock {l.stock_actual} {l.unidad_medida}
                      </option>
                    ))}
                </select>
                <Error state={state} name="id_lote" />
              </label>
              <label>
                <span>Cantidad en unidad base *</span>
                <input
                  name="cantidad"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
                <Error state={state} name="cantidad" />
              </label>
              <label className="session-wide">
                <span>Observaciones</span>
                <textarea name="observaciones" rows={3} maxLength={255} />
              </label>
            </div>
            <footer>
              <button type="button" onClick={close}>
                Cancelar
              </button>
              <button className="directory-primary" disabled={pending}>
                {pending ? "Registrando..." : "Confirmar salida"}
              </button>
            </footer>
          </form>
          {state.resultId && (
            <SubmissionResultDialog
              state={state}
              onSuccess={close}
            />
          )}
        </Dialog>
    </>
  );
}
