import { redirect } from "next/navigation";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { getCurrentUser } from "@/lib/auth";
import { getCompanies, getCurrencies } from "@/lib/remaining-modules";
import { isConfigurationAdmin } from "@/lib/configuration-access";
import "../people.css";
import "../sesiones/sessions.css";
import "../operaciones/operations.css";
import "./company.css";
export default async function Page() {
  const [result, currencies, user] = await Promise.all([
    getCompanies({ page: 1, limit: 100 }),
    getCurrencies(),
    getCurrentUser(),
  ]);
  if ((!result.ok && result.status === 401) || (!currencies.ok && currencies.status === 401))
    redirect("/login");
  if (!isConfigurationAdmin(user)) redirect("/dashboard");
  if (!result.ok || !currencies.ok || !user?.permisos.includes("empresa.leer"))
    return null;
  const create = user.permisos.includes("empresa.crear"),
    edit = user.permisos.includes("empresa.actualizar");
  return (
    <section className="directory-page">
      <CompanySettingsForm
        company={result.value.data[0]}
        currencies={currencies.value}
        canCreate={create}
        canEdit={edit}
      />
    </section>
  );
}
