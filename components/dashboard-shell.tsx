"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { AccountMenu } from "@/components/account-menu";
import {
  BoxIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChartIcon,
  CloseIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  TreatmentIcon,
  UsersIcon,
  UserSettingsIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import type { CurrentUser } from "@/lib/types";
import "./dashboard-shell.css";

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = {
  label: string;
  href?: string;
  icon: NavIcon;
  permission?: string;
  permissions?: string[];
};

const navigation: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "General",
    items: [
      { label: "Inicio", href: "/dashboard", icon: HomeIcon },
      {
        label: "Usuarios",
        href: "/dashboard/usuarios",
        icon: UserSettingsIcon,
        permission: "usuarios.leer",
      },
      {
        label: "Pacientes",
        href: "/dashboard/pacientes",
        icon: UsersIcon,
        permission: "pacientes.leer",
      },
      {
        label: "Personal",
        href: "/dashboard/personal",
        icon: BriefcaseIcon,
        permission: "personal.leer",
      },
    ],
  },
  {
    label: "Operación",
    items: [
      { label: "Agenda", icon: CalendarIcon },
      { label: "Tratamientos", icon: TreatmentIcon },
      { label: "Inventario", icon: BoxIcon },
      { label: "Ventas", icon: ChartIcon },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Roles y Permisos", href: "/dashboard/sistema/roles-permisos", icon: ShieldIcon, permissions: ["roles.leer", "permisos.leer"] },
      { label: "Configuración", icon: SettingsIcon },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel principal",
  "/dashboard/usuarios": "Gestión de usuarios",
  "/dashboard/pacientes": "Gestión de pacientes",
  "/dashboard/pacientes/nuevo": "Nuevo paciente",
  "/dashboard/personal": "Gestión del personal",
  "/dashboard/personal/nuevo": "Nuevo empleado",
  "/dashboard/sistema/roles-permisos": "Roles y permisos",
};

export function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: CurrentUser;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const fullName = [
    user.persona?.nombre,
    user.persona?.ap_paterno,
    user.persona?.ap_materno,
  ]
    .filter(Boolean)
    .join(" ");
  const displayName = fullName || user.nombre_usuario || "Usuario Warmi";
  const initials = [user.persona?.nombre, user.persona?.ap_paterno]
    .filter(Boolean)
    .map((part) => part![0])
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <PresenceHeartbeat />
      <button
        className={`sidebar-overlay ${menuOpen ? "sidebar-overlay--visible" : ""}`}
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`app-sidebar ${menuOpen ? "app-sidebar--open" : ""}`}>
        <div className="sidebar-brand-row">
          <Brand inverse />
          <button
            type="button"
            className="sidebar-close"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ label, href, icon: Icon, permission, permissions }) => {
                if (permission && !user.permisos.includes(permission)) return null;
                if (permissions && !permissions.every((required) => user.permisos.includes(required))) return null;
                const active = href
                  ? href === "/dashboard"
                    ? pathname === href
                    : pathname.startsWith(href)
                  : false;

                if (!href) {
                  return (
                    <span className="nav-item nav-item--disabled" key={label}>
                      <Icon />
                      <span>{label}</span>
                      <small>Pronto</small>
                    </span>
                  );
                }

                return (
                  <Link
                    className={`nav-item ${active ? "nav-item--active" : ""}`}
                    href={href}
                    key={label}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-profile">
          <span className="sidebar-avatar">{initials || "WU"}</span>
          <span>
            <strong>{displayName}</strong>
            <small>{user.rol?.nombre || "Sin rol asignado"}</small>
          </span>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="menu-button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <div>
              <span>Warmi Spa</span>
              <strong>{pageTitles[pathname] || "Administración"}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <ThemeToggle />
            <AccountMenu user={user} displayName={displayName} initials={initials} />
            <form action={logoutAction}>
              <button className="topbar-logout" type="submit" title="Cerrar sesión">
                <LogoutIcon />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </header>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
