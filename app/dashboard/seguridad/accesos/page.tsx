import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import { getCurrentUser } from "@/lib/auth";
import { getAccesses } from "@/lib/security";
import "../../people.css";
import "../../inventario/inventory.css";
import "../../promociones/promotions.css";
import "../security.css";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const columns = [
  { key: "date", label: "Ingreso" },
  { key: "user", label: "Usuario" },
  { key: "result", label: "Resultado" },
  { key: "logout", label: "Cierre de sesión" },
  { key: "ip", label: "IP" },
  { key: "device", label: "Dispositivo" },
  { key: "reason", label: "Motivo" },
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    page = Math.max(1, Number(one(p.page)) || 1),
    search = (one(p.search) || "").trim(),
    raw = one(p.resultado),
    login = raw === "true" ? true : raw === "false" ? false : undefined;
  const [result, user] = await Promise.all([
    getAccesses({ page, limit: 20, search, login_exitoso: login }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!result.ok || !user?.permisos.includes("accesos-usuario.leer"))
    return null;
  const date = (v: string | null) =>
    v
      ? new Intl.DateTimeFormat("es-BO", {
          timeZone: "America/La_Paz",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(v))
      : "—";
  return (
    <section
      className="directory-page security-page"
      data-directory-scope="accesses"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">SEGURIDAD</span>
          <h1>Historial de accesos</h1>
          <p>Inicios de sesión exitosos, fallidos y cierres registrados.</p>
        </div>
      </header>
      <DirectoryTableActions
        scope="accesses"
        fileName="historial-accesos"
        columns={columns}
        showActions={false}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/seguridad/accesos">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="access-search"
              initialValue={search}
              placeholder="Buscar usuario, correo o IP..."
              basePath="/dashboard/seguridad/accesos"
            />
          </label>
          <InventoryFilter
            name="resultado"
            value={raw}
            label="Resultado"
            options={[
              { value: "true", label: "Exitosos" },
              { value: "false", label: "Fallidos" },
            ]}
          />
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
              {result.value.data.map((x) => {
                const person = x.usuario?.persona;
                const name = person
                  ? `${person.nombre} ${person.ap_paterno}`
                  : x.identificador_intento || "Desconocido";
                return (
                  <tr key={x.id_acceso}>
                    <td data-directory-column="date">{date(x.fecha_login)}</td>
                    <td data-directory-column="user">
                      <strong>{name}</strong>
                    </td>
                    <td data-directory-column="result">
                      <span
                        className={`promotion-status promotion-status--${x.login_exitoso ? "activa" : "cancelada"}`}
                      >
                        <span />
                        {x.login_exitoso ? "Exitoso" : "Fallido"}
                      </span>
                    </td>
                    <td data-directory-column="logout">
                      {date(x.fecha_logout)}
                    </td>
                    <td data-directory-column="ip">{x.ip || "—"}</td>
                    <td data-directory-column="device">
                      <span
                        className="security-agent"
                        title={x.user_agent || ""}
                      >
                        {x.user_agent || "—"}
                      </span>
                    </td>
                    <td data-directory-column="reason">
                      {x.motivo_fallo || "—"}
                    </td>
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
        path="/dashboard/seguridad/accesos"
        filters={{ search, resultado: raw }}
      />
    </section>
  );
}
