"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { AccountMenu } from "@/components/account-menu";
import {
  BoxIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChartIcon,
  ChevronRightIcon,
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
  icon?: NavIcon;
  permission?: string;
  permissions?: string[];
  anyPermissions?: string[];
  soon?: boolean;
  exact?: boolean;
  children?: NavItem[];
};

const navigation: NavItem[] = [
  {
    label: "Inicio", icon: HomeIcon,
    children: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Agenda", icon: CalendarIcon, permission: "agenda.leer",
    children: [
      { label: "Calendario de citas", href: "/dashboard/agenda" },
      { label: "Notificaciones", href: "/dashboard/agenda/notificaciones" },
    ],
  },
  {
    label: "Pacientes", icon: UsersIcon, anyPermissions: ["pacientes.leer", "historiales.leer"],
    children: [
      { label: "Lista de pacientes", href: "/dashboard/pacientes", permission: "pacientes.leer", exact: true },
      { label: "Historiales clínicos", href: "/dashboard/historiales", permission: "historiales.leer" },
    ],
  },
  {
    label: "Atención clínica", icon: TreatmentIcon,
    anyPermissions: ["clinica.leer", "tratamientos.leer"],
    children: [
      { label: "Solicitudes de servicio", href: "/dashboard/solicitudes", permission: "clinica.leer" },
      { label: "Tratamientos", href: "/dashboard/tratamientos", permission: "tratamientos.leer" },
      { label: "Sesiones", href: "/dashboard/sesiones", permission: "clinica.leer" },
      { label: "Valoraciones y medidas", href: "/dashboard/valoraciones", permission: "clinica.leer" },
    ],
  },
  {
    label: "Personal", icon: BriefcaseIcon, anyPermissions: ["personal.leer", "disponibilidad.leer"],
    children: [
      { label: "Lista de empleados", href: "/dashboard/personal", permission: "personal.leer", exact: true },
      {
        label: "Disponibilidad", permission: "disponibilidad.leer",
        children: [
          { label: "Horarios habituales", href: "/dashboard/personal/disponibilidad?tab=regular" },
          { label: "Horarios extraordinarios", href: "/dashboard/personal/disponibilidad?tab=extras" },
          { label: "Bloqueos", href: "/dashboard/personal/disponibilidad?tab=blocks" },
        ],
      },
    ],
  },
  {
    label: "Catálogo", icon: SettingsIcon, permission: "catalogo.leer",
    children: [
      { label: "Áreas", href: "/dashboard/servicios?tab=structure" },
      { label: "Categorías", href: "/dashboard/servicios?tab=structure" },
      { label: "Servicios", href: "/dashboard/servicios?tab=services" },
      { label: "Tipos de medida", href: "/dashboard/servicios?tab=measures" },
    ],
  },
  {
    label: "Paquetes y promociones", icon: BoxIcon,
    anyPermissions: ["comercial.leer", "adquisiciones.leer"],
    children: [
      { label: "Paquetes", href: "/dashboard/paquetes", permission: "comercial.leer" },
      { label: "Promociones", href: "/dashboard/promociones", permission: "comercial.leer" },
      { label: "Adquisiciones de pacientes", href: "/dashboard/adquisiciones", permission: "adquisiciones.leer" },
    ],
  },
  {
    label: "Ventas", icon: ChartIcon, permission: "ventas.leer",
    children: [{ label: "Notas de venta", href: "/dashboard/ventas/notas" }, { label: "Pagos", href: "/dashboard/ventas/pagos" }],
  },
  {
    label: "Inventario", icon: BoxIcon, permission: "inventario.leer",
    children: [
      { label: "Productos", href: "/dashboard/inventario/productos" },
      { label: "Lotes y existencias", href: "/dashboard/inventario/lotes" },
      { label: "Movimientos", href: "/dashboard/inventario/movimientos" },
      { label: "Consumos por sesión", href: "/dashboard/inventario/consumos" },
      { label: "Salidas por venta", href: "/dashboard/inventario/salidas-venta" },
    ],
  },
  {
    label: "Administración", icon: UserSettingsIcon,
    anyPermissions: ["usuarios.leer", "roles.leer", "permisos.leer", "empresa.leer"],
    children: [
      { label: "Usuarios", href: "/dashboard/usuarios", permission: "usuarios.leer" },
      { label: "Roles y permisos", href: "/dashboard/sistema/roles-permisos", permissions: ["roles.leer", "permisos.leer"] },
      { label: "Empresa", href: "/dashboard/empresa", permission: "empresa.leer" },
      { label: "Configuración de documentos", href: "/dashboard/documentos", permission: "empresa.leer" },
    ],
  },
  {
    label: "Seguridad y auditoría", icon: ShieldIcon,
    anyPermissions: ["auditoria.leer", "accesos-usuario.leer", "usuarios.leer", "configuracion-auditoria.leer"],
    children: [
      { label: "Auditoría del sistema", href: "/dashboard/seguridad/auditoria", permission: "auditoria.leer" },
      { label: "Historial de accesos", href: "/dashboard/seguridad/accesos", permission: "accesos-usuario.leer" },
      { label: "Usuarios conectados", href: "/dashboard/seguridad/conectados", permission: "usuarios.leer" },
      { label: "Configuración de auditoría", href: "/dashboard/seguridad/configuracion", permission: "configuracion-auditoria.leer" },
    ],
  },
];

function itemVisible(item: NavItem, permissions: string[]) {
  if (item.permission && !permissions.includes(item.permission)) return false;
  if (item.permissions && !item.permissions.every((permission) => permissions.includes(permission))) return false;
  if (item.anyPermissions && !item.anyPermissions.some((permission) => permissions.includes(permission))) return false;
  return true;
}

function branchActive(item: NavItem, pathname: string, currentSearch: string): boolean {
  if (item.href) {
    const [href, expectedSearch] = item.href.split("?");
    if (href === "/dashboard") return pathname === href;
    if (item.exact && pathname !== href) return false;
    if (pathname.startsWith(href)) {
      if (!expectedSearch) return true;
      const expected = new URLSearchParams(expectedSearch);
      const current = new URLSearchParams(currentSearch);
      return [...expected].every(([key, value]) => current.get(key) === value);
    }
  }
  return item.children?.some((child) => branchActive(child, pathname, currentSearch)) ?? false;
}

function NavigationBranch({ item, pathname, currentSearch, permissions, depth = 0, closeMenu }: { item: NavItem; pathname: string; currentSearch: string; permissions: string[]; depth?: number; closeMenu: () => void }) {
  const visibleChildren = item.children?.filter((child) => itemVisible(child, permissions)) ?? [];
  const active = branchActive(item, pathname, currentSearch);
  const [expanded, setExpanded] = useState(active || depth === 0 && item.label === "Inicio");
  const opened = expanded;
  if (!itemVisible(item, permissions)) return null;
  if (item.children && visibleChildren.length === 0) return null;
  const Icon = item.icon;

  if (visibleChildren.length) {
    return <div className={`nav-branch nav-branch--depth-${depth}${active ? " nav-branch--active" : ""}`}>
      <button type="button" className="nav-branch__trigger" aria-expanded={opened} onClick={() => setExpanded((value) => !value)}>
        {Icon && <Icon />}<span>{item.label}</span><ChevronRightIcon className={`nav-branch__chevron${opened ? " expanded" : ""}`} />
      </button>
      {opened && <div className="nav-branch__children">{visibleChildren.map((child, index) => <NavigationBranch key={`${child.label}-${index}`} item={child} pathname={pathname} currentSearch={currentSearch} permissions={permissions} depth={depth + 1} closeMenu={closeMenu} />)}</div>}
    </div>;
  }

  if (!item.href || item.soon) return <span className={`nav-leaf nav-leaf--depth-${depth} nav-leaf--disabled`}>{Icon && <Icon />}<span>{item.label}</span><small>Pronto</small></span>;
  return <Link className={`nav-leaf nav-leaf--depth-${depth}${active ? " nav-leaf--active" : ""}`} href={item.href} onClick={closeMenu}>{Icon && <Icon />}<span>{item.label}</span></Link>;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel principal",
  "/dashboard/usuarios": "Gestión de usuarios",
  "/dashboard/pacientes": "Gestión de pacientes",
  "/dashboard/historiales": "Historiales clínicos",
  "/dashboard/pacientes/nuevo": "Nuevo paciente",
  "/dashboard/personal": "Gestión del personal",
  "/dashboard/personal/nuevo": "Nuevo empleado",
  "/dashboard/personal/disponibilidad": "Disponibilidad del personal",
  "/dashboard/agenda": "Agenda",
  "/dashboard/tratamientos": "Tratamientos",
  "/dashboard/sesiones": "Sesiones clínicas",
  "/dashboard/solicitudes": "Solicitudes de servicio",
  "/dashboard/valoraciones": "Valoraciones y medidas",
  "/dashboard/paquetes": "Paquetes",
  "/dashboard/promociones": "Promociones",
  "/dashboard/inventario/productos": "Productos",
  "/dashboard/inventario/lotes": "Lotes y existencias",
  "/dashboard/inventario/movimientos": "Movimientos de inventario",
  "/dashboard/ventas/notas": "Notas de venta",
  "/dashboard/ventas/pagos": "Pagos",
  "/dashboard/adquisiciones": "Adquisiciones de pacientes",
  "/dashboard/inventario/consumos": "Consumos por sesión",
  "/dashboard/inventario/salidas-venta": "Salidas por venta",
  "/dashboard/empresa": "Empresa",
  "/dashboard/documentos": "Configuración de documentos",
  "/dashboard/seguridad/auditoria": "Auditoría del sistema",
  "/dashboard/seguridad/accesos": "Historial de accesos",
  "/dashboard/seguridad/conectados": "Usuarios conectados",
  "/dashboard/seguridad/configuracion": "Configuración de auditoría",
  "/dashboard/agenda/notificaciones": "Notificaciones de Agenda",
  "/dashboard/servicios": "Servicios y mediciones",
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
  const currentSearch = useSearchParams().toString();
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
          {navigation.map((item) => <NavigationBranch key={`${item.label}-${pathname}`} item={item} pathname={pathname} currentSearch={currentSearch} permissions={user.permisos} closeMenu={() => setMenuOpen(false)} />)}
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
          <div className={`topbar-title${pathname === "/dashboard/agenda" ? " topbar-title--prominent" : ""}`}>
            <button
              type="button"
              className="menu-button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <div>
              {pathname !== "/dashboard/agenda" && <span>Warmi Spa</span>}
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
