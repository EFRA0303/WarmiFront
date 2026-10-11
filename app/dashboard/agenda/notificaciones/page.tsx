import { redirect } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { InventoryFilter } from "@/components/inventory-filter";
import { InventoryPagination } from "@/components/inventory-pagination";
import {
  NewNotificationDialog,
  NotificationActions,
} from "@/components/notification-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationOptions, getNotifications } from "@/lib/security";
import type { NotificationStatus } from "@/lib/types";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../../inventario/inventory.css";
import "../../promociones/promotions.css";
import "../../seguridad/security.css";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const statuses: NotificationStatus[] = [
  "PENDIENTE",
  "ENVIADA",
  "ERROR",
  "CANCELADA",
];
const names = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  ERROR: "Error",
  CANCELADA: "Cancelada",
};
const columns = [
  { key: "scheduled", label: "Programada" },
  { key: "appointment", label: "Cita" },
  { key: "patient", label: "Paciente" },
  { key: "type", label: "Tipo" },
  { key: "channel", label: "Canal" },
  { key: "sent", label: "Enviada" },
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
    estado = statuses.includes(raw as NotificationStatus)
      ? (raw as NotificationStatus)
      : undefined;
  const [result, options, user] = await Promise.all([
    getNotifications({ page, limit: 15, search, estado }),
    getNotificationOptions(),
    getCurrentUser(),
  ]);
  if (
    (!result.ok && result.status === 401) ||
    (!options.ok && options.status === 401)
  )
    redirect("/login");
  if (!result.ok || !options.ok || !user?.permisos.includes("agenda.leer"))
    return null;
  const create = user.permisos.includes("agenda.crear"),
    edit = user.permisos.includes("agenda.actualizar");
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
      data-directory-scope="notifications"
    >
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">AGENDA</span>
          <h1>Notificaciones</h1>
          <p>Programa recordatorios y registra el resultado de cada envío.</p>
        </div>
        {create && <NewNotificationDialog options={options.value} />}
      </header>
      <DirectoryTableActions
        scope="notifications"
        fileName="notificaciones-agenda"
        columns={columns}
        showActions={edit}
      />
      <div className="directory-toolbar">
        <form action="/dashboard/agenda/notificaciones">
          <label className="directory-search">
            <SearchIcon />
            <DynamicSearchInput
              id="notification-search"
              initialValue={search}
              placeholder="Buscar paciente o servicio..."
              basePath="/dashboard/agenda/notificaciones"
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
      <div className="directory-table-card security-table">
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
              {result.value.data.map((x) => (
                <tr key={x.id_notificacion}>
                  <td data-directory-column="scheduled">
                    {date(x.programada_para)}
                  </td>
                  <td data-directory-column="appointment">
                    <div className="directory-stacked">
                      <strong>{date(x.fecha_hora_inicio)}</strong>
                      <small>{x.servicio}</small>
                    </div>
                  </td>
                  <td data-directory-column="patient">{x.paciente}</td>
                  <td data-directory-column="type">{x.tipo}</td>
                  <td data-directory-column="channel">
                    <span className="movement-type">{x.canal}</span>
                  </td>
                  <td data-directory-column="sent">{date(x.enviada_en)}</td>
                  <td data-directory-column="status">
                    <span
                      className={`promotion-status promotion-status--${x.estado === "ENVIADA" ? "activa" : x.estado === "PENDIENTE" ? "programada" : "cancelada"}`}
                    >
                      <span />
                      {names[x.estado]}
                    </span>
                  </td>
                  {edit && (
                    <td data-directory-column="actions">
                      <NotificationActions item={x} />
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
        path="/dashboard/agenda/notificaciones"
        filters={{ search, estado }}
      />
    </section>
  );
}
