"use client";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BoxIcon, CloseIcon, EditIcon, PlusIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  createMovement,
  saveLot,
  saveProduct,
} from "@/app/dashboard/inventario/actions";
import type {
  InventoryLot,
  InventoryOptions,
  InventoryProduct,
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
      onClick={(event) => event.target === ref.current && close()}
    >
      <section>
        <header>
          <span>
            <BoxIcon />
          </span>
          <div>
            <b className="page-eyebrow">INVENTARIO</b>
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
function ProductForm({
  item,
  close,
}: {
  item?: InventoryProduct;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveProduct.bind(null, item?.id_producto ?? null),
    initial,
  );
  return (
    <>
      <form action={action} className="session-form">
        <div className="session-grid">
          <label>
            <span>Nombre *</span>
            <input
              name="nombre"
              defaultValue={item?.nombre ?? ""}
              maxLength={120}
              required
            />
            <Error state={state} name="nombre" />
          </label>
          <label>
            <span>Unidad de medida *</span>
            <input
              name="unidad_medida"
              defaultValue={item?.unidad_medida ?? ""}
              maxLength={30}
              placeholder="unidad, ml, g..."
              required
            />
            <Error state={state} name="unidad_medida" />
          </label>
          <label>
            <span>Stock mínimo *</span>
            <input
              name="stock_minimo"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item ? String(item.stock_minimo) : "0"}
              required
            />
            <Error state={state} name="stock_minimo" />
          </label>
          <label>
            <span>Estado</span>
            <select name="estado" defaultValue={item?.estado ?? "ACTIVO"}>
              <option value="ACTIVO">Activo</option>
              <option value="BAJA">Baja</option>
            </select>
          </label>
          <label className="session-wide">
            <span>URL de imagen</span>
            <input
              name="imagen_url"
              type="url"
              maxLength={500}
              defaultValue={item?.imagen_url ?? ""}
            />
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
                name="es_insumo"
                defaultChecked={item?.es_insumo ?? true}
              />
              <span>Es insumo para tratamientos</span>
            </label>
            <label>
              <input
                type="checkbox"
                name="es_vendible"
                defaultChecked={item?.es_vendible ?? false}
              />
              <span>Se puede vender</span>
            </label>
          </div>
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="directory-primary" disabled={pending}>
            {pending
              ? "Guardando..."
              : item
                ? "Guardar cambios"
                : "Crear producto"}
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
    </>
  );
}
export function ProductDialog({ item }: { item?: InventoryProduct }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {item ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Editar producto"
        >
          <EditIcon />
        </button>
      ) : (
        <button
          type="button"
          className="directory-primary"
          onClick={() => setOpen(true)}
        >
          <PlusIcon />
          Nuevo producto
        </button>
      )}
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title={item ? "Editar producto" : "Nuevo producto"}
          description="Registra únicamente la información disponible en el catálogo de inventario."
        >
          <ProductForm item={item} close={() => setOpen(false)} />
        </Dialog>
      )}
    </>
  );
}
function LotForm({
  item,
  options,
  close,
}: {
  item?: InventoryLot;
  options: InventoryOptions;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveLot.bind(null, item?.id_lote ?? null),
    initial,
  );
  return (
    <>
      <form action={action} className="session-form">
        <div className="session-grid">
          {!item && (
            <label>
              <span>Producto *</span>
              <select name="id_producto" defaultValue="" required>
                <option value="" disabled>
                  Seleccionar producto
                </option>
                {options.products.map((product) => (
                  <option key={product.id_producto} value={product.id_producto}>
                    {product.nombre} ({product.unidad_medida})
                  </option>
                ))}
              </select>
              <Error state={state} name="id_producto" />
            </label>
          )}
          <label>
            <span>Número de lote</span>
            <input
              name="numero_lote"
              maxLength={80}
              defaultValue={item?.numero_lote ?? ""}
            />
          </label>
          {!item && (
            <>
              <label>
                <span>Cantidad inicial *</span>
                <input
                  name="cantidad_inicial"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
                <Error state={state} name="cantidad_inicial" />
              </label>
              <label>
                <span>Fecha de ingreso *</span>
                <input name="fecha_ingreso" type="date" required />
                <Error state={state} name="fecha_ingreso" />
              </label>
            </>
          )}
          <label>
            <span>Fecha de vencimiento</span>
            <input
              name="fecha_vencimiento"
              type="date"
              defaultValue={item?.fecha_vencimiento ?? ""}
            />
          </label>
          <label>
            <span>Costo unitario</span>
            <input
              name="costo_unitario"
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                item?.costo_unitario == null ? "" : String(item.costo_unitario)
              }
            />
            <Error state={state} name="costo_unitario" />
          </label>
          <label>
            <span>Estado</span>
            <select name="estado" defaultValue={item?.estado ?? "DISPONIBLE"}>
              <option value="DISPONIBLE">Disponible</option>
              <option value="AGOTADO">Agotado</option>
              <option value="VENCIDO">Vencido</option>
              <option value="BAJA">Baja</option>
            </select>
          </label>
        </div>
        {item && (
          <p className="package-service-note">
            La cantidad inicial y el producto permanecen inmutables. Los cambios
            de stock se realizan mediante movimientos.
          </p>
        )}
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="directory-primary" disabled={pending}>
            {pending
              ? "Guardando..."
              : item
                ? "Guardar cambios"
                : "Registrar lote"}
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
    </>
  );
}
export function LotDialog({
  item,
  options,
}: {
  item?: InventoryLot;
  options: InventoryOptions;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {item ? (
        <button type="button" onClick={() => setOpen(true)} title="Editar lote">
          <EditIcon />
        </button>
      ) : (
        <button
          type="button"
          className="directory-primary"
          onClick={() => setOpen(true)}
        >
          <PlusIcon />
          Nuevo lote
        </button>
      )}
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title={item ? "Editar lote" : "Registrar lote"}
          description="El stock inicial generará automáticamente su primer movimiento."
        >
          <LotForm item={item} options={options} close={() => setOpen(false)} />
        </Dialog>
      )}
    </>
  );
}
export function MovementDialog({ options }: { options: InventoryOptions }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createMovement, initial);
  const [now] = useState(() =>
    new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  return (
    <>
      <button
        type="button"
        className="directory-primary"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Nuevo movimiento
      </button>
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title="Registrar movimiento"
          description="Registra entradas o salidas manuales; el sistema impedirá stock negativo."
        >
          <form action={action} className="session-form">
            <div className="session-grid">
              <label className="session-wide">
                <span>Lote *</span>
                <select name="id_lote" defaultValue="" required>
                  <option value="" disabled>
                    Seleccionar lote
                  </option>
                  {options.lots.map((lot) => (
                    <option key={lot.id_lote} value={lot.id_lote}>
                      {lot.producto} ·{" "}
                      {lot.numero_lote || `Lote #${lot.id_lote}`} · stock{" "}
                      {Number(lot.stock_actual).toLocaleString("es-BO")}{" "}
                      {lot.unidad_medida}
                    </option>
                  ))}
                </select>
                <Error state={state} name="id_lote" />
              </label>
              <label>
                <span>Tipo *</span>
                <select name="tipo" defaultValue="AJUSTE_ENTRADA">
                  <option value="ENTRADA_COMPRA">Entrada por compra</option>
                  <option value="AJUSTE_ENTRADA">Ajuste de entrada</option>
                  <option value="AJUSTE_SALIDA">Ajuste de salida</option>
                  <option value="MERMA">Merma</option>
                  <option value="VENCIMIENTO">Vencimiento</option>
                </select>
                <Error state={state} name="tipo" />
              </label>
              <label>
                <span>Cantidad *</span>
                <input
                  name="cantidad"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
                <Error state={state} name="cantidad" />
              </label>
              <label>
                <span>Fecha y hora *</span>
                <input
                  name="fecha_movimiento"
                  type="datetime-local"
                  defaultValue={now}
                  required
                />
                <Error state={state} name="fecha_movimiento" />
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
                {pending ? "Registrando..." : "Registrar movimiento"}
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
