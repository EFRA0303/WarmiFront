import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import { NewPaymentDialog, PaymentAction } from "@/components/sales-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getPayments, getSalesOptions } from "@/lib/sales";
import type { PaymentMethod, PaymentStatus } from "@/lib/types";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../../inventario/inventory.css";
import "../../promociones/promotions.css";
import "../sales.css";
import "@/components/commerce-workflow.css";
export const metadata: Metadata = { title: "Pagos" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const statuses: PaymentStatus[] = ["REGISTRADO", "ANULADO"];
const methods: PaymentMethod[] = [
  "EFECTIVO",
  "QR",
  "TRANSFERENCIA",
  "TARJETA",
  "OTRO",
];
const columns = [
  { key: "payment", label: "Pago" },
  { key: "note", label: "Nota" },
  { key: "patient", label: "Paciente" },
  { key: "method", label: "Método" },
  { key: "amount", label: "Monto" },
  { key: "date", label: "Fecha" },
  { key: "user", label: "Registrado por" },
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
  const rs = one(p.estado)?.toUpperCase(),
    rt = one(p.tipo)?.toUpperCase();
  const estado = statuses.includes(rs as PaymentStatus)
    ? (rs as PaymentStatus)
    : undefined;
  const tipo = methods.includes(rt as PaymentMethod)
    ? (rt as PaymentMethod)
    : undefined;
  const [result, options, user] = await Promise.all([
    getPayments({ page, limit: 15, search, estado, tipo }),
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
      data-directory-scope="payments"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">VENTAS</span>
          <h1>Pagos</h1>
          <p>Registra abonos parciales o totales y conserva las anulaciones.</p>
        </div>
        {create && <NewPaymentDialog options={options.value} />}
      </header>
      <DirectoryTableActions
        scope="payments"
        fileName="pagos"
        columns={columns}
        showActions={edit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/ventas/pagos">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="payment-search"
              initialValue={search}
              placeholder="Buscar nota, paciente u observación..."
              basePath="/dashboard/ventas/pagos"
            />
          </label>
          <InventoryFilter
            name="tipo"
            value={tipo}
            label="Método"
            options={methods.map((value) => ({
              value,
              label: value.replace("_", " "),
            }))}
          />
          <InventoryFilter
            name="estado"
            value={estado}
            label="Estado"
            options={statuses.map((value) => ({
              value,
              label: value === "REGISTRADO" ? "Registrados" : "Anulados",
            }))}
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
                    <tr key={item.id_pago}>
                      <td data-directory-column="payment">#{item.id_pago}</td>
                      <td data-directory-column="note">
                        <strong>{item.numero_nota}</strong>
                      </td>
                      <td data-directory-column="patient">{item.paciente}</td>
                      <td data-directory-column="method">
                        <span className="movement-type">
                          {item.metodo_pago}
                        </span>
                      </td>
                      <td data-directory-column="amount">
                        <strong className="inventory-stock">
                          Bs {Number(item.monto).toFixed(2)}
                        </strong>
                      </td>
                      <td data-directory-column="date">
                        {new Intl.DateTimeFormat("es-BO", {
                          timeZone: "America/La_Paz",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.fecha_pago))}
                      </td>
                      <td data-directory-column="user">
                        {item.registrado_por_nombre}
                      </td>
                      <td data-directory-column="status">
                        <span
                          className={`promotion-status promotion-status--${item.estado === "REGISTRADO" ? "activa" : "cancelada"}`}
                        >
                          <span />
                          {item.estado === "REGISTRADO"
                            ? "Registrado"
                            : "Anulado"}
                        </span>
                      </td>
                      {edit && (
                        <td data-directory-column="actions">
                          <PaymentAction item={item} />
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
            path="/dashboard/ventas/pagos"
            filters={{ search, estado, tipo }}
          />
        </>
      ) : (
        <Empty title="No encontramos pagos" />
      )}
    </section>
  );
}
function Empty({ title }: { title?: string }) {
  return (
    <div className="directory-message">
      <b>i</b>
      <div>
        <h2>{title || "No fue posible cargar los pagos"}</h2>
      </div>
    </div>
  );
}
