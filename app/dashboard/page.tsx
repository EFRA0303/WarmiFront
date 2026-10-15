import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarIcon, TreatmentIcon, UsersIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getPublicCompanyIdentity } from "@/lib/public-company";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Panel principal",
};

export default async function DashboardPage() {
  const [user, company] = await Promise.all([
    getCurrentUser(),
    getPublicCompanyIdentity(),
  ]);
  if (!user) redirect("/login");

  const fullName = [
    user.persona?.nombre,
    user.persona?.ap_paterno,
    user.persona?.ap_materno,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="dashboard-content">
      <div className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">PANEL PRINCIPAL</span>
          <h1>Hola, {user.persona?.nombre || "bienvenido"}.</h1>
          <p>
            Tu espacio de gestión está listo. Consulta los usuarios y continúa
            organizando la operación de {company.name} desde un solo lugar.
          </p>
        </div>
        <span className="session-status">
          <span /> Sesión activa
        </span>
      </div>

      <div className="module-grid">
        <Link className="module-card module-card--active" href="/dashboard/usuarios">
          <span className="module-card__icon">
            <UsersIcon />
          </span>
          <div>
            <span className="module-card__status">Disponible</span>
            <h2>Gestión de usuarios</h2>
            <p>Consulta cuentas, roles, accesos recientes y estados.</p>
          </div>
        </Link>
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
          <h2>{fullName || user.nombre_usuario || `Usuario ${company.name}`}</h2>
          <p>{user.correo_acceso}</p>
        </div>
        <div className="profile-meta">
          <span>Rol</span>
          <strong>{user.rol?.nombre || "Sin rol"}</strong>
        </div>
      </section>
    </section>
  );
}
