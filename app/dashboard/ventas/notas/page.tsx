import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import { NewSaleDialog, SaleNoteAction } from "@/components/sales-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getSaleNotes, getSalesOptions } from "@/lib/sales";
import type { SaleNoteStatus } from "@/lib/types";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../../inventario/inventory.css";
import "../../promociones/promotions.css";
import "../sales.css";
export const metadata: Metadata = { title: "Notas de venta" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const statuses: SaleNoteStatus[] = ["EMITIDA", "ANULADA"];
const labels = { EMITIDA: "Emitida", ANULADA: "Anulada" };
const columns = [
  { key: "note", label: "Nota" },
  { key: "patient", label: "Paciente" },
  { key: "date", label: "Emisión" },
  { key: "items", label: "Conceptos" },
  { key: "total", label: "Total" },
  { key: "paid", label: "Pagado" },
  { key: "balance", label: "Saldo" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
const cash = (v: string | number) => `Bs ${Number(v).toFixed(2)}`;
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Number(one(p.page)) || 1);
  const search = (one(p.search) || "").trim();
  const raw = one(p.estado)?.toUpperCase();
  const estado = statuses.includes(raw as SaleNoteStatus)
    ? (raw as SaleNoteStatus)
    : undefined;
  const [result, options, user] = await Promise.all([
    getSaleNotes({ page, limit: 10, search, estado }),
    getSalesOptions(),
    getCurrentUser(),
  ]);
  if (
    (!result.ok && result.status === 401) ||
    (!options.ok && options.status === 401)
  )
    redirect("/login");
  if (!user?.permisos.includes("ventas.leer"))
    return <Empty title="Acceso restringido" />;
  if (!result.ok) return <Empty title={result.message} />;
  if (!options.ok) return <Empty title={options.message} />;
  const create = user.permisos.includes("ventas.crear"),
    edit = user.permisos.includes("ventas.actualizar");
  return (
    <section
      className="directory-page sales-page"
      data-directory-scope="sale-notes"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">VENTAS</span>
          <h1>Notas de venta</h1>
          <p>
            Emite ventas de servicios, productos o paquetes y controla sus
            saldos.
          </p>
        </div>
        {create && <NewSaleDialog options={options.value} />}
      </header>
      <DirectoryTableActions
        scope="sale-notes"
        fileName="notas-venta"
        columns={columns}
        showActions={edit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/ventas/notas">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="note-search"
              initialValue={search}
              placeholder="Buscar número, paciente u observación..."
              basePath="/dashboard/ventas/notas"
            />
          </label>
          <InventoryFilter
            name="estado"
            value={estado}
            label="Estado"
            options={statuses.map((value) => ({ value, label: labels[value] }))}
          />
        </form>
      </div>
      {result.value.data.length ? (
        <>
          <div className="directory-table-card sales-table">
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
                    <tr key={item.id_nota_venta}>
                      <td data-directory-column="note">
                        <strong>{item.numero_nota}</strong>
                      </td>
                      <td data-directory-column="patient">{item.paciente}</td>
                      <td data-directory-column="date">
                        {new Intl.DateTimeFormat("es-BO", {
                          timeZone: "America/La_Paz",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.fecha_emision))}
                      </td>
                      <td data-directory-column="items">{item.detalles}</td>
                      <td data-directory-column="total">
                        <strong>{cash(item.total)}</strong>
                      </td>
                      <td data-directory-column="paid">{cash(item.pagado)}</td>
                      <td data-directory-column="balance">
                        <div className="sale-balance">
                          <strong>{cash(item.saldo)}</strong>
                          <small>
                            {Number(item.saldo) <= 0 ? "Pagada" : "Pendiente"}
                          </small>
                        </div>
                      </td>
                      <td data-directory-column="status">
                        <span
                          className={`promotion-status promotion-status--${item.estado === "EMITIDA" ? "activa" : "cancelada"}`}
                        >
                          <span />
                          {labels[item.estado]}
                        </span>
                      </td>
                      {edit && (
                        <td data-directory-column="actions">
                          <SaleNoteAction item={item} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <InventoryPagination
            page={page}
            limit={result.value.limit}
            total={result.value.total}
            path="/dashboard/ventas/notas"
            filters={{ search, estado }}
          />
        </>
      ) : (
        <Empty title="No encontramos notas de venta" />
      )}
    </section>
  );
}
function Empty({ title }: { title?: string }) {
  return (
    <div className="directory-message">
      <b>i</b>
      <div>
        <h2>{title || "No fue posible cargar las notas"}</h2>
      </div>
    </div>
  );
}
