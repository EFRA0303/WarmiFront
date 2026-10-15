import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  PrinterIcon,
  SearchIcon,
  UserSettingsIcon,
} from "@/components/icons";
import {
  ColumnSelector,
  StatusFilter,
  UserTypeFilter,
} from "@/components/users-controls";
import { UserStatusAction } from "@/components/user-status-action";
import { UserAccessStatusAction } from "@/components/user-access-status-action";
import { UserPermissionAction } from "@/components/user-permission-action";
import {
  UserPresenceStatus,
  UsersPresenceProvider,
} from "@/components/users-presence";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { UserRegistrationDialog } from "@/components/user-registration-dialog";
import type { UserListItem, UserStatus, UserType } from "@/lib/types";
import { getUsers } from "@/lib/users";
import { getCurrentUser } from "@/lib/auth";
import "../people.css";
import "./users.css";

export const metadata: Metadata = {
  title: "Usuarios",
};

const PAGE_SIZE = 10;
const validStatuses = new Set<UserStatus>(["ACTIVO", "BAJA", "BLOQUEADO"]);
const validTypes = new Set<UserType>(["PACIENTE", "PERSONAL"]);

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildUsersUrl({
  page,
  search,
  estado,
  tipo,
}: {
  page?: number;
  search?: string;
  estado?: UserStatus;
  tipo?: UserType;
}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (estado) params.set("estado", estado);
  if (tipo) params.set("tipo", tipo);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/dashboard/usuarios?${query}` : "/dashboard/usuarios";
}

function formatBlockedUntil(value: string | null) {
  if (!value) return "Sin bloqueo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return `Hasta ${new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  }).format(date)}`;
}

function hasTemporaryLock(user: UserListItem) {
  if (!user.bloqueado_hasta) return false;
  const blockedUntil = new Date(user.bloqueado_hasta);
  return !Number.isNaN(blockedUntil.getTime()) && blockedUntil.getTime() > Date.now();
}

function userName(user: UserListItem) {
  return [
    user.persona?.nombre,
    user.persona?.ap_paterno,
    user.persona?.ap_materno,
  ]
    .filter(Boolean)
    .join(" ");
}

function userInitials(user: UserListItem) {
  return [user.persona?.nombre, user.persona?.ap_paterno]
    .filter(Boolean)
    .map((part) => part![0])
    .join("")
    .toUpperCase();
}

function creatorName(user: UserListItem) {
  const creator = user.creador?.persona;
  if (!creator) {
    return user.created_by ? `Usuario #${user.created_by}` : "Cuenta inicial del sistema";
  }
  return [creator.nombre, creator.ap_paterno, creator.ap_materno]
    .filter(Boolean)
    .join(" ");
}

function paginationItems(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, total, current - 1, current, current + 1]);
  return [...values].filter((value) => value > 0 && value <= total).sort((a, b) => a - b);
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = Number(singleValue(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (singleValue(params.search) || "").trim().slice(0, 150);
  const requestedStatus = singleValue(params.estado)?.toUpperCase() as
    | UserStatus
    | undefined;
  const estado =
    requestedStatus && validStatuses.has(requestedStatus)
      ? requestedStatus
      : undefined;
  const requestedType = singleValue(params.tipo)?.toUpperCase() as
    | UserType
    | undefined;
  const tipo = requestedType && validTypes.has(requestedType) ? requestedType : undefined;

  const [result, currentUser] = await Promise.all([
    getUsers({ page, limit: PAGE_SIZE, search, estado, tipo }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");

  if (!result.ok) {
    const forbidden = result.status === 403;
    return (
      <section className="users-page">
        <div className="users-heading">
          <div>
            <span className="page-eyebrow">ADMINISTRACIÓN</span>
            <h1>Usuarios</h1>
            <p>Consulta las cuentas que tienen acceso al sistema.</p>
          </div>
        </div>
        <div className="users-message users-message--error">
          <span className="users-message__icon" aria-hidden="true">
            {forbidden ? "!" : "×"}
          </span>
          <div>
            <h2>{forbidden ? "Acceso restringido" : "No pudimos cargar los usuarios"}</h2>
            <p>
              {forbidden
                ? "Tu cuenta no tiene el permiso usuarios.leer. Solicita acceso al administrador."
                : result.message}
            </p>
          </div>
          {!forbidden && (
            <Link className="secondary-button" href="/dashboard/usuarios">
              Intentar nuevamente
            </Link>
          )}
        </div>
      </section>
    );
  }

  const { data: users, total, limit } = result.value;
  const canUpdateUsers = Boolean(
    currentUser?.permisos.includes("usuarios.actualizar"),
  );
  const canManagePermissions = Boolean(
    currentUser?.permisos.includes("permisos.leer") &&
    currentUser.permisos.includes("permisos.asignar") &&
    currentUser.permisos.includes("roles.leer"),
  );
  const canCreateUsers = Boolean(
    currentUser?.permisos.includes("usuarios.crear") &&
    currentUser.permisos.includes("roles.asignar") &&
    currentUser.permisos.includes("roles.leer") &&
    currentUser.permisos.includes("pacientes.leer"),
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const firstVisible = total ? (currentPage - 1) * limit + 1 : 0;
  const lastVisible = total ? Math.min(currentPage * limit, total) : 0;
  const pages = paginationItems(currentPage, totalPages);

  return (
    <section className="users-page">
      <div className="users-heading">
        <div>
          <span className="page-eyebrow">ADMINISTRACIÓN</span>
          <h1>Usuarios</h1>
          <p>Consulta las cuentas, roles y estados de acceso del sistema.</p>
        </div>
        <div className="users-heading-actions">
          {canCreateUsers && <UserRegistrationDialog />}
          <div className="users-total">
            <span className="users-total__icon">
              <UserSettingsIcon />
            </span>
            <span>
              <small>Resultados</small>
              <strong>{total}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="users-actionbar" aria-label="Acciones de la tabla">
        <button type="button" className="table-action table-action--excel" title="Exportación a Excel próximamente">
          <FileSpreadsheetIcon />
          <span>Excel</span>
        </button>
        <button type="button" className="table-action table-action--pdf" title="Exportación a PDF próximamente">
          <FileTextIcon />
          <span>PDF</span>
        </button>
        <button type="button" className="table-action" title="Impresión próximamente">
          <PrinterIcon />
          <span>Imprimir</span>
        </button>
        <ColumnSelector showActions={canUpdateUsers || canManagePermissions} />
      </div>

      <div className="users-toolbar">
        <form className="users-search" action="/dashboard/usuarios" method="get">
          <label className="search-control" htmlFor="user-search">
            <SearchIcon />
            <DynamicSearchInput
              id="user-search"
              initialValue={search}
              placeholder="Buscar por nombre, correo o usuario..."
              basePath="/dashboard/usuarios"
            />
          </label>
          <StatusFilter initialValue={estado} />
          <UserTypeFilter initialValue={tipo} />
        </form>
      </div>

      {users.length ? (
        <UsersPresenceProvider
          key={users.map((user) => user.id_usuario).join("-")}
          initialReferenceTime={new Date().toISOString()}
          initialUsers={users.map((user) => ({
            id_usuario: user.id_usuario,
            en_linea: user.en_linea,
            ultima_actividad_en:
              user.ultima_actividad_en || user.ultimo_acceso_en,
            ultima_desconexion_en: null,
          }))}
        >
          <div className="users-table-card">
            <div className="users-table-scroll">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="users-col-person">Persona</th>
                    <th className="users-col-account">Cuenta</th>
                    <th className="users-col-role">Rol</th>
                    <th className="users-col-access">Actividad</th>
                    <th className="users-col-security">Seguridad</th>
                    <th className="users-col-status">Estado</th>
                    {(canUpdateUsers || canManagePermissions) && <th className="users-col-actions">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id_usuario}>
                      <td className="users-col-person">
                        <div className="person-cell">
                          <span className={`person-avatar ${user.foto_perfil_ruta ? "person-avatar--photo" : ""}`}>{user.foto_perfil_ruta ? <Image src={`/api/users/${user.id_usuario}/profile-photo`} alt="" width={40} height={40} unoptimized /> : userInitials(user) || "WU"}</span>
                          <span>
                            <strong>{userName(user) || "Sin nombre registrado"}</strong>
                            <small>Usuario #{user.id_usuario}</small>
                          </span>
                        </div>
                      </td>
                      <td className="users-col-account">
                        <div className="account-cell">
                          <strong>{user.correo_acceso}</strong>
                          <small>@{user.nombre_usuario || "sin-usuario"}</small>
                        </div>
                      </td>
                      <td className="users-col-role">
                        <span className="role-badge">{user.rol?.nombre || "Sin rol"}</span>
                      </td>
                      <td className="users-col-access">
                        <UserPresenceStatus userId={user.id_usuario} />
                      </td>
                      <td className="users-col-security">
                        <div className={`security-cell ${hasTemporaryLock(user) ? "security-cell--blocked" : ""}`}>
                          <strong>
                            {user.intentos_fallidos} {user.intentos_fallidos === 1 ? "intento fallido" : "intentos fallidos"}
                          </strong>
                          <small>
                            {hasTemporaryLock(user)
                              ? formatBlockedUntil(user.bloqueado_hasta)
                              : "Sin bloqueo"}
                          </small>
                        </div>
                      </td>
                      <td className="users-col-status">
                        <UserAccessStatusAction
                          userId={user.id_usuario}
                          userName={userName(user) || user.correo_acceso}
                          currentStatus={user.estado}
                          currentReason={user.motivo_estado}
                          blockedUntil={user.bloqueado_hasta}
                          temporarilyBlocked={hasTemporaryLock(user)}
                          canEdit={canUpdateUsers}
                        />
                      </td>
                      {(canUpdateUsers || canManagePermissions) && (
                        <td className="users-col-actions">
                          <div className="user-row-actions">
                          {canUpdateUsers && <UserStatusAction
                            userId={user.id_usuario}
                            userName={userName(user) || user.correo_acceso}
                            email={user.correo_acceso}
                            username={user.nombre_usuario}
                            creatorName={creatorName(user)}
                            createdAt={user.created_at}
                            updatedAt={user.updated_at}
                          />}
                          {canManagePermissions && <UserPermissionAction userId={user.id_usuario} userName={userName(user) || user.correo_acceso} roleId={user.id_rol} roleName={user.rol?.nombre || "Sin rol"} />}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="users-mobile-list">
            {users.map((user) => (
              <article className="user-mobile-card" key={user.id_usuario}>
                <div className="mobile-user-head">
                  <div className="person-cell users-col-person">
                    <span className={`person-avatar ${user.foto_perfil_ruta ? "person-avatar--photo" : ""}`}>{user.foto_perfil_ruta ? <Image src={`/api/users/${user.id_usuario}/profile-photo`} alt="" width={40} height={40} unoptimized /> : userInitials(user) || "WU"}</span>
                    <span>
                      <strong>{userName(user) || "Sin nombre registrado"}</strong>
                      <small>{user.correo_acceso}</small>
                    </span>
                  </div>
                  <span className="users-col-status">
                    <UserAccessStatusAction
                      userId={user.id_usuario}
                      userName={userName(user) || user.correo_acceso}
                      currentStatus={user.estado}
                      currentReason={user.motivo_estado}
                      blockedUntil={user.bloqueado_hasta}
                      temporarilyBlocked={hasTemporaryLock(user)}
                      canEdit={canUpdateUsers}
                    />
                  </span>
                </div>
                <dl className="mobile-user-details">
                  <div className="users-col-account">
                    <dt>Usuario</dt>
                    <dd>@{user.nombre_usuario || "sin-usuario"}</dd>
                  </div>
                  <div className="users-col-role">
                    <dt>Rol</dt>
                    <dd>{user.rol?.nombre || "Sin rol"}</dd>
                  </div>
                  <div className="users-col-access">
                    <dt>Actividad</dt>
                    <dd><UserPresenceStatus userId={user.id_usuario} /></dd>
                  </div>
                  <div className="users-col-security">
                    <dt>Seguridad</dt>
                    <dd className={hasTemporaryLock(user) ? "mobile-security--blocked" : ""}>
                      {user.intentos_fallidos} {user.intentos_fallidos === 1 ? "intento fallido" : "intentos fallidos"}
                      <small>{hasTemporaryLock(user) ? formatBlockedUntil(user.bloqueado_hasta) : "Sin bloqueo"}</small>
                    </dd>
                  </div>
                </dl>
                {(canUpdateUsers || canManagePermissions) && (
                  <div className="mobile-user-actions">
                    {canUpdateUsers && <UserStatusAction
                      userId={user.id_usuario}
                      userName={userName(user) || user.correo_acceso}
                      email={user.correo_acceso}
                      username={user.nombre_usuario}
                      creatorName={creatorName(user)}
                      createdAt={user.created_at}
                      updatedAt={user.updated_at}
                    />}
                    {canManagePermissions && <UserPermissionAction userId={user.id_usuario} userName={userName(user) || user.correo_acceso} roleId={user.id_rol} roleName={user.rol?.nombre || "Sin rol"} />}
                  </div>
                )}
              </article>
            ))}
          </div>

          <footer className="users-footer">
            <p>
              Mostrando <strong>{firstVisible}–{lastVisible}</strong> de{" "}
              <strong>{total}</strong> usuarios
            </p>
            {totalPages > 1 && (
              <nav className="pagination" aria-label="Paginación de usuarios">
                <Link
                  className={`pagination-arrow ${currentPage === 1 ? "pagination-link--disabled" : ""}`}
                  href={buildUsersUrl({ page: currentPage - 1, search, estado, tipo })}
                  aria-label="Página anterior"
                  aria-disabled={currentPage === 1}
                >
                  <ChevronLeftIcon />
                </Link>
                {pages.map((pageNumber, index) => {
                  const previous = pages[index - 1];
                  return (
                    <span className="pagination-cluster" key={pageNumber}>
                      {previous && pageNumber - previous > 1 && (
                        <span className="pagination-ellipsis">…</span>
                      )}
                      <Link
                        className={`pagination-page ${pageNumber === currentPage ? "pagination-page--active" : ""}`}
                        href={buildUsersUrl({ page: pageNumber, search, estado, tipo })}
                        aria-current={pageNumber === currentPage ? "page" : undefined}
                      >
                        {pageNumber}
                      </Link>
                    </span>
                  );
                })}
                <Link
                  className={`pagination-arrow ${currentPage === totalPages ? "pagination-link--disabled" : ""}`}
                  href={buildUsersUrl({ page: currentPage + 1, search, estado, tipo })}
                  aria-label="Página siguiente"
                  aria-disabled={currentPage === totalPages}
                >
                  <ChevronRightIcon />
                </Link>
              </nav>
            )}
          </footer>
        </UsersPresenceProvider>
      ) : (
        <div className="users-message users-message--empty">
          <span className="users-message__icon" aria-hidden="true">
            <UserSettingsIcon />
          </span>
          <div>
            <h2>No encontramos usuarios</h2>
            <p>
              {search || estado || tipo
                ? "Prueba con otro término o elimina los filtros aplicados."
                : "Todavía no existen usuarios registrados en el sistema."}
            </p>
          </div>
          {(search || estado || tipo) && (
            <Link className="secondary-button" href="/dashboard/usuarios">
              Ver todos
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
