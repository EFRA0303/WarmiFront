"use client";

import { useActionState, useRef, useState } from "react";
import { loginAction } from "@/app/actions/auth";
import {
  ArrowIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UserSettingsIcon,
} from "@/components/icons";
import type { LoginState } from "@/lib/types";
import { ForgotPasswordDialog, type ForgotPasswordDialogHandle } from "./forgot-password-dialog";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const recoveryDialogRef = useRef<ForgotPasswordDialogHandle>(null);

  return (
    <>
    <form className="login-form" action={formAction} noValidate>
      <div className="field-group">
        <label htmlFor="correo_acceso">Correo o nombre de usuario</label>
        <div
          className={`field-control ${state.fieldErrors?.correo_acceso ? "field-control--error" : ""}`}
        >
          <UserSettingsIcon className="field-control__icon" />
          <input
            id="correo_acceso"
            name="correo_acceso"
            type="text"
            autoComplete="username"
            placeholder="tu@correo.com o tu usuario"
            aria-describedby={
              state.fieldErrors?.correo_acceso ? "correo-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.correo_acceso)}
            disabled={pending}
          />
        </div>
        {state.fieldErrors?.correo_acceso && (
          <p id="correo-error" className="field-error">
            {state.fieldErrors.correo_acceso}
          </p>
        )}
      </div>

      <div className="field-group field-group--password">
        <div className="field-label-row">
          <label htmlFor="contrasena">Contraseña</label>
        </div>
        <div
          className={`field-control ${state.fieldErrors?.contrasena ? "field-control--error" : ""}`}
        >
          <LockIcon className="field-control__icon" />
          <input
            id="contrasena"
            name="contrasena"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            maxLength={72}
            aria-describedby={
              state.fieldErrors?.contrasena ? "password-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.contrasena)}
            disabled={pending}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            disabled={pending}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <button type="button" className="forgot-password-link" onClick={() => recoveryDialogRef.current?.open()}>
          ¿Olvidaste tu contraseña?
        </button>
        {state.fieldErrors?.contrasena && (
          <p id="password-error" className="field-error">
            {state.fieldErrors.contrasena}
          </p>
        )}
      </div>

      {state.message && (
        <div className="form-alert" role="alert" aria-live="polite">
          <span aria-hidden="true">!</span>
          <p>{state.message}</p>
        </div>
      )}

      <button className="submit-button" type="submit" disabled={pending}>
        {pending ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Verificando...
          </>
        ) : (
          <>
            Iniciar sesión
            <ArrowIcon />
          </>
        )}
      </button>
    </form>
    <ForgotPasswordDialog ref={recoveryDialogRef} />
    </>
  );
}
