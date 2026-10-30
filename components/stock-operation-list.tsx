import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryPagination } from "@/components/inventory-pagination";
import { StockOperationDialog } from "@/components/remaining-dialogs";
import "@/components/commerce-workflow.css";
import type {
  InventoryOperationOptions,
  PaginatedResponse,
  StockOperation,
} from "@/lib/types";
const columns = [
  { key: "date", label: "Fecha" },
  { key: "reference", label: "Referencia" },
  { key: "product", label: "Producto" },
  { key: "lot", label: "Lote" },
  { key: "quantity", label: "Cantidad" },
  { key: "notes", label: "Observaciones" },
];
export function StockOperationList({
  title,
  description,
  type,
  path,
  search,
  page,
  result,
  options,
  canCreate,
}: {
  title: string;
  description: string;
  type: "consumption" | "output";
  path: string;
  search: string;
  page: number;
  result: PaginatedResponse<StockOperation>;
  options: InventoryOperationOptions;
  canCreate: boolean;
}) {
  return (
    <section
      className="directory-page inventory-page inventory-ledger-page"
      data-directory-scope={type}
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">INVENTARIO</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {canCreate && <StockOperationDialog type={type} options={options} />}
      </header>
      <DirectoryTableActions
        scope={type}
        fileName={type}
        columns={columns}
        showActions={false}
      />
      <div className="directory-toolbar">
        <form action={path}>
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id={`${type}-search`}
              initialValue={search}
              placeholder="Buscar producto o lote..."
              basePath={path}
            />
          </label>
        </form>
      </div>
      {result.data.length ? (
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
                  {result.data.map((item, index) => (
                    <tr key={item.id_consumo ?? item.id_salida ?? index}>
                      <td data-directory-column="date">
                        {new Intl.DateTimeFormat("es-BO", {
                          timeZone: "America/La_Paz",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.fecha_movimiento))}
                      </td>
                      <td data-directory-column="reference">
                        <strong>{item.referencia}</strong>
                      </td>
                      <td data-directory-column="product">{item.producto}</td>
                      <td data-directory-column="lot">
                        {item.numero_lote || "Sin número"}
                      </td>
                      <td data-directory-column="quantity">
                        <strong className="inventory-low">
                          −{Number(item.cantidad).toLocaleString("es-BO")}{" "}
                          {item.unidad_medida}
                        </strong>
                      </td>
                      <td data-directory-column="notes">
                        {item.observaciones || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <InventoryPagination
            page={page}
            limit={result.limit}
            total={result.total}
            path={path}
            filters={{ search }}
          />
        </>
      ) : (
        <div className="directory-message">
          <b>i</b>
          <div>
            <h2>No encontramos registros</h2>
          </div>
        </div>
      )}
    </section>
  );
}
