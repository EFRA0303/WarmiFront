"use client";

import { useActionState, useRef, useState } from "react";
import { updatePatient } from "@/app/dashboard/pacientes/actions";
import { updateStaff } from "@/app/dashboard/personal/actions";
import { CloseIcon, EditIcon } from "@/components/icons";
import { PersonFields } from "@/components/person-fields";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import type { PatientListItem, RegistrationState, StaffListItem } from "@/lib/types";

const initialState: RegistrationState = {};

function EditDialog({
  title,
  description,
  label,
  patient,
  staff,
}: {
  title: string;
  description: string;
  label: string;
  patient?: PatientListItem;
  staff?: StaffListItem;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const close = () => {
    dialogRef.current?.close();
    setFormKey((current) => current + 1);
  };

  return (
    <>
      <button
        className="directory-edit"
        type="button"
        title={label}
        aria-label={label}
        onClick={() => dialogRef.current?.showModal()}
      >
        <EditIcon />
        <span>Editar</span>
      </button>
      <dialog
        ref={dialogRef}
        className="registration-dialog"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="registration-dialog__panel">
          <header className="registration-dialog__header">
            <div>
              <span className="page-eyebrow">EDITAR INFORMACIÓN</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar ventana">
              <CloseIcon />
            </button>
          </header>
          <div className="registration-dialog__body" key={formKey}>
            {patient && <PatientEditForm patient={patient} close={close} />}
            {staff && <StaffEditForm staff={staff} close={close} />}
          </div>
        </div>
      </dialog>
    </>
  );
}

function PatientEditForm({ patient, close }: { patient: PatientListItem; close: () => void }) {
  const action = updatePatient.bind(null, patient.id_paciente);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="registration-form" action={formAction}>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>1</span>
          <div><h2>Datos personales</h2><p>Actualiza la identificación y los medios de contacto.</p></div>
        </div>
        <PersonFields state={state} person={patient.persona} />
      </section>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>2</span>
          <div><h2>Información del paciente</h2><p>Modifica la información complementaria de su registro.</p></div>
        </div>
        <div className="registration-grid">
          <label className="registration-field registration-field--wide">
            <span>Ocupación</span>
            <input name="ocupacion" maxLength={60} defaultValue={patient.ocupacion ?? ""} />
          </label>
        </div>
      </section>
      {state.message && !state.outcome && <div className="registration-alert" role="alert">{state.message}</div>}
      {state.resultId && state.outcome && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}
      <footer className="registration-footer">
        <button type="button" className="registration-cancel" onClick={close}>Cancelar</button>
        <button type="submit" className="registration-submit" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
      </footer>
    </form>
  );
}

function StaffEditForm({ staff, close }: { staff: StaffListItem; close: () => void }) {
  const action = updateStaff.bind(null, staff.id_personal);
  const [state, formAction, pending] = useActionState(action, initialState);
  const person = staff.usuario.persona;
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form className="registration-form" action={formAction}>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>1</span>
          <div><h2>Datos personales</h2><p>Actualiza la identificación y los medios de contacto.</p></div>
        </div>
        <PersonFields state={state} person={person} />
      </section>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>2</span>
          <div><h2>Cuenta de acceso</h2><p>Modifica el correo o nombre de usuario sin cambiar la contraseña.</p></div>
        </div>
        <div className="registration-grid">
          <label className="registration-field">
            <span>Correo de acceso <b>*</b></span>
            <input name="correo_acceso" type="email" maxLength={150} required defaultValue={staff.usuario.correo_acceso} aria-invalid={Boolean(error("correo_acceso"))} />
            {error("correo_acceso") && <small>{error("correo_acceso")}</small>}
          </label>
          <label className="registration-field">
            <span>Nombre de usuario</span>
            <input name="nombre_usuario" maxLength={50} defaultValue={staff.usuario.nombre_usuario ?? ""} />
          </label>
        </div>
      </section>
      <section className="registration-section">
        <div className="registration-section__heading">
          <span>3</span>
          <div><h2>Datos laborales</h2><p>Actualiza la función y fecha de ingreso del empleado.</p></div>
        </div>
        <div className="registration-grid registration-grid--three">
          <label className="registration-field">
            <span>Profesión <b>*</b></span>
            <input name="profesion" maxLength={80} required defaultValue={staff.profesion} aria-invalid={Boolean(error("profesion"))} />
            {error("profesion") && <small>{error("profesion")}</small>}
          </label>
          <label className="registration-field">
            <span>Cargo <b>*</b></span>
            <input name="cargo" maxLength={80} required defaultValue={staff.cargo} aria-invalid={Boolean(error("cargo"))} />
            {error("cargo") && <small>{error("cargo")}</small>}
          </label>
          <label className="registration-field">
            <span>Fecha de ingreso <b>*</b></span>
            <input name="fecha_ingreso" type="date" required defaultValue={staff.fecha_ingreso.slice(0, 10)} aria-invalid={Boolean(error("fecha_ingreso"))} />
            {error("fecha_ingreso") && <small>{error("fecha_ingreso")}</small>}
          </label>
        </div>
      </section>
      {state.message && !state.outcome && <div className="registration-alert" role="alert">{state.message}</div>}
      {state.resultId && state.outcome && <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} />}
      <footer className="registration-footer">
        <button type="button" className="registration-cancel" onClick={close}>Cancelar</button>
        <button type="submit" className="registration-submit" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
      </footer>
    </form>
  );
}

export function PatientEditDialog({ patient }: { patient: PatientListItem }) {
  return (
    <EditDialog title="Editar paciente" description="Los cambios se guardarán en su registro personal y clínico." label={`Editar a ${patient.persona.nombre}`} patient={patient} />
  );
}

export function StaffEditDialog({ staff }: { staff: StaffListItem }) {
  return (
    <EditDialog title="Editar empleado" description="Los cambios se guardarán en sus datos personales, de acceso y laborales." label={`Editar a ${staff.usuario.persona.nombre}`} staff={staff} />
  );
}
