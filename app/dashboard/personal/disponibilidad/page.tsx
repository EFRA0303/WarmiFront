import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvailabilityManager } from "@/components/availability-manager";
import { getAvailability } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import "../../people.css";
import "./availability.css";

export const metadata: Metadata = { title: "Disponibilidad del personal" };

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = tab === "extras" ? "extras" : tab === "blocks" ? "blocks" : "regular";
  const [result, user] = await Promise.all([getAvailability(), getCurrentUser()]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!user?.permisos.includes("disponibilidad.leer")) return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar la disponibilidad." />;
  if (!result.ok) return <Message title="No pudimos cargar la disponibilidad" message={result.message} />;
  return <section className="directory-page availability-page"><header className="directory-heading"><div><span className="page-eyebrow">GESTIÓN DEL PERSONAL</span><h1>Disponibilidad</h1><p>Define cuándo atiende cada especialista y bloquea periodos de descanso, ausencia o vacaciones.</p></div></header><AvailabilityManager key={initialTab} data={result.value} initialTab={initialTab} canCreate={user.permisos.includes("disponibilidad.crear")} canEdit={user.permisos.includes("disponibilidad.actualizar")} /></section>;
}

function Message({ title, message }: { title: string; message: string }) { return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>; }
