import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServiceCatalogManager } from "@/components/service-catalog-manager";
import { getCurrentUser } from "@/lib/auth";
import { getServiceCatalog } from "@/lib/catalog";
import { isConfigurationAdmin } from "@/lib/configuration-access";
import "../people.css";
import "./services.css";

export const metadata: Metadata = { title: "Catálogo" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = tab === "services" ? "services" : tab === "measures" ? "measures" : "structure";
  const [result, user] = await Promise.all([getServiceCatalog(), getCurrentUser()]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!isConfigurationAdmin(user)) redirect("/dashboard");
  if (!user?.permisos.includes("catalogo.leer"))
    return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar el catálogo." />;
  if (!result.ok) return <Message title="No pudimos cargar el catálogo" message={result.message} />;
  return <section className="directory-page services-page">
    <header className="directory-heading"><div><h1>Catálogo</h1><p>Organiza áreas, categorías, servicios y mediciones desde un solo lugar.</p></div></header>
    <ServiceCatalogManager key={initialTab} data={result.value} initialTab={initialTab} canCreate={user.permisos.includes("catalogo.crear")} canEdit={user.permisos.includes("catalogo.actualizar")} />
  </section>;
}

function Message({ title, message }: { title: string; message: string }) {
  return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>;
}
