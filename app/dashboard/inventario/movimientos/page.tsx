import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import { MovementDialog } from "@/components/inventory-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryMovements, getInventoryOptions } from "@/lib/inventory";
import type { InventoryMovementType } from "@/lib/types";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../inventory.css";
import "@/components/commerce-workflow.css";
import "../../promociones/promotions.css";
export const metadata: Metadata = { title: "Movimientos de inventario" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const types: InventoryMovementType[] = [
  "ENTRADA_COMPRA",
  "CONSUMO_SESION",
  "VENTA",
  "AJUSTE_ENTRADA",
  "AJUSTE_SALIDA",
  "MERMA",
  "VENCIMIENTO",
];
const names: Record<InventoryMovementType, string> = {
  ENTRADA_COMPRA: "Entrada por compra",
  CONSUMO_SESION: "Consumo en sesión",
  VENTA: "Salida por venta",
  AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SALIDA: "Ajuste de salida",
  MERMA: "Merma",
  VENCIMIENTO: "Vencimiento",
};
const outgoing = new Set([
  "CONSUMO_SESION",
  "VENTA",
  "AJUSTE_SALIDA",
  "MERMA",
  "VENCIMIENTO",
]);
const columns = [
  { key: "date", label: "Fecha" },
  { key: "product", label: "Producto" },
  { key: "lot", label: "Lote" },
  { key: "type", label: "Tipo" },
  { key: "quantity", label: "Cantidad" },
  { key: "user", label: "Registrado por" },
  { key: "notes", label: "Observaciones" },
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Number(one(p.page)) || 1);
  const search = (one(p.search) || "").trim();
  const raw = one(p.tipo)?.toUpperCase();
  const tipo = types.includes(raw as InventoryMovementType)
    ? (raw as InventoryMovementType)
    : undefined;
  const [result, options, user] = await Promise.all([
    getInventoryMovements({ page, limit: 15, search, tipo }),
    getInventoryOptions(),
    getCurrentUser(),
  ]);
  if (
    (!result.ok && result.status === 401) ||
    (!options.ok && options.status === 401)
  )
    redirect("/login");
  if (!user?.permisos.includes("inventario.leer"))
    return <Empty title="Acceso restringido" />;
  if (!result.ok || !options.ok)
    return <Empty title={!result.ok ? result.message : options.message} />;
  const create = user.permisos.includes("inventario.crear");
  return (
    <section
      className="directory-page inventory-page"
      data-directory-scope="inventory-movements"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">INVENTARIO</span>
          <h1>Movimientos</h1>
          <p>Kardex de entradas y salidas que modifican las existencias.</p>
        </div>
        {create && <MovementDialog options={options.value} />}
      </header>
      <DirectoryTableActions
        scope="inventory-movements"
        fileName="movimientos-inventario"
        columns={columns}
        showActions={false}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/inventario/movimientos">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="movement-search"
              initialValue={search}
              placeholder="Buscar producto, lote u observación..."
              basePath="/dashboard/inventario/movimientos"
            />
          </label>
          <InventoryFilter
            name="tipo"
            value={tipo}
            label="Tipo"
            options={types.map((value) => ({ value, label: names[value] }))}
          />
        </form>
      </div>
      {result.value.data.length ? (
        <>
          <div className="directory-table-card inventory-table">
            <div className="directory-table-scroll">
              <table className="directory-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} data-directory-column={c.key}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.value.data.map((item) => {
                    const isOut = outgoing.has(item.tipo);
                    return (
                      <tr key={item.id_movimiento}>
                        <td data-directory-column="date">
                          {new Intl.DateTimeFormat("es-BO", {
                            timeZone: "America/La_Paz",
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(item.fecha_movimiento))}
                        </td>
                        <td data-directory-column="product">
                          <strong>{item.producto}</strong>
                        </td>
                        <td data-directory-column="lot">
                          {item.numero_lote || `#${item.id_lote}`}
                        </td>
                        <td data-directory-column="type">
                          <span
                            className={`movement-type ${isOut ? "movement-type--out" : ""}`}
                          >
                            {names[item.tipo]}
                          </span>
                        </td>
                        <td data-directory-column="quantity">
                          <strong
                            className={
                              isOut ? "inventory-low" : "inventory-stock"
                            }
                          >
                            {isOut ? "−" : "+"}
                            {Number(item.cantidad).toLocaleString("es-BO")}{" "}
                            {item.unidad_medida}
                          </strong>
                        </td>
                        <td data-directory-column="user">
                          {item.registrado_por_nombre}
                        </td>
                        <td data-directory-column="notes">
                          {item.observaciones || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <InventoryPagination page={page} limit={result.value.limit} total={result.value.total} path="/dashboard/inventario/movimientos" filters={{ search, tipo }} />
        </>
      ) : (
        <Empty title="No encontramos movimientos" />
      )}
    </section>
  );
}
function Empty({ title }: { title?: string }) {
  return (
    <div className="directory-message">
      <b>i</b>
      <div>
        <h2>{title || "No fue posible cargar los movimientos"}</h2>
      </div>
    </div>
  );
}
