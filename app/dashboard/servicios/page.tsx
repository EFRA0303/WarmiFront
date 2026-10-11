import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServiceCatalogManager } from "@/components/service-catalog-manager";
import { getCurrentUser } from "@/lib/auth";
import { getServiceCatalog } from "@/lib/catalog";
import "../people.css";
import "./services.css";

export const metadata: Metadata = { title: "Servicios y mediciones" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = tab === "measures" ? "measures" : tab === "structure" ? "structure" : "services";
  const [result, user] = await Promise.all([getServiceCatalog(), getCurrentUser()]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!user?.permisos.includes("catalogo.leer"))
    return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar el catálogo." />;
  if (!result.ok) return <Message title="No pudimos cargar el catálogo" message={result.message} />;
  return <section className="directory-page services-page">
    <header className="directory-heading"><div><span className="page-eyebrow">CONFIGURACIÓN CLÍNICA</span><h1>Servicios y mediciones</h1><p>Organiza los servicios ofrecidos y define qué datos se registran durante cada atención.</p></div></header>
    <ServiceCatalogManager key={initialTab} data={result.value} initialTab={initialTab} canCreate={user.permisos.includes("catalogo.crear")} canEdit={user.permisos.includes("catalogo.actualizar")} />
  </section>;
}

function Message({ title, message }: { title: string; message: string }) {
  return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>;
}
