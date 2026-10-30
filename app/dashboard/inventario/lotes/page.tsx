import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import { LotDialog } from "@/components/inventory-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryLots, getInventoryOptions } from "@/lib/inventory";
import type { LotStatus } from "@/lib/types";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../inventory.css";
export const metadata: Metadata = { title: "Lotes y existencias" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const states = ["DISPONIBLE", "AGOTADO", "VENCIDO", "BAJA"] as const;
const labels: Record<LotStatus, string> = {
  DISPONIBLE: "Disponible",
  AGOTADO: "Agotado",
  VENCIDO: "Vencido",
  BAJA: "Baja",
};
const columns = [
  { key: "product", label: "Producto" },
  { key: "lot", label: "Lote" },
  { key: "stock", label: "Existencia" },
  { key: "initial", label: "Cantidad inicial" },
  { key: "entry", label: "Ingreso" },
  { key: "expiry", label: "Vencimiento" },
  { key: "cost", label: "Costo unitario" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
const day = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-BO", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    : "Sin fecha";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Number(one(p.page)) || 1);
  const search = (one(p.search) || "").trim();
  const raw = one(p.estado)?.toUpperCase();
  const estado = states.includes(raw as LotStatus)
    ? (raw as LotStatus)
    : undefined;
  const [result, options, user] = await Promise.all([
    getInventoryLots({ page, limit: 10, search, estado }),
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
  const edit = user.permisos.includes("inventario.actualizar");
  const create = user.permisos.includes("inventario.crear");
  return (
    <section
      className="directory-page inventory-page"
      data-directory-scope="inventory-lots"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">INVENTARIO</span>
          <h1>Lotes y existencias</h1>
          <p>Controla ingresos, vencimientos y stock actual por lote.</p>
        </div>
        {create && <LotDialog options={options.value} />}
      </header>
      <DirectoryTableActions
        scope="inventory-lots"
        fileName="lotes-inventario"
        columns={columns}
        showActions={edit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/inventario/lotes">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="lot-search"
              initialValue={search}
              placeholder="Buscar producto o número de lote..."
              basePath="/dashboard/inventario/lotes"
            />
          </label>
          <InventoryFilter
            name="estado"
            value={estado}
            label="Estado"
            options={states.map((value) => ({ value, label: labels[value] }))}
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
                    {columns.map((c) =>
                      !edit && c.key === "actions" ? null : (
                        <th key={c.key} data-directory-column={c.key}>
                          {c.label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.value.data.map((item) => (
                    <tr key={item.id_lote}>
                      <td data-directory-column="product">
                        <strong>{item.producto}</strong>
                      </td>
                      <td data-directory-column="lot">
                        {item.numero_lote || `#${item.id_lote}`}
                      </td>
                      <td data-directory-column="stock">
                        <strong className="inventory-stock">
                          {Number(item.stock_actual).toLocaleString("es-BO")}{" "}
                          {item.unidad_medida}
                        </strong>
                      </td>
                      <td data-directory-column="initial">
                        {Number(item.cantidad_inicial).toLocaleString("es-BO")}
                      </td>
                      <td data-directory-column="entry">
                        {day(item.fecha_ingreso)}
                      </td>
                      <td data-directory-column="expiry">
                        {day(item.fecha_vencimiento)}
                      </td>
                      <td data-directory-column="cost">
                        {item.costo_unitario == null
                          ? "—"
                          : `Bs ${Number(item.costo_unitario).toFixed(2)}`}
                      </td>
                      <td data-directory-column="status">
                        <span
                          className={`promotion-status promotion-status--${item.estado === "DISPONIBLE" ? "activa" : item.estado === "AGOTADO" ? "finalizada" : "cancelada"}`}
                        >
                          <span />
                          {labels[item.estado]}
                        </span>
                      </td>
                      {edit && (
                        <td data-directory-column="actions">
                          <div className="session-actions">
                            <LotDialog item={item} options={options.value} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <InventoryPagination page={page} limit={result.value.limit} total={result.value.total} path="/dashboard/inventario/lotes" filters={{ search, estado }} />
        </>
      ) : (
        <Empty title="No encontramos lotes" />
      )}
    </section>
  );
}
function Empty({ title }: { title?: string }) {
  return (
    <div className="directory-message">
      <b>i</b>
      <div>
        <h2>{title || "No fue posible cargar los lotes"}</h2>
      </div>
    </div>
  );
}
