"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createPermission, createRoleWithPermissions, updateRoleWithPermissions } from "@/app/dashboard/sistema/roles-permisos/actions";
import { CheckIcon, CloseIcon, EditIcon, SearchIcon, SettingsIcon, ShieldIcon } from "@/components/icons";
import type { PermissionListItem, RoleWithPermissions } from "@/lib/types";

function groupPermissions(permissions: PermissionListItem[]) {
  const grouped = new Map<string, PermissionListItem[]>();
  for (const permission of permissions) {
    const key = permission.permiso.split(".")[0] || "otros";
    grouped.set(key, [...(grouped.get(key) ?? []), permission]);
  }
  return [...grouped.entries()];
}

function PermissionChecklist({ permissions, selected, onChange, disabled }: { permissions: PermissionListItem[]; selected: Set<number>; onChange: (next: Set<number>) => void; disabled: boolean }) {
  return <div className="permission-groups">{groupPermissions(permissions).map(([group, items]) => {
    const values = items;
    const allSelected = values.every((permission) => selected.has(permission.id_permiso));
    return <section className="permission-group" key={group}>
      <header><div><strong>{group}</strong><small>{values.length} permisos</small></div><button type="button" disabled={disabled} onClick={() => { const next = new Set(selected); for (const permission of values) { if (allSelected) next.delete(permission.id_permiso); else next.add(permission.id_permiso); } onChange(next); }}>{allSelected ? "Quitar grupo" : "Marcar grupo"}</button></header>
      <div>{values.map((permission) => <label key={permission.id_permiso} className={selected.has(permission.id_permiso) ? "permission-option permission-option--selected" : "permission-option"}>
        <input type="checkbox" checked={selected.has(permission.id_permiso)} disabled={disabled} onChange={() => { const next = new Set(selected); if (selected.has(permission.id_permiso)) next.delete(permission.id_permiso); else next.add(permission.id_permiso); onChange(next); }} />
        <span className="permission-option__check">{selected.has(permission.id_permiso) && <CheckIcon />}</span>
        <span><strong>{permission.permiso}</strong><small>{permission.descripcion || "Permiso del sistema"}</small></span>
      </label>)}</div>
    </section>;
  })}</div>;
}

function RoleDialog({ permissions, role, trigger, canSave }: { permissions: PermissionListItem[]; role?: RoleWithPermissions; trigger: string; canSave: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(new Set<number>());
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const edit = Boolean(role);
  function open() {
    setName(role?.nombre ?? "");
    setDescription(role?.descripcion ?? "");
    setSelected(new Set(role?.permissionIds ?? []));
    setError("");
    dialogRef.current?.showModal();
  }
  function close() { if (!pending) dialogRef.current?.close(); }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = role
        ? await updateRoleWithPermissions(role.id_rol, { nombre: name, descripcion: description || null, permissionIds: [...selected] })
        : await createRoleWithPermissions({ nombre: name, descripcion: description || null, permissionIds: [...selected] });
      if (!result.ok) return setError(result.message);
      dialogRef.current?.close();
    });
  }
  return <>
    <button type="button" className={edit ? "role-card__edit" : "access-primary"} onClick={open}>{edit ? <EditIcon /> : <ShieldIcon />}<span>{trigger}</span></button>
    <dialog ref={dialogRef} className="role-dialog" onCancel={(event) => pending && event.preventDefault()}>
      <form onSubmit={submit} className="role-dialog__content">
        <header className="role-dialog__header"><span><ShieldIcon /></span><div><small>{edit ? "PERMISOS PREDETERMINADOS" : "NUEVO ROL"}</small><h2>{edit ? `Configurar ${role?.nombre}` : "Crear rol y asignar permisos"}</h2><p>Los usuarios con este rol heredarán automáticamente esta configuración.</p></div><button type="button" onClick={close} aria-label="Cerrar"><CloseIcon /></button></header>
        <section className="role-fields"><label><span>Nombre del rol</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required disabled={pending} placeholder="Ej. Recepcionista" /></label><label><span>Descripción</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} disabled={pending} placeholder="Responsabilidades principales del rol" /></label></section>
        <section className="role-dialog__permissions"><div className="role-dialog__summary"><div><strong>Permisos del rol</strong><small>Selecciona las acciones disponibles por defecto.</small></div><span>{selected.size} seleccionados</span></div><PermissionChecklist permissions={permissions} selected={selected} onChange={setSelected} disabled={pending} /></section>
        {error && <p className="role-dialog__error" role="alert">{error}</p>}
        <footer><button type="button" onClick={close} disabled={pending}>Cancelar</button><button type="submit" disabled={pending || !canSave}>{pending ? "Guardando..." : edit ? "Guardar cambios" : "Crear rol"}</button></footer>
      </form>
    </dialog>
  </>;
}

function PermissionCreateDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function open() { setCode(""); setDescription(""); setError(""); dialogRef.current?.showModal(); }
  function close() { if (!pending) dialogRef.current?.close(); }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createPermission({ permiso: code, descripcion: description || null });
      if (!result.ok) return setError(result.message);
      dialogRef.current?.close();
    });
  }
  return <>
    <button type="button" className="access-secondary" onClick={open}><CheckIcon /><span>Nuevo permiso</span></button>
    <dialog ref={dialogRef} className="role-dialog permission-create-dialog" onCancel={(event) => pending && event.preventDefault()}>
      <form onSubmit={submit} className="role-dialog__content">
        <header className="role-dialog__header"><span><SettingsIcon /></span><div><small>CATÁLOGO DEL SISTEMA</small><h2>Crear permiso</h2><p>Registra un código que podrá asignarse a uno o varios roles.</p></div><button type="button" onClick={close} aria-label="Cerrar"><CloseIcon /></button></header>
        <section className="permission-create-fields"><label><span>Código del permiso</span><input value={code} onChange={(event) => setCode(event.target.value.toLowerCase().replace(/\s/g, ""))} maxLength={80} required disabled={pending} placeholder="Ej. citas.confirmar" /><small>Formato obligatorio: módulo.acción, en minúsculas y sin espacios.</small></label><label><span>Descripción</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} disabled={pending} placeholder="Explica qué operación habilita este permiso." /></label></section>
        {error && <p className="role-dialog__error" role="alert">{error}</p>}
        <footer><button type="button" onClick={close} disabled={pending}>Cancelar</button><button type="submit" disabled={pending}>{pending ? "Creando..." : "Crear permiso"}</button></footer>
      </form>
    </dialog>
  </>;
}

function PermissionCatalogDialog({ permissions }: { permissions: PermissionListItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? permissions.filter((permission) =>
        `${permission.permiso} ${permission.descripcion ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : permissions;
  const grouped = groupPermissions(filtered);
  return <>
    <button type="button" className="access-stat-button" onClick={() => { setQuery(""); dialogRef.current?.showModal(); }}><span><CheckIcon /></span><div><small>Permisos disponibles</small><strong>{permissions.length}</strong><em>Ver lista completa</em></div></button>
    <dialog ref={dialogRef} className="role-dialog permission-catalog-dialog">
      <div className="role-dialog__content permission-catalog-content">
        <header className="role-dialog__header"><span><CheckIcon /></span><div><small>CATÁLOGO DEL SISTEMA</small><h2>Permisos disponibles</h2><p>Consulta los códigos que pueden asignarse a los roles y usuarios.</p></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar"><CloseIcon /></button></header>
        <div className="permission-catalog-toolbar"><label><SearchIcon /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código o descripción..." aria-label="Buscar permisos" /></label><span><strong>{filtered.length}</strong> de {permissions.length}</span></div>
        <div className="permission-catalog-list">
          {grouped.map(([group, items], index) => <details className="permission-catalog-group" key={`${group}-${normalizedQuery}`} open={Boolean(normalizedQuery) || index === 0}>
            <summary><span><strong>{group}</strong><small>{items.length} {items.length === 1 ? "permiso" : "permisos"}</small></span><span className="permission-catalog-group__count">{items.length}</span></summary>
            <div>{items.map((permission) => <article key={permission.id_permiso}><div><strong>{permission.permiso}</strong><small>{permission.descripcion || "Sin descripción registrada."}</small></div><span className={`directory-status directory-status--${permission.estado.toLowerCase()}`}><span />{permission.estado === "ACTIVO" ? "Activo" : "Baja"}</span></article>)}</div>
          </details>)}
          {!grouped.length && <div className="permission-catalog-empty"><SearchIcon /><strong>No encontramos permisos</strong><span>Prueba con otra palabra.</span></div>}
        </div>
        <footer><button type="button" onClick={() => dialogRef.current?.close()}>Cerrar</button></footer>
      </div>
    </dialog>
  </>;
}

export function AccessControlPanel({ roles, permissions, canCreate, canAssign, canUpdate, canCreatePermission }: { roles: RoleWithPermissions[]; permissions: PermissionListItem[]; canCreate: boolean; canAssign: boolean; canUpdate: boolean; canCreatePermission: boolean }) {
  const assignablePermissions = permissions.filter((permission) => permission.estado === "ACTIVO");
  return <>
    <header className="access-heading"><div><span className="page-eyebrow">CONTROL DE ACCESO</span><h1>Roles y permisos</h1><p>Define qué puede hacer cada perfil dentro del sistema.</p></div><div className="access-heading__actions">{canCreatePermission && <PermissionCreateDialog />}{canCreate && canAssign && <RoleDialog permissions={assignablePermissions} trigger="Nuevo rol" canSave />}</div></header>
    <div className="access-stats"><article><span><ShieldIcon /></span><div><small>Roles registrados</small><strong>{roles.length}</strong></div></article><PermissionCatalogDialog permissions={permissions} /></div>
    <div className="roles-grid">{roles.map((role) => <article className="role-card" key={role.id_rol}><header><span className="role-card__icon"><ShieldIcon /></span><span className={`directory-status directory-status--${role.estado.toLowerCase()}`}><span />{role.estado === "ACTIVO" ? "Activo" : "Baja"}</span></header><h2>{role.nombre}</h2><p>{role.descripcion || "Sin descripción registrada."}</p><div className="role-card__count"><strong>{role.permissionIds.length}</strong><span>permisos asignados</span></div>{canAssign && canUpdate && role.estado === "ACTIVO" && <RoleDialog permissions={assignablePermissions} role={role} trigger="Editar rol y permisos" canSave />}</article>)}</div>
  </>;
}
