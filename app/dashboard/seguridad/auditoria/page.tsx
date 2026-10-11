import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryPagination } from "@/components/inventory-pagination";
import { getCurrentUser } from "@/lib/auth";
import { getAudit } from "@/lib/security";
import "../../people.css";
import "../../inventario/inventory.css";
import "../security.css";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const columns = [
  { key: "date", label: "Fecha" },
  { key: "user", label: "Usuario" },
  { key: "action", label: "Acción" },
  { key: "entity", label: "Entidad" },
  { key: "record", label: "Registro" },
  { key: "affected", label: "Usuario afectado" },
  { key: "ip", label: "IP" },
  { key: "description", label: "Descripción" },
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    page = Math.max(1, Number(one(p.page)) || 1),
    search = (one(p.search) || "").trim();
  const [result, user] = await Promise.all([
    getAudit({ page, limit: 20, search }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!result.ok || !user?.permisos.includes("auditoria.leer")) return null;
  return (
    <section
      className="directory-page security-page"
      data-directory-scope="audit"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">SEGURIDAD</span>
          <h1>Auditoría del sistema</h1>
          <p>
            Registro inmutable de acciones relevantes realizadas por los
            usuarios.
          </p>
        </div>
      </header>
      <DirectoryTableActions
        scope="audit"
        fileName="auditoria"
        columns={columns}
        showActions={false}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/seguridad/auditoria">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="audit-search"
              initialValue={search}
              placeholder="Buscar acción, entidad, usuario..."
              basePath="/dashboard/seguridad/auditoria"
            />
          </label>
        </form>
      </div>
      <div className="directory-table-card security-table">
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
              {result.value.data.map((x) => (
                <tr key={x.id_auditoria}>
                  <td data-directory-column="date">
                    {new Intl.DateTimeFormat("es-BO", {
                      timeZone: "America/La_Paz",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(x.fecha))}
                  </td>
                  <td data-directory-column="user">
                    <strong>{x.usuario_accion}</strong>
                  </td>
                  <td data-directory-column="action">
                    <span className="security-code">{x.accion}</span>
                  </td>
                  <td data-directory-column="entity">{x.entidad}</td>
                  <td data-directory-column="record">{x.id_registro || "—"}</td>
                  <td data-directory-column="affected">{x.usuario_afectado}</td>
                  <td data-directory-column="ip">{x.ip || "—"}</td>
                  <td data-directory-column="description">
                    {x.descripcion || "—"}
                  </td>
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
        path="/dashboard/seguridad/auditoria"
        filters={{ search }}
      />
    </section>
  );
}
