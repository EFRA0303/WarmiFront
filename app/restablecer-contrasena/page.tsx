import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ResetPasswordForm } from "./reset-password-form";
import "./reset-password.css";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="reset-shell">
      <ThemeToggle className="reset-theme" />
      <section className="reset-card">
        <Brand />
        <div className="reset-heading">
          <span>RECUPERACIÓN SEGURA</span>
          <h1>Crea una nueva contraseña</h1>
          <p>Elige una contraseña diferente y difícil de adivinar.</p>
        </div>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="reset-alert reset-alert--error" role="alert">
            <b>!</b>
            <div><strong>El enlace está incompleto</strong><p>Solicita uno nuevo desde el inicio de sesión.</p></div>
          </div>
        )}
        <Link className="reset-back" href="/login">Volver al inicio de sesión</Link>
      </section>
    </main>
  );
}
