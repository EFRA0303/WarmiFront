"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { changeOwnPassword, updateOwnProfile } from "@/app/actions/account";
import { logoutAction } from "@/app/actions/auth";
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  LogoutIcon,
  UserSettingsIcon,
} from "@/components/icons";
import { PasswordStrength } from "@/components/password-strength";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import type { AccountActionState, CurrentUser } from "@/lib/types";
import "./account-menu.css";

const initialState: AccountActionState = {};

function normalizeName(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const position = input.selectionStart;
  input.value = input.value
    .toLocaleLowerCase("es")
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase("es")}`,
    );
  if (position !== null) input.setSelectionRange(position, position);
}

export function AccountMenu({
  user,
  displayName,
  initials,
}: {
  user: CurrentUser;
  displayName: string;
  initials: string;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const profileDialogRef = useRef<HTMLDialogElement>(null);
  const securityDialogRef = useRef<HTMLDialogElement>(null);
  const [profileState, profileAction, profilePending] = useActionState(updateOwnProfile, initialState);
  const [securityState, securityAction, securityPending] = useActionState(changeOwnPassword, initialState);
  const [password, setPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const initialPhotoUrl = user.foto_perfil_ruta ? "/api/account/profile-photo" : null;
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(initialPhotoUrl);
  const [profilePhotoError, setProfilePhotoError] = useState("");
  useCloseDetailsOnOutside(detailsRef);

  useEffect(() => {
    if (profileState.success) router.refresh();
  }, [profileState.resultId, profileState.success, router]);

  useEffect(() => {
    if (!securityState.success) return;
    const timer = window.setTimeout(() => router.replace("/login"), 1600);
    return () => window.clearTimeout(timer);
  }, [securityState.resultId, securityState.success, router]);

  function open(dialog: HTMLDialogElement | null) {
    detailsRef.current?.removeAttribute("open");
    dialog?.showModal();
  }

  function previewProfilePhoto(file?: File) {
    setProfilePhotoError("");
    if (!file) return setProfilePhotoPreview(initialPhotoUrl);
    if (file.size > 5 * 1024 * 1024) {
      setProfilePhotoPreview(initialPhotoUrl);
      return setProfilePhotoError("La imagen no puede superar los 5 MB.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfilePhotoPreview(initialPhotoUrl);
      return setProfilePhotoError("Usa una imagen JPG, PNG o WEBP.");
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePhotoPreview(typeof reader.result === "string" ? reader.result : initialPhotoUrl);
    reader.readAsDataURL(file);
  }

  return (
    <div className="account-menu">
      <details ref={detailsRef} className="account-menu__details">
        <summary className="topbar-user account-menu__trigger">
          <CurrentUserAvatar hasPhoto={Boolean(user.foto_perfil_ruta)} photoKey={user.foto_perfil_ruta} initials={initials} className="topbar-avatar" />
          <span>
            <strong>{displayName}</strong>
            <small>{user.rol?.nombre || "Sin rol"}</small>
          </span>
        </summary>
        <div className="account-menu__dropdown">
          <div className="account-menu__identity">
            <strong>{displayName}</strong>
            <small>{user.correo_acceso}</small>
          </div>
          <button type="button" onClick={() => open(profileDialogRef.current)}>
            <UserSettingsIcon /><span>Información personal</span>
          </button>
          <span className="account-menu__section">Seguridad</span>
          <button type="button" className="account-menu__nested" onClick={() => open(securityDialogRef.current)}>
            <LockIcon /><span>Cambiar contraseña</span>
          </button>
          <form action={logoutAction}>
            <button type="submit" className="account-menu__logout">
              <LogoutIcon /><span>Salir</span>
            </button>
          </form>
        </div>
      </details>

      <dialog ref={profileDialogRef} className="account-dialog" onClick={(event) => { if (event.target === profileDialogRef.current && !profilePending) profileDialogRef.current.close(); }}>
        <form className="account-dialog__panel" action={profileAction}>
          <header className="account-dialog__header">
            <span className="account-dialog__icon"><UserSettingsIcon /></span>
            <div><small>MI CUENTA</small><h2>Información personal</h2><p>Actualiza tus datos personales y de contacto.</p></div>
            <button type="button" onClick={() => profileDialogRef.current?.close()} disabled={profilePending} aria-label="Cerrar"><CloseIcon /></button>
          </header>
          <div className="account-dialog__body account-profile-grid">
            <label className="account-profile-photo account-profile-grid__wide">
              <span>Foto de perfil</span>
              <span className="account-profile-photo__content">
                <span className="account-profile-photo__preview">{profilePhotoPreview ? <Image src={profilePhotoPreview} alt="Vista previa de la foto" width={86} height={86} unoptimized /> : <UserSettingsIcon />}</span>
                <span><strong>{initialPhotoUrl ? "Cambiar imagen" : "Seleccionar imagen"}</strong><small>JPG, PNG o WEBP. Peso máximo 5 MB.</small></span>
              </span>
              <input name="foto_perfil" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => previewProfilePhoto(event.currentTarget.files?.[0])} />
              {(profilePhotoError || profileState.fieldErrors?.foto_perfil) && <small>{profilePhotoError || profileState.fieldErrors?.foto_perfil}</small>}
            </label>
            <label><span>Nombre <b>*</b></span><input name="nombre" required maxLength={100} defaultValue={user.persona.nombre} onInput={normalizeName} aria-invalid={Boolean(profileState.fieldErrors?.nombre)} />{profileState.fieldErrors?.nombre && <small>{profileState.fieldErrors.nombre}</small>}</label>
            <label><span>Apellido paterno <b>*</b></span><input name="ap_paterno" required maxLength={100} defaultValue={user.persona.ap_paterno} onInput={normalizeName} aria-invalid={Boolean(profileState.fieldErrors?.ap_paterno)} />{profileState.fieldErrors?.ap_paterno && <small>{profileState.fieldErrors.ap_paterno}</small>}</label>
            <label><span>Apellido materno</span><input name="ap_materno" maxLength={100} defaultValue={user.persona.ap_materno ?? ""} onInput={normalizeName} /></label>
            <label><span>Documento de identidad</span><input name="ci" maxLength={20} defaultValue={user.persona.ci ?? ""} /></label>
            <label><span>Fecha de nacimiento</span><input name="fecha_nac" type="date" defaultValue={user.persona.fecha_nac?.slice(0, 10) ?? ""} /></label>
            <label><span>Género <b>*</b></span><select name="genero" required defaultValue={user.persona.genero}><option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option></select></label>
            <InternationalPhoneInput name="telefono1" label="Teléfono principal" required defaultValue={user.persona.telefono1} error={profileState.fieldErrors?.telefono1} />
            <InternationalPhoneInput name="telefono2" label="Teléfono alternativo" defaultValue={user.persona.telefono2} error={profileState.fieldErrors?.telefono2} />
            <label className="account-profile-grid__wide"><span>Dirección</span><input name="direccion" maxLength={255} defaultValue={user.persona.direccion ?? ""} /></label>
            {profileState.message && <div className={`account-form-result account-form-result--${profileState.success ? "success" : "error"}`} role="status">{profileState.message}</div>}
          </div>
          <footer className="account-dialog__footer"><button type="button" onClick={() => profileDialogRef.current?.close()} disabled={profilePending}>Cancelar</button><button type="submit" disabled={profilePending}>{profilePending ? "Guardando..." : "Guardar cambios"}</button></footer>
        </form>
      </dialog>

      <dialog ref={securityDialogRef} className="account-dialog account-dialog--security" onClick={(event) => { if (event.target === securityDialogRef.current && !securityPending) securityDialogRef.current.close(); }}>
        <form className="account-dialog__panel" action={securityAction} noValidate>
          <header className="account-dialog__header">
            <span className="account-dialog__icon"><LockIcon /></span>
            <div><small>SEGURIDAD</small><h2>Cambiar contraseña</h2><p>Al finalizar tendrás que iniciar sesión nuevamente.</p></div>
            <button type="button" onClick={() => securityDialogRef.current?.close()} disabled={securityPending} aria-label="Cerrar"><CloseIcon /></button>
          </header>
          <div className="account-dialog__body account-password-fields">
            <label><span>Contraseña actual</span><div className="account-password-control"><LockIcon /><input name="contrasena_actual" type={showCurrent ? "text" : "password"} autoComplete="current-password" maxLength={72} disabled={securityPending || securityState.success} /><button type="button" onClick={() => setShowCurrent((value) => !value)} aria-label="Mostrar u ocultar contraseña actual">{showCurrent ? <EyeOffIcon /> : <EyeIcon />}</button></div>{securityState.fieldErrors?.contrasena_actual && <small>{securityState.fieldErrors.contrasena_actual}</small>}</label>
            <label><span>Nueva contraseña</span><div className="account-password-control"><LockIcon /><input name="nueva_contrasena" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} disabled={securityPending || securityState.success} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar u ocultar nueva contraseña">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button></div>{securityState.fieldErrors?.nueva_contrasena && <small>{securityState.fieldErrors.nueva_contrasena}</small>}<PasswordStrength password={password} /></label>
            <label><span>Confirmar nueva contraseña</span><div className="account-password-control"><LockIcon /><input name="confirmar_contrasena" type={showConfirmation ? "text" : "password"} autoComplete="new-password" maxLength={72} disabled={securityPending || securityState.success} /><button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label="Mostrar u ocultar confirmación">{showConfirmation ? <EyeOffIcon /> : <EyeIcon />}</button></div>{securityState.fieldErrors?.confirmar_contrasena && <small>{securityState.fieldErrors.confirmar_contrasena}</small>}</label>
            {securityState.message && <div className={`account-form-result account-form-result--${securityState.success ? "success" : "error"}`} role="status">{securityState.message}</div>}
          </div>
          <footer className="account-dialog__footer"><button type="button" onClick={() => securityDialogRef.current?.close()} disabled={securityPending}>Cancelar</button><button type="submit" disabled={securityPending || securityState.success}>{securityPending ? "Actualizando..." : securityState.success ? "Contraseña actualizada" : "Cambiar contraseña"}</button></footer>
        </form>
      </dialog>
    </div>
  );
}
