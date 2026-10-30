import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { careContext, careEntryPath, careHref } from "@/lib/patient-care";

export default async function PatientCareEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const path = careEntryPath(user.permisos);
  if (!path) redirect("/dashboard");
  const context = careContext(await searchParams);
  redirect(careHref(path, { id_paciente: context.id_paciente }));
}
