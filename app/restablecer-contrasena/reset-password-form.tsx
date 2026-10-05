"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { EyeIcon, EyeOffIcon, LockIcon } from "@/components/icons";
import { PasswordStrength } from "@/components/password-strength";
import type { PasswordResetState } from "@/lib/types";

const initialState: PasswordResetState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (state.success) {
    return (
      <div className="reset-alert reset-alert--success" role="status">
        <b>✓</b>
        <div><strong>Contraseña actualizada</strong><p>{state.message}</p></div>
      </div>
    );
  }

  return (
    <form className="reset-form" action={formAction} noValidate>
      <input type="hidden" name="token" value={token} />
      <label className="reset-field">
        <span>Nueva contraseña</span>
        <div className={state.fieldErrors?.nueva_contrasena ? "reset-control reset-control--error" : "reset-control"}>
          <LockIcon />
          <input name="nueva_contrasena" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={72} disabled={pending} />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
        </div>
        {state.fieldErrors?.nueva_contrasena && <small>{state.fieldErrors.nueva_contrasena}</small>}
        <PasswordStrength password={password} />
      </label>
      <label className="reset-field">
        <span>Confirmar contraseña</span>
        <div className={state.fieldErrors?.confirmar_contrasena ? "reset-control reset-control--error" : "reset-control"}>
          <LockIcon />
          <input name="confirmar_contrasena" type={showConfirmation ? "text" : "password"} autoComplete="new-password" maxLength={72} disabled={pending} />
          <button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Ocultar contraseña" : "Mostrar contraseña"}>{showConfirmation ? <EyeOffIcon /> : <EyeIcon />}</button>
        </div>
        {state.fieldErrors?.confirmar_contrasena && <small>{state.fieldErrors.confirmar_contrasena}</small>}
      </label>
      {(state.fieldErrors?.token || state.message) && (
        <div className="reset-alert reset-alert--error" role="alert"><b>!</b><p>{state.fieldErrors?.token || state.message}</p></div>
      )}
      <button className="reset-submit" type="submit" disabled={pending}>{pending ? "Actualizando..." : "Guardar nueva contraseña"}</button>
    </form>
  );
}
