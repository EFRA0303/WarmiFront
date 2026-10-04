"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerPatient } from "@/app/dashboard/pacientes/actions";
import { PersonFields } from "@/components/person-fields";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import type { RegistrationState } from "@/lib/types";

const initialState: RegistrationState = {};

export function PatientRegistrationForm({ onCancel, onSuccess }: { onCancel?: () => void; onSuccess?: () => void }) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const finishSuccess = () => onSuccess ? onSuccess() : router.push("/dashboard/pacientes");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setState(await registerPatient(initialState, formData)));
  }

  return (
    <form className="registration-form" onSubmit={submit}>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>1</span>
          <div>
            <h2>Datos personales</h2>
            <p>Información de identificación y contacto del paciente.</p>
          </div>
        </div>
        <PersonFields state={state} />
      </section>

      <section className="registration-section">
        <div className="registration-section__heading">
          <span>2</span>
          <div>
            <h2>Información del paciente</h2>
            <p>Este registro no crea una cuenta para ingresar al sistema.</p>
          </div>
        </div>
        <div className="registration-grid">
          <label className="registration-field registration-field--wide">
            <span>Ocupación</span>
            <input name="ocupacion" maxLength={60} placeholder="Ej. Docente, comerciante..." />
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
          <Link href="/dashboard/pacientes" className="registration-cancel">Cancelar</Link>
        )}
        <button type="submit" className="registration-submit" disabled={pending}>
          {pending ? "Registrando..." : "Registrar paciente"}
        </button>
      </footer>
    </form>
  );
}
