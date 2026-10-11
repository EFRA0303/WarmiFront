import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import {
  AcquisitionActions,
  AcquisitionDialog,
} from "@/components/remaining-dialogs";
import { getCurrentUser } from "@/lib/auth";
import {
  getAcquisitionOptions,
  getAcquisitions,
} from "@/lib/remaining-modules";
import type { AcquisitionStatus } from "@/lib/types";
import "../people.css";
import "../sesiones/sessions.css";
import "../inventario/inventory.css";
import "../promociones/promotions.css";
import "../operaciones/operations.css";
export const metadata: Metadata = { title: "Adquisiciones de pacientes" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const statuses: AcquisitionStatus[] = ["ACTIVA", "COMPLETADA", "CANCELADA"];
const names = {
  ACTIVA: "Activa",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};
const columns = [
  { key: "patient", label: "Paciente" },
  { key: "origin", label: "Paquete o promoción" },
  { key: "date", label: "Fecha" },
  { key: "sessions", label: "Sesiones" },
  { key: "total", label: "Total" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    page = Math.max(1, Number(one(p.page)) || 1),
    search = (one(p.search) || "").trim(),
    raw = one(p.estado)?.toUpperCase(),
    estado = statuses.includes(raw as AcquisitionStatus)
      ? (raw as AcquisitionStatus)
      : undefined;
  const [result, options, user] = await Promise.all([
    getAcquisitions({ page, limit: 10, search, estado }),
    getAcquisitionOptions(),
    getCurrentUser(),
  ]);
  if (
    (!result.ok && result.status === 401) ||
    (!options.ok && options.status === 401)
  )
    redirect("/login");
  if (!user?.permisos.includes("adquisiciones.leer"))
    return <Empty title="Acceso restringido" />;
  if (!result.ok) return <Empty title={result.message} />;
  if (!options.ok) return <Empty title={options.message} />;
  const create = user.permisos.includes("adquisiciones.crear"),
    edit = user.permisos.includes("adquisiciones.actualizar");
  return (
    <section
      className="directory-page sales-page"
      data-directory-scope="acquisitions"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">PAQUETES Y PROMOCIONES</span>
          <h1>Adquisiciones de pacientes</h1>
          <p>Asigna beneficios y consulta el uso de sus sesiones.</p>
        </div>
        {create && <AcquisitionDialog options={options.value} />}
      </header>
      <DirectoryTableActions
        scope="acquisitions"
        fileName="adquisiciones"
        columns={columns}
        showActions={edit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/adquisiciones">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="acquisition-search"
              initialValue={search}
              placeholder="Buscar paciente, CI u oferta..."
              basePath="/dashboard/adquisiciones"
            />
          </label>
          <InventoryFilter
            name="estado"
            value={estado}
            label="Estado"
            options={statuses.map((v) => ({ value: v, label: names[v] }))}
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
                  {result.value.data.map((item) => {
                    const percent = item.sesiones_incluidas
                      ? Math.min(
                          100,
                          (item.sesiones_realizadas / item.sesiones_incluidas) *
                            100,
                        )
                      : 0;
                    return (
                      <tr key={item.id_adquisicion}>
                        <td data-directory-column="patient">
                          <div className="directory-stacked">
                            <strong>{item.paciente}</strong>
                            <small>
                              {item.ci
                                ? `CI ${item.ci}`
                                : `Paciente #${item.id_paciente}`}
                            </small>
                          </div>
                        </td>
                        <td data-directory-column="origin">
                          <div className="directory-stacked">
                            <strong>{item.origen}</strong>
                            <small>
                              {item.detalles.map((d) => d.servicio).join(", ")}
                            </small>
                          </div>
                        </td>
                        <td data-directory-column="date">
                          {new Intl.DateTimeFormat("es-BO", {
                            timeZone: "America/La_Paz",
                            dateStyle: "medium",
                          }).format(new Date(item.fecha_adquisicion))}
                        </td>
                        <td data-directory-column="sessions">
                          <div className="acquisition-progress">
                            <div>
                              <i style={{ width: `${percent}%` }} />
                            </div>
                            <small>
                              {item.sesiones_realizadas} realizadas ·{" "}
                              {item.sesiones_asignadas} asignadas ·{" "}
                              {item.sesiones_incluidas} incluidas
                            </small>
                          </div>
                        </td>
                        <td data-directory-column="total">
                          <strong>Bs {Number(item.total).toFixed(2)}</strong>
                        </td>
                        <td data-directory-column="status">
                          <span
                            className={`promotion-status promotion-status--${item.estado === "ACTIVA" ? "activa" : item.estado === "COMPLETADA" ? "finalizada" : "cancelada"}`}
                          >
                            <span />
                            {names[item.estado]}
                          </span>
                        </td>
                        {edit && (
                          <td data-directory-column="actions">
                            <AcquisitionActions item={item} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <InventoryPagination
            page={page}
            limit={result.value.limit}
            total={result.value.total}
            path="/dashboard/adquisiciones"
            filters={{ search, estado }}
          />
        </>
      ) : (
        <Empty title="No encontramos adquisiciones" />
      )}
    </section>
  );
}
function Empty({ title }: { title?: string }) {
  return (
    <div className="directory-message">
      <b>i</b>
      <div>
        <h2>{title || "No fue posible cargar las adquisiciones"}</h2>
      </div>
    </div>
  );
}
