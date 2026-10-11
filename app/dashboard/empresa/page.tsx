import { redirect } from "next/navigation";
import { CompanyDialog } from "@/components/remaining-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getCompanies } from "@/lib/remaining-modules";
import "../people.css";
import "../sesiones/sessions.css";
import "../operaciones/operations.css";
export default async function Page() {
  const [result, user] = await Promise.all([
    getCompanies({ page: 1, limit: 100 }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!result.ok || !user?.permisos.includes("empresa.leer")) return null;
  const create = user.permisos.includes("empresa.crear"),
    edit = user.permisos.includes("empresa.actualizar");
  return (
    <section className="directory-page">
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">ADMINISTRACIÓN</span>
          <h1>Empresa</h1>
          <p>Información comercial, dirección y canales de contacto.</p>
        </div>
        {create && <CompanyDialog />}
      </header>
      <div className="registration-form">
        {result.value.data.map((item) => (
          <article className="company-card" key={item.id_empresa}>
            <div>
              <h2>{item.nombre_comercial}</h2>
              <p>{item.razon_social || "Sin razón social registrada"}</p>
              <dl className="company-data">
                <div>
                  <dt>Dirección</dt>
                  <dd>{item.direccion || "—"}</dd>
                </div>
                <div>
                  <dt>Teléfonos</dt>
                  <dd>
                    {[item.telefono1, item.telefono2]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{item.correo || "—"}</dd>
                </div>
                <div>
                  <dt>Sitio web</dt>
                  <dd>{item.sitio_web || "—"}</dd>
                </div>
                <div>
                  <dt>Moneda</dt>
                  <dd>{item.moneda}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{item.estado === "ACTIVO" ? "Activo" : "Baja"}</dd>
                </div>
              </dl>
            </div>
            {edit && (
              <div className="session-actions">
                <CompanyDialog item={item} />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
