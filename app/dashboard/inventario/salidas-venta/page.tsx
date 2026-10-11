import { redirect } from "next/navigation";
import { StockOperationList } from "@/components/stock-operation-list";
import { getCurrentUser } from "@/lib/auth";
import { getOperationOptions, getSaleOutputs } from "@/lib/remaining-modules";
import "../../people.css";
import "../../sesiones/sessions.css";
import "../inventory.css";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    page = Math.max(1, Number(one(p.page)) || 1),
    search = (one(p.search) || "").trim();
  const [result, options, user] = await Promise.all([
    getSaleOutputs({ page, limit: 15, search }),
    getOperationOptions(),
    getCurrentUser(),
  ]);
  if (
    (!result.ok && result.status === 401) ||
    (!options.ok && options.status === 401)
  )
    redirect("/login");
  if (!result.ok || !options.ok || !user?.permisos.includes("inventario.leer"))
    return null;
  return (
    <StockOperationList
      title="Salidas por venta"
      description="Asigna lotes a los productos vendidos y descuenta sus existencias."
      type="output"
      path="/dashboard/inventario/salidas-venta"
      search={search}
      page={page}
      result={result.value}
      options={options.value}
      canCreate={user.permisos.includes("inventario.crear")}
    />
  );
}
