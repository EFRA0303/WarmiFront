import { redirect } from "next/navigation";
import { AuditConfigDialog } from "@/components/security-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getAuditConfigs } from "@/lib/security";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../../inventario/inventory.css";
import "../../promociones/promotions.css";
import "../security.css";
export default async function Page() {
  const [result, user] = await Promise.all([
    getAuditConfigs(),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!result.ok || !user?.permisos.includes("configuracion-auditoria.leer"))
    return null;
  const create = user.permisos.includes("configuracion-auditoria.crear"),
    edit = user.permisos.includes("configuracion-auditoria.actualizar");
  return (
    <section className="directory-page security-page">
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">SEGURIDAD</span>
          <h1>Configuración de auditoría</h1>
          <p>
            Controla qué eventos opcionales se registran; los obligatorios
            permanecen activos.
          </p>
        </div>
        {create && <AuditConfigDialog />}
      </header>
      <div className="directory-table-card security-table">
        <div className="directory-table-scroll">
          <table className="directory-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Estado</th>
                {edit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {result.value.data.map((x) => (
                <tr key={x.id_configuracion}>
                  <td>
                    <div className="directory-stacked">
                      <strong>{x.nombre}</strong>
                      <small className="security-code">{x.codigo_evento}</small>
                    </div>
                  </td>
                  <td>{x.categoria}</td>
                  <td>{x.descripcion || "—"}</td>
                  <td>{x.es_obligatorio ? "Obligatorio" : "Opcional"}</td>
                  <td>
                    <span
                      className={`promotion-status promotion-status--${x.habilitado ? "activa" : "cancelada"}`}
                    >
                      <span />
                      {x.habilitado ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  {edit && (
                    <td>
                      <div className="session-actions">
                        <AuditConfigDialog item={x} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
