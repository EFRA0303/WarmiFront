"use client";

import { useEffect, useRef, useState, useTransition, type FocusEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerStaff } from "@/app/dashboard/personal/actions";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { PersonFields } from "@/components/person-fields";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { PasswordStrength } from "@/components/password-strength";
import { checkRegistrationAvailability } from "@/app/dashboard/registration-actions";
import type { RegistrationState, RoleListItem } from "@/lib/types";
import { StaffVisualFields } from "@/components/staff-visual-fields";

const initialState: RegistrationState = {};

export function StaffRegistrationForm({ roles, onCancel, onSuccess }: { roles: RoleListItem[]; onCancel?: () => void; onSuccess?: () => void }) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [availability, setAvailability] = useState<Record<string, { available?: boolean; message: string }>>({});
  const [checking, startChecking] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const router = useRouter();
  const finishSuccess = () => onSuccess ? onSuccess() : router.push("/dashboard/personal");

  const error = (name: string) => state.fieldErrors?.[name];

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of Object.values(activeTimers)) clearTimeout(timer);
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setState(await registerStaff(initialState, formData)));
  }

  function runUniqueCheck(field: "correo_acceso" | "nombre_usuario", input: HTMLInputElement) {
    const value = input.value.trim();
    input.setCustomValidity("");
    if (!value) {
      setAvailability((current) => ({ ...current, [field]: { available: true, message: "" } }));
      return;
    }
    setAvailability((current) => ({ ...current, [field]: { message: "Verificando disponibilidad..." } }));
    startChecking(async () => {
      const result = await checkRegistrationAvailability(field, value);
      if (input.value.trim() !== value) return;
      input.setCustomValidity(result.ok && result.available === false ? result.message : "");
      setAvailability((current) => ({ ...current, [field]: { available: result.available, message: result.message } }));
    });
  }

  function scheduleUniqueCheck(field: "correo_acceso" | "nombre_usuario", input: HTMLInputElement) {
    input.setCustomValidity("");
    clearTimeout(timers.current[field]);
    setAvailability((current) => ({ ...current, [field]: { message: "" } }));
    if (!input.value.trim()) return;
    timers.current[field] = setTimeout(() => runUniqueCheck(field, input), 550);
  }

  function checkUniqueOnBlur(field: "correo_acceso" | "nombre_usuario", event: FocusEvent<HTMLInputElement>) {
    clearTimeout(timers.current[field]);
    runUniqueCheck(field, event.currentTarget);
  }

  function feedback(field: string) {
    const item = availability[field];
    if (!item?.message) return null;
    const className = item.available === true
      ? "availability availability--available"
      : item.available === false
        ? "availability availability--taken"
        : "availability";
    return <small className={className}>{item.message}</small>;
  }

  return (
    <form className="registration-form" onSubmit={submit}>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>1</span>
          <div>
            <h2>Datos personales</h2>
            <p>Información de identificación y contacto del empleado.</p>
          </div>
        </div>
        <PersonFields state={state} />
      </section>

      <section className="registration-section">
        <div className="registration-section__heading">
          <span>2</span>
          <div>
            <h2>Datos laborales</h2>
            <p>Define su función dentro del establecimiento.</p>
          </div>
        </div>
        <StaffVisualFields photoError={error("foto_perfil")} colorError={error("color_agenda")} />
        <div className="registration-grid registration-grid--three">
          <label className="registration-field">
            <span>Profesión <b>*</b></span>
            <input name="profesion" maxLength={80} required aria-invalid={Boolean(error("profesion"))} />
            {error("profesion") && <small>{error("profesion")}</small>}
          </label>
          <label className="registration-field">
            <span>Cargo <b>*</b></span>
            <input name="cargo" maxLength={80} required aria-invalid={Boolean(error("cargo"))} />
            {error("cargo") && <small>{error("cargo")}</small>}
          </label>
          <label className="registration-field">
            <span>Fecha de ingreso <b>*</b></span>
            <input name="fecha_ingreso" type="date" required aria-invalid={Boolean(error("fecha_ingreso"))} />
            {error("fecha_ingreso") && <small>{error("fecha_ingreso")}</small>}
          </label>
        </div>
      </section>

      <section className="registration-section">
        <div className="registration-section__heading">
          <span>3</span>
          <div>
            <h2>Cuenta de acceso</h2>
            <p>Credenciales y rol con los que ingresará al sistema.</p>
          </div>
        </div>
        <div className="registration-grid">
          <label className="registration-field">
            <span>Correo de acceso <b>*</b></span>
            <input name="correo_acceso" type="email" maxLength={150} required onInput={(event) => scheduleUniqueCheck("correo_acceso", event.currentTarget)} onBlur={(event) => checkUniqueOnBlur("correo_acceso", event)} aria-invalid={Boolean(error("correo_acceso"))} />
            {error("correo_acceso") && <small>{error("correo_acceso")}</small>}
            {feedback("correo_acceso")}
          </label>
          <label className="registration-field">
            <span>Nombre de usuario</span>
            <input name="nombre_usuario" maxLength={50} placeholder="Opcional" onInput={(event) => scheduleUniqueCheck("nombre_usuario", event.currentTarget)} onBlur={(event) => checkUniqueOnBlur("nombre_usuario", event)} />
            {feedback("nombre_usuario")}
          </label>
          <label className="registration-field">
            <span>Rol <b>*</b></span>
            <select name="id_rol" defaultValue="" required aria-invalid={Boolean(error("id_rol"))}>
              <option value="" disabled>Seleccionar rol</option>
              {roles.map((role) => <option value={role.id_rol} key={role.id_rol}>{role.nombre}</option>)}
            </select>
            {error("id_rol") && <small>{error("id_rol")}</small>}
          </label>
          <label className="registration-field">
            <span>Contraseña <b>*</b></span>
            <span className="registration-password">
              <input name="contrasena" type={showPassword ? "text" : "password"} minLength={12} maxLength={72} required value={passwordValue} onChange={(event) => setPasswordValue(event.target.value)} aria-invalid={Boolean(error("contrasena"))} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
            {error("contrasena") && <small>{error("contrasena")}</small>}
            <PasswordStrength password={passwordValue} />
          </label>
          <label className="registration-field">
            <span>Confirmar contraseña <b>*</b></span>
            <input name="confirmar_contrasena" type={showPassword ? "text" : "password"} minLength={12} maxLength={72} required aria-invalid={Boolean(error("confirmar_contrasena"))} />
            {error("confirmar_contrasena") && <small>{error("confirmar_contrasena")}</small>}
          </label>
        </div>
      </section>

      {state.message && !state.outcome && <div className="registration-alert" role="alert">{state.message}</div>}

      {state.resultId && state.outcome && (
        <SubmissionResultDialog key={state.resultId} state={state} onSuccess={finishSuccess} />
      )}

      <footer className="registration-footer">
        {onCancel ? (
          <button type="button" className="registration-cancel" onClick={onCancel}>Cancelar</button>
        ) : (
          <Link href="/dashboard/personal" className="registration-cancel">Cancelar</Link>
        )}
        <button type="submit" className="registration-submit" disabled={pending || checking}>
          {pending || checking ? "Verificando datos..." : "Crear empleado"}
        </button>
      </footer>
    </form>
  );
}
