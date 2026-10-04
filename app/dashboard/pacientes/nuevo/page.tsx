import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { getCurrentUser } from "@/lib/auth";
import "../../people.css";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function NewPatientPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.permisos.includes("personas.crear") || !user.permisos.includes("pacientes.crear"))
    redirect("/dashboard/pacientes");

  return <section className="registration-page">
    <Link className="registration-back" href="/dashboard/pacientes"><ChevronLeftIcon />Volver a pacientes</Link>
    <header><span className="page-eyebrow">NUEVO REGISTRO</span><h1>Registrar paciente</h1><p>Completa los datos necesarios para incorporarlo al sistema.</p></header>
    <PatientRegistrationForm />
  </section>;
}
