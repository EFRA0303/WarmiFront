import { redirect } from "next/navigation";
import { DocumentConfigDialog } from "@/components/security-dialogs";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentCompanies, getDocumentConfigs } from "@/lib/security";
import { isConfigurationAdmin } from "@/lib/configuration-access";
import "../people.css";
import "../sesiones/sessions.css";
import "../inventario/inventory.css";
import "../operaciones/operations.css";
export default async function Page() {
  const [configs, companies, user] = await Promise.all([
    getDocumentConfigs(),
    getDocumentCompanies(),
    getCurrentUser(),
  ]);
  if (
    (!configs.ok && configs.status === 401) ||
    (!companies.ok && companies.status === 401)
  )
    redirect("/login");
  if (!isConfigurationAdmin(user)) redirect("/dashboard");
  if (!configs.ok || !companies.ok || !user?.permisos.includes("empresa.leer"))
    return null;
  const create = user.permisos.includes("empresa.crear"),
    edit = user.permisos.includes("empresa.actualizar");
  return (
    <section className="directory-page">
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">ADMINISTRACIÓN</span>
          <h1>Configuración de documentos</h1>
          <p>
            Selecciona los datos institucionales que aparecerán al imprimir.
          </p>
        </div>
        {create && <DocumentConfigDialog companies={companies.value.data} />}
      </header>
      <div className="registration-form">
        {configs.value.data.map((item) => {
          const company = companies.value.data.find(
            (c) => c.id_empresa === item.id_empresa,
          );
          return (
            <article className="company-card" key={item.id_configuracion}>
              <div>
                <h2>
                  {company?.nombre_comercial || `Empresa #${item.id_empresa}`}
                </h2>
                <p>{item.encabezado || "Sin encabezado personalizado"}</p>
                <dl className="company-data">
                  <div>
                    <dt>Pie de página</dt>
                    <dd>{item.pie_pagina || "—"}</dd>
                  </div>
                  <div>
                    <dt>Logo</dt>
                    <dd>{item.mostrar_logo ? "Visible" : "Oculto"}</dd>
                  </div>
                  <div>
                    <dt>Dirección</dt>
                    <dd>{item.mostrar_direccion ? "Visible" : "Oculta"}</dd>
                  </div>
                  <div>
                    <dt>Teléfono</dt>
                    <dd>{item.mostrar_telefono ? "Visible" : "Oculto"}</dd>
                  </div>
                  <div>
                    <dt>Correo</dt>
                    <dd>{item.mostrar_correo ? "Visible" : "Oculto"}</dd>
                  </div>
                </dl>
              </div>
              {edit && (
                <div className="session-actions">
                  <DocumentConfigDialog
                    item={item}
                    companies={companies.value.data}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
