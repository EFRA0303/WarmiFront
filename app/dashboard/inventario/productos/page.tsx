import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { GeneralStatusFilter } from "@/components/directory-controls";
import { ProductDialog } from "@/components/inventory-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryProducts } from "@/lib/inventory";
import type { GeneralStatus } from "@/lib/types";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../inventory.css";
export const metadata: Metadata = { title: "Productos" };
const size = 10;
const valid = new Set(["ACTIVO", "BAJA"]);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const columns = [
  { key: "product", label: "Producto" },
  { key: "unit", label: "Unidad" },
  { key: "kind", label: "Uso" },
  { key: "stock", label: "Stock actual" },
  { key: "minimum", label: "Stock mínimo" },
  { key: "lots", label: "Lotes" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Number(one(p.page)) || 1);
  const search = (one(p.search) || "").trim();
  const raw = one(p.estado)?.toUpperCase();
  const estado = raw && valid.has(raw) ? (raw as GeneralStatus) : undefined;
  const [result, user] = await Promise.all([
    getInventoryProducts({ page, limit: size, search, estado }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!user?.permisos.includes("inventario.leer"))
    return <Empty title="Acceso restringido" />;
  if (!result.ok) return <Empty title={result.message} />;
  const edit = user.permisos.includes("inventario.actualizar");
  const create = user.permisos.includes("inventario.crear");
  const pages = Math.max(1, Math.ceil(result.value.total / result.value.limit));
  return (
    <section
      className="directory-page inventory-page"
      data-directory-scope="inventory-products"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">INVENTARIO</span>
          <h1>Productos</h1>
          <p>Catálogo de insumos y artículos disponibles para venta.</p>
        </div>
        {create && <ProductDialog />}
      </header>
      <DirectoryTableActions
        scope="inventory-products"
        fileName="productos-inventario"
        columns={columns}
        showActions={edit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/inventario/productos">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="product-search"
              initialValue={search}
              placeholder="Buscar nombre, descripción o unidad..."
              basePath="/dashboard/inventario/productos"
            />
          </label>
          <GeneralStatusFilter initialValue={estado} />
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
                  {result.value.data.map((item) => {
                    const low =
                      Number(item.stock_actual) <= Number(item.stock_minimo);
                    return (
                      <tr key={item.id_producto}>
                        <td data-directory-column="product">
                          <div className="directory-stacked">
                            <strong>{item.nombre}</strong>
                            <small>
                              {item.descripcion ||
                                `Producto #${item.id_producto}`}
                            </small>
                          </div>
                        </td>
                        <td data-directory-column="unit">
                          {item.unidad_medida}
                        </td>
                        <td data-directory-column="kind">
                          <div className="inventory-kinds">
                            {item.es_insumo && <span>Insumo</span>}
                            {item.es_vendible && <span>Vendible</span>}
                          </div>
                        </td>
                        <td data-directory-column="stock">
                          <strong
                            className={`inventory-stock ${low ? "inventory-low" : ""}`}
                          >
                            {Number(item.stock_actual).toLocaleString("es-BO")}{" "}
                            {item.unidad_medida}
                          </strong>
                        </td>
                        <td data-directory-column="minimum">
                          {Number(item.stock_minimo).toLocaleString("es-BO")}{" "}
                          {item.unidad_medida}
                        </td>
                        <td data-directory-column="lots">{item.lotes}</td>
                        <td data-directory-column="status">
                          <span
                            className={`directory-status directory-status--${item.estado.toLowerCase()}`}
                          >
                            <span />
                            {item.estado === "ACTIVO" ? "Activo" : "Baja"}
                          </span>
                        </td>
                        {edit && (
                          <td data-directory-column="actions">
                            <div className="session-actions">
                              <ProductDialog item={item} />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pager
            page={page}
            pages={pages}
            total={result.value.total}
            path="/dashboard/inventario/productos"
            search={search}
            estado={estado}
          />
        </>
      ) : (
        <Empty title="No encontramos productos" />
      )}
    </section>
  );
}
function Pager({
  page,
  pages,
  total,
  path,
  search,
  estado,
}: {
  page: number;
  pages: number;
  total: number;
  path: string;
  search: string;
  estado?: string;
}) {
  const href = (next: number) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (estado) q.set("estado", estado);
    if (next > 1) q.set("page", String(next));
    return q.size ? `${path}?${q}` : path;
  };
  return (
    <footer className="directory-footer">
      <p>
        Total: <strong>{total}</strong>
      </p>
      {pages > 1 && (
        <nav>
          <Link className={page <= 1 ? "disabled" : ""} href={href(page - 1)}>
            <ChevronLeftIcon />
          </Link>
          <span>
            Página {page} de {pages}
          </span>
          <Link
            className={page >= pages ? "disabled" : ""}
            href={href(page + 1)}
          >
            <ChevronRightIcon />
          </Link>
        </nav>
      )}
    </footer>
  );
}
function Empty({ title }: { title: string }) {
  return (
    <div className="directory-message">
      <b>i</b>
      <div>
        <h2>{title}</h2>
      </div>
    </div>
  );
}
