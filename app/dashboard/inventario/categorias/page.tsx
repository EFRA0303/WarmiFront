import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServiceCatalogManager } from "@/components/service-catalog-manager";
import { getCurrentUser } from "@/lib/auth";
import { getServiceCatalog } from "@/lib/catalog";
import { isConfigurationAdmin } from "@/lib/configuration-access";
import "../../people.css";
import "../../servicios/services.css";
import "../inventory.css";

export const metadata: Metadata = { title: "Categorías de productos" };

export default async function ProductCategoriesPage() {
  const [result, user] = await Promise.all([getServiceCatalog(), getCurrentUser()]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!isConfigurationAdmin(user)) redirect("/dashboard");
  if (!user?.permisos.includes("catalogo.leer"))
    return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar las categorías de productos." />;
  if (!result.ok) return <Message title="No pudimos cargar las categorías" message={result.message} />;
  return <section className="directory-page services-page">
    <header className="directory-heading"><div><span className="page-eyebrow">INVENTARIO</span><h1>Categorías de productos</h1><p>Organiza los productos del inventario por categoría.</p></div></header>
    <ServiceCatalogManager view="product-categories" initialTab="product-categories" data={result.value} canCreate={user.permisos.includes("catalogo.crear")} canEdit={user.permisos.includes("catalogo.actualizar")} />
  </section>;
}

function Message({ title, message }: { title: string; message: string }) {
  return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>;
}
