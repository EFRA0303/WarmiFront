import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import {
  CalendarIcon,
  LogoutIcon,
  TreatmentIcon,
  UsersIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Panel principal",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const fullName = [
    user.persona?.nombre,
    user.persona?.ap_paterno,
    user.persona?.ap_materno,
  ]
    .filter(Boolean)
    .join(" ");
  const initials = [user.persona?.nombre, user.persona?.ap_paterno]
    .filter(Boolean)
    .map((part) => part![0])
    .join("")
    .toUpperCase();

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Brand />
        <div className="dashboard-actions">
          <ThemeToggle />
          <div className="user-chip">
            <span className="user-avatar">{initials || "WU"}</span>
            <span className="user-chip__copy">
              <strong>{fullName || user.nombre_usuario || "Usuario Warmi"}</strong>
              <small>{user.rol?.nombre || "Sin rol asignado"}</small>
            </span>
          </div>
          <form action={logoutAction}>
            <button className="logout-button" type="submit" title="Cerrar sesión">
              <LogoutIcon />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <div>
            <span className="dashboard-eyebrow">PANEL PRINCIPAL</span>
            <h1>Hola, {user.persona?.nombre || "bienvenido"}.</h1>
            <p>
              Tu espacio de gestión está listo. Desde aquí iremos incorporando cada
              módulo de Warmi.
            </p>
          </div>
          <span className="session-status">
            <span /> Sesión activa
          </span>
        </div>

        <div className="module-grid">
          <article className="module-card module-card--active">
            <span className="module-card__icon">
              <UsersIcon />
            </span>
            <div>
              <span className="module-card__status">Disponible próximamente</span>
              <h2>Gestión de pacientes</h2>
              <p>Información personal, historial y seguimiento centralizado.</p>
            </div>
          </article>
          <article className="module-card">
            <span className="module-card__icon">
              <TreatmentIcon />
            </span>
            <div>
              <span className="module-card__status">Próximo módulo</span>
              <h2>Tratamientos</h2>
              <p>Planes corporales, evolución y atención personalizada.</p>
            </div>
          </article>
          <article className="module-card">
            <span className="module-card__icon">
              <CalendarIcon />
            </span>
            <div>
              <span className="module-card__status">Próximo módulo</span>
              <h2>Agenda</h2>
              <p>Organización de citas, sesiones y disponibilidad del equipo.</p>
            </div>
          </article>
        </div>

        <section className="profile-card">
          <div>
            <span className="profile-card__label">CUENTA CONECTADA</span>
            <h2>{fullName || user.nombre_usuario || "Usuario Warmi"}</h2>
            <p>{user.correo_acceso}</p>
          </div>
          <div className="profile-meta">
            <span>Rol</span>
            <strong>{user.rol?.nombre || "Sin rol"}</strong>
          </div>
        </section>
      </section>
    </main>
  );
}
