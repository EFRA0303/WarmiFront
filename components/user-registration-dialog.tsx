"use client";

import {
  type FocusEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  getUserCreationOptions,
  registerPatientUser,
  type UserCreationOptions,
} from "@/app/dashboard/usuarios/actions";
import { checkRegistrationAvailability } from "@/app/dashboard/registration-actions";
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  UserSettingsIcon,
} from "@/components/icons";
import { PasswordStrength } from "@/components/password-strength";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import type { RegistrationState } from "@/lib/types";

const initialState: RegistrationState = {};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function UserRegistrationDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [options, setOptions] = useState<UserCreationOptions | null>(null);
  const [loadError, setLoadError] = useState("");
  const [state, setState] = useState<RegistrationState>(initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [patientMenuOpen, setPatientMenuOpen] = useState(false);
  const [availability, setAvailability] = useState<
    Record<string, { available?: boolean; message: string }>
  >({});
  const [loading, startLoading] = useTransition();
  const [pending, startTransition] = useTransition();
  const [checking, startChecking] = useTransition();

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of Object.values(activeTimers)) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function closePatientMenu(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !patientSearchRef.current?.contains(event.target)
      ) {
        setPatientMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closePatientMenu);
    return () => document.removeEventListener("pointerdown", closePatientMenu);
  }, []);

  function open() {
    setOptions(null);
    setLoadError("");
    setState(initialState);
    setPassword("");
    setShowPassword(false);
    setPatientQuery("");
    setSelectedPersonId("");
    setPatientMenuOpen(false);
    setAvailability({});
    dialogRef.current?.showModal();
    startLoading(async () => {
      const result = await getUserCreationOptions();
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setOptions(result.value);
    });
  }

  function close() {
    if (pending) return;
    dialogRef.current?.close();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () =>
      setState(await registerPatientUser(initialState, formData)),
    );
  }

  function runUniqueCheck(
    field: "correo_acceso" | "nombre_usuario",
    input: HTMLInputElement,
  ) {
    const value = input.value.trim();
    input.setCustomValidity("");
    if (!value) {
      setAvailability((current) => ({
        ...current,
        [field]: { available: true, message: "" },
      }));
      return;
    }

    setAvailability((current) => ({
      ...current,
      [field]: { message: "Verificando disponibilidad..." },
    }));
    startChecking(async () => {
      const result = await checkRegistrationAvailability(field, value);
      if (input.value.trim() !== value) return;
      input.setCustomValidity(
        result.ok && result.available === false ? result.message : "",
      );
      setAvailability((current) => ({
        ...current,
        [field]: { available: result.available, message: result.message },
      }));
    });
  }

  function scheduleUniqueCheck(
    field: "correo_acceso" | "nombre_usuario",
    input: HTMLInputElement,
  ) {
    input.setCustomValidity("");
    clearTimeout(timers.current[field]);
    setAvailability((current) => ({
      ...current,
      [field]: { message: "" },
    }));
    if (!input.value.trim()) return;
    timers.current[field] = setTimeout(() => runUniqueCheck(field, input), 550);
  }

  function checkUniqueOnBlur(
    field: "correo_acceso" | "nombre_usuario",
    event: FocusEvent<HTMLInputElement>,
  ) {
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

  const error = (name: string) => state.fieldErrors?.[name];
  const filteredPatients = useMemo(() => {
    if (!options) return [];
    const search = normalizeSearch(patientQuery.trim());
    if (!search) return options.patients;
    return options.patients.filter((patient) =>
      normalizeSearch(`${patient.nombre_completo} ${patient.ci ?? ""}`).includes(search),
    );
  }, [options, patientQuery]);
  const patientRoleId = options?.roles.find(
    (role) => role.nombre.trim().toLocaleUpperCase("es") === "PACIENTE",
  )?.id_rol;

  return (
    <>
      <button className="directory-primary" type="button" onClick={open}>
        <UserSettingsIcon />Nuevo usuario
      </button>
      <dialog
        ref={dialogRef}
        className="registration-dialog user-registration-dialog"
        onCancel={(event) => pending && event.preventDefault()}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="registration-dialog__panel">
          <header className="registration-dialog__header">
            <div>
              <span className="page-eyebrow">NUEVA CUENTA</span>
              <h2>Crear usuario</h2>
              <p>Selecciona un paciente sin cuenta y define sus datos de acceso.</p>
            </div>
            <button type="button" onClick={close} disabled={pending} aria-label="Cerrar ventana">
              <CloseIcon />
            </button>
          </header>
          <div className="registration-dialog__body">
            {loading && (
              <div className="user-registration-state" role="status">
                <span className="user-registration-spinner" aria-hidden="true" />
                <strong>Cargando pacientes y roles...</strong>
              </div>
            )}
            {loadError && (
              <div className="registration-alert" role="alert">{loadError}</div>
            )}
            {options && !options.patients.length && (
              <div className="user-registration-state">
                <strong>No hay pacientes disponibles</strong>
                <p>Todos los pacientes activos ya tienen una cuenta de usuario.</p>
              </div>
            )}
            {options && options.patients.length > 0 && (
              <form className="registration-form" onSubmit={submit}>
                <section className="registration-section">
                  <div className="registration-section__heading">
                    <span>1</span>
                    <div>
                      <h2>Paciente y rol</h2>
                      <p>La cuenta quedará vinculada al registro seleccionado.</p>
                    </div>
                  </div>
                  <div className="registration-grid">
                    <label className="registration-field">
                      <span>Paciente <b>*</b></span>
                      <div className="patient-user-search" ref={patientSearchRef}>
                        <input
                          type="search"
                          value={patientQuery}
                          placeholder="Buscar por nombre, apellido o CI..."
                          autoComplete="off"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-expanded={patientMenuOpen}
                          aria-controls="patient-user-options"
                          aria-invalid={Boolean(error("id_persona"))}
                          onFocus={() => setPatientMenuOpen(true)}
                          onChange={(event) => {
                            setPatientQuery(event.target.value);
                            setSelectedPersonId("");
                            setPatientMenuOpen(true);
                          }}
                        />
                        <input type="hidden" name="id_persona" value={selectedPersonId} />
                        {patientMenuOpen && (
                          <div className="patient-user-search__options" id="patient-user-options" role="listbox">
                            {filteredPatients.length ? filteredPatients.map((patient) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected={selectedPersonId === String(patient.id_persona)}
                                key={patient.id_paciente}
                                onClick={() => {
                                  setSelectedPersonId(String(patient.id_persona));
                                  setPatientQuery(
                                    `${patient.nombre_completo}${patient.ci ? ` · CI ${patient.ci}` : ""}`,
                                  );
                                  setPatientMenuOpen(false);
                                }}
                              >
                                <strong>{patient.nombre_completo}</strong>
                                <small>{patient.ci ? `CI ${patient.ci}` : "Sin CI registrado"}</small>
                              </button>
                            )) : (
                              <p>No encontramos pacientes con ese dato.</p>
                            )}
                          </div>
                        )}
                      </div>
                      {error("id_persona") && <small>{error("id_persona")}</small>}
                    </label>
                    <label className="registration-field">
                      <span>Rol <b>*</b></span>
                      <select name="id_rol" defaultValue={patientRoleId ? String(patientRoleId) : ""} required aria-invalid={Boolean(error("id_rol"))}>
                        <option value="" disabled>Seleccionar rol</option>
                        {options.roles.map((role) => (
                          <option value={role.id_rol} key={role.id_rol}>{role.nombre}</option>
                        ))}
                      </select>
                      {error("id_rol") && <small>{error("id_rol")}</small>}
                    </label>
                  </div>
                </section>

                <section className="registration-section">
                  <div className="registration-section__heading">
                    <span>2</span>
                    <div>
                      <h2>Datos de acceso</h2>
                      <p>El paciente utilizará estas credenciales para iniciar sesión.</p>
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
                      <input name="nombre_usuario" maxLength={50} placeholder="Opcional" onInput={(event) => scheduleUniqueCheck("nombre_usuario", event.currentTarget)} onBlur={(event) => checkUniqueOnBlur("nombre_usuario", event)} aria-invalid={Boolean(error("nombre_usuario"))} />
                      {error("nombre_usuario") && <small>{error("nombre_usuario")}</small>}
                      {feedback("nombre_usuario")}
                    </label>
                    <label className="registration-field">
                      <span>Contraseña temporal <b>*</b></span>
                      <span className="registration-password">
                        <input name="contrasena" type={showPassword ? "text" : "password"} minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error("contrasena"))} />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </span>
                      {error("contrasena") && <small>{error("contrasena")}</small>}
                      <PasswordStrength password={password} />
                    </label>
                    <label className="registration-field">
                      <span>Confirmar contraseña <b>*</b></span>
                      <input name="confirmar_contrasena" type={showPassword ? "text" : "password"} minLength={12} maxLength={72} required aria-invalid={Boolean(error("confirmar_contrasena"))} />
                      {error("confirmar_contrasena") && <small>{error("confirmar_contrasena")}</small>}
                    </label>
                  </div>
                </section>

                {state.message && !state.outcome && (
                  <div className="registration-alert" role="alert">{state.message}</div>
                )}
                {state.resultId && state.outcome && (
                  <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />
                )}
                <footer className="registration-footer">
                  <button type="button" className="registration-cancel" onClick={close} disabled={pending}>Cancelar</button>
                  <button type="submit" className="registration-submit" disabled={pending || checking}>
                    {pending || checking ? "Verificando datos..." : "Crear usuario"}
                  </button>
                </footer>
              </form>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
