import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessHoursForm } from "@/components/business-hours-form";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessHours } from "@/lib/business-hours";
import { isConfigurationAdmin } from "@/lib/configuration-access";
import "../people.css";
import "./hours.css";

export const metadata: Metadata = { title: "Horarios de atención" };

export default async function BusinessHoursPage() {
  const [result, user] = await Promise.all([
    getBusinessHours(),
    getCurrentUser(),
  ]);
  if (!user || (!result.ok && result.status === 401)) redirect("/login");
  if (!isConfigurationAdmin(user) || !user.permisos.includes("empresa.leer"))
    redirect("/dashboard");
  if (!result.ok)
    return (
      <section className="directory-page">
        <div className="directory-message"><b>!</b><div><h2>No pudimos cargar el horario</h2><p>{result.message}</p></div></div>
      </section>
    );
  return (
    <section className="directory-page hours-page">
      <BusinessHoursForm schedule={result.value} />
    </section>
  );
}
