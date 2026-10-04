import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { StaffRegistrationForm } from "@/components/staff-registration-form";
import { getCurrentUser } from "@/lib/auth";
import { getActiveRoles } from "@/lib/people";
import "../../people.css";

export const metadata: Metadata = { title: "Nuevo empleado" };

export default async function NewStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const required = ["personas.crear", "usuarios.crear", "roles.asignar", "roles.leer", "personal.crear"];
  if (!required.every((permission) => user.permisos.includes(permission))) redirect("/dashboard/personal");
  const roles = await getActiveRoles();

  return <section className="registration-page">
    <Link className="registration-back" href="/dashboard/personal"><ChevronLeftIcon />Volver al personal</Link>
    <header><span className="page-eyebrow">NUEVO EMPLEADO</span><h1>Crear empleado</h1><p>Registra sus datos personales, laborales y la cuenta de acceso.</p></header>
    {roles.ok ? <StaffRegistrationForm roles={roles.value.data} /> : <div className="directory-message"><b>!</b><div><h2>No pudimos cargar los roles</h2><p>{roles.message}</p></div></div>}
  </section>;
}
