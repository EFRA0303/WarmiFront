import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CalendarIcon, TreatmentIcon, UsersIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import "./login.css";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const highlights = [
  { icon: UsersIcon, label: "Pacientes", text: "Información centralizada" },
  {
    icon: TreatmentIcon,
    label: "Tratamientos",
    text: "Seguimiento personalizado",
  },
  { icon: CalendarIcon, label: "Organización", text: "Tu operación en orden" },
];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="hero-glow hero-glow--one" />
        <div className="hero-glow hero-glow--two" />
        <div className="hero-grid" />

        <div className="hero-content">
          <Brand inverse />
          <div className="hero-message">
            <span className="hero-eyebrow">BIENESTAR QUE SE GESTIONA</span>
            <h1>Cuidar de cada paciente comienza con una mejor organización.</h1>
            <p>
              Gestiona tratamientos, historias y seguimiento desde un espacio
              pensado para acompañar el bienestar de tus pacientes.
            </p>
          </div>
          <div className="hero-highlights">
            {highlights.map(({ icon: Icon, label, text }) => (
              <article key={label} className="hero-highlight">
                <span>
                  <Icon />
                </span>
                <div>
                  <strong>{label}</strong>
                  <small>{text}</small>
                </div>
              </article>
            ))}
          </div>
          <p className="hero-footer">Warmi Spa · Cuidado con propósito</p>
        </div>
      </section>

      <section className="login-panel">
        <ThemeToggle className="login-theme-toggle" />
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-card">
          <div className="login-heading">
            <span className="welcome-pill">
              <span /> Bienvenido de vuelta
            </span>
            <h2>Ingresa a tu espacio</h2>
            <p>Usa tus credenciales para continuar en Warmi.</p>
          </div>
          <LoginForm />
          <div className="login-security">
            <span aria-hidden="true">✓</span>
            <p>
              Conexión segura. Tus credenciales se procesan de forma protegida.
            </p>
          </div>
        </div>
        <p className="login-help">
          ¿Necesitas ayuda para ingresar? <strong>Contacta al administrador</strong>
        </p>
      </section>
    </main>
  );
}
