"use client";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { BoxIcon, CloseIcon, EditIcon, PlusIcon, UploadIcon } from "@/components/icons";
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
  ProductCategory,
  RegistrationState,
} from "@/lib/types";
const initial: RegistrationState = {};
const productUnits = [
  ["UNIDAD", "Unidad"], ["G", "Gramo (g)"], ["KG", "Kilogramo (kg)"],
  ["ML", "Mililitro (ml)"], ["L", "Litro (l)"], ["CM", "Centímetro (cm)"],
  ["M", "Metro (m)"], ["PAR", "Par"], ["PAQUETE", "Paquete"],
] as const;
const presentations = ["Unidad", "Frasco", "Pote", "Tubo", "Caja", "Bolsa", "Paquete", "Rollo", "Kit"];
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
function ProductImageField({ item, state }: { item?: InventoryProduct; state: RegistrationState }) {
  const [preview, setPreview] = useState<string>();
  const [clientError, setClientError] = useState("");
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const source = preview || (item?.imagen_url ? `/api/inventory/products/${item.id_producto}/image` : undefined);
  return (
    <label className="inventory-product-image session-wide">
      <span>Imagen del producto</span>
      <div className="inventory-product-image__content">
        <span className="inventory-product-image__preview">
          {source ? <Image src={source} alt={`Vista previa de ${item?.nombre ?? "producto"}`} width={116} height={116} unoptimized /> : <BoxIcon />}
        </span>
        <span className="inventory-product-image__copy">
          <strong>{source ? "Cambiar imagen" : "Seleccionar imagen"}</strong>
          <small>JPG, JPEG, PNG o WEBP · Máximo 5 MB.</small>
          <em>Se convertirá automáticamente a WebP al guardar.</em>
          <span><UploadIcon />{source ? "Elegir otra imagen" : "Elegir imagen"}</span>
        </span>
      </div>
      <input
        name="imagen"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          setClientError("");
          if (preview) URL.revokeObjectURL(preview);
          if (!file) return setPreview(undefined);
          if (file.size > 5 * 1024 * 1024) {
            event.currentTarget.value = "";
            setPreview(undefined);
            return setClientError("La imagen no puede superar los 5 MB.");
          }
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            event.currentTarget.value = "";
            setPreview(undefined);
            return setClientError("Usa una imagen JPG, JPEG, PNG o WEBP.");
          }
          setPreview(URL.createObjectURL(file));
        }}
      />
      {(clientError || state.fieldErrors?.imagen) && <small className="session-error">{clientError || state.fieldErrors?.imagen}</small>}
    </label>
  );
}
function ProductForm({
  item,
  categories,
  close,
}: {
  item?: InventoryProduct;
  categories: ProductCategory[];
  close: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveProduct.bind(null, item?.id_producto ?? null),
    initial,
  );
  const [isSupply, setIsSupply] = useState(item?.es_insumo ?? true);
  const [isSellable, setIsSellable] = useState(item?.es_vendible ?? false);
  const availableCategories = categories.filter((category) => category.estado === "ACTIVO" || category.id_categoria_producto === item?.id_categoria_producto);
  const hasLegacyUnit = Boolean(item?.unidad_medida && !productUnits.some(([value]) => value === item.unidad_medida));
  const hasLegacyPresentation = Boolean(item?.presentacion && !presentations.includes(item.presentacion));
  return (
    <>
      <form action={action} className="session-form">
        <div className="session-grid inventory-product-form">
          <h3 className="session-wide">Identificación del producto</h3>
          <ProductImageField item={item} state={state} />
          <label>
            <span>Categoría *</span>
            <select name="id_categoria_producto" defaultValue={item?.id_categoria_producto ?? ""} required>
              <option value="">Seleccionar categoría</option>
              {availableCategories.map((category) => <option key={category.id_categoria_producto} value={category.id_categoria_producto}>{category.nombre}</option>)}
            </select>
            <Error state={state} name="id_categoria_producto" />
          </label>
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
            <span>Marca</span>
            <input name="marca" defaultValue={item?.marca ?? ""} maxLength={100} placeholder="Ej. Nivea, Warmi, Genérico" />
          </label>
          <label>
            <span>SKU / código interno</span>
            <input name="sku" defaultValue={item?.sku ?? ""} maxLength={80} placeholder="Ej. CRE-HID-100" />
          </label>
          <label>
            <span>Código de barras</span>
            <input name="codigo_barras" defaultValue={item?.codigo_barras ?? ""} maxLength={80} inputMode="numeric" placeholder="Escanea o escribe el código" />
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
          <h3 className="session-wide">Presentación y control de stock</h3>
          <label>
            <span>Tipo de empaque *</span>
            <select name="presentacion" defaultValue={item?.presentacion ?? "Unidad"} required>
              {hasLegacyPresentation && <option value={item!.presentacion}>{item!.presentacion}</option>}
              {presentations.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <small className="inventory-field-help">Cómo viene el producto. Ej. frasco, pote, tubo o caja.</small>
          </label>
          <div className="inventory-content-field">
            <span>Contenido por presentación *</span>
            <div className="inventory-content-field__row">
              <input name="contenido_presentacion" aria-label="Contenido por presentación" type="number" inputMode="numeric" min="1" step="1" defaultValue={item ? String(Math.round(Number(item.contenido_presentacion))) : "1"} required />
              <select name="unidad_medida" aria-label="Unidad del contenido" defaultValue={item?.unidad_medida ?? "UNIDAD"} required>
                {hasLegacyUnit && <option value={item!.unidad_medida}>{item!.unidad_medida} (valor anterior)</option>}
                {productUnits.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <small className="inventory-field-help">Número entero y su unidad. Ej. un frasco de 100 ml: 100 y Mililitro. El stock se controla y descuenta en esta unidad.</small>
            <Error state={state} name="contenido_presentacion" />
            <Error state={state} name="unidad_medida" />
          </div>
          <label>
            <span>Stock mínimo *</span>
            <input name="stock_minimo" type="number" inputMode="numeric" min="0" step="1" defaultValue={item ? String(Math.round(Number(item.stock_minimo))) : "0"} required />
            <small className="inventory-field-help">Número entero. Solo genera una alerta; el stock se carga desde lotes.</small>
            <Error state={state} name="stock_minimo" />
          </label>
          <h3 className="session-wide">Uso y venta</h3>
          <div className="inventory-checks session-wide">
            <label>
              <input
                type="checkbox"
                name="es_insumo"
                checked={isSupply}
                onChange={(event) => setIsSupply(event.target.checked)}
              />
              <span><strong>Insumo para tratamientos</strong><small>Puede registrarse como consumo durante una sesión.</small></span>
            </label>
            <label>
              <input
                type="checkbox"
                name="es_vendible"
                checked={isSellable}
                onChange={(event) => setIsSellable(event.target.checked)}
              />
              <span><strong>Producto para venta</strong><small>Puede incluirse en una nota de venta.</small></span>
            </label>
          </div>
          <Error state={state} name="es_insumo" />
          {isSellable && <label>
            <span>Precio por presentación (Bs) *</span>
            <input name="precio_venta" type="number" min="0" step="0.01" defaultValue={item?.precio_venta ?? ""} required />
            <Error state={state} name="precio_venta" />
          </label>}
          {item && <label>
            <span>Estado</span>
            <select name="estado" defaultValue={item.estado}><option value="ACTIVO">Activo</option><option value="BAJA">Baja</option></select>
          </label>}
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="directory-primary" disabled={pending || availableCategories.length === 0}>
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
export function ProductDialog({ item, categories, emptyState = false }: { item?: InventoryProduct; categories: ProductCategory[]; emptyState?: boolean }) {
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
          {emptyState ? "Registrar primer producto" : "Nuevo producto"}
        </button>
      )}
      {open && (
        <Dialog
          close={() => setOpen(false)}
          title={item ? "Editar producto" : "Nuevo producto"}
          description="Define su identidad, presentación y uso. Las existencias se administran desde lotes."
        >
          <ProductForm item={item} categories={categories} close={() => setOpen(false)} />
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
  const [operationKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState(
    saveLot.bind(null, item?.id_lote ?? null),
    initial,
  );
  return (
    <>
      <form action={action} className="session-form">
        {!item && <input type="hidden" name="clave_operacion" value={operationKey} />}
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
                <span>Cantidad inicial en unidad base *</span>
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
  return <><button type="button" className="directory-primary" onClick={() => setOpen(true)}><PlusIcon />Nuevo movimiento</button>{open && <MovementForm options={options} close={() => setOpen(false)} />}</>;
}
function MovementForm({ options, close }: { options: InventoryOptions; close: () => void }) {
  const [operationKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState(createMovement, initial);
  const [now] = useState(() =>
    new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  return (
    <>
        <Dialog
          close={close}
          title="Registrar movimiento"
          description="Registra entradas o salidas manuales; el sistema impedirá stock negativo."
        >
          <form action={action} className="session-form">
            <input type="hidden" name="clave_operacion" value={operationKey} />
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
                <span>Motivo o referencia *</span>
                <textarea name="observaciones" rows={3} minLength={5} maxLength={255} required />
                <Error state={state} name="observaciones" />
              </label>
            </div>
            <footer>
              <button type="button" onClick={close}>
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
              onSuccess={close}
            />
          )}
        </Dialog>
    </>
  );
}
