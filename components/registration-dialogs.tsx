"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { BriefcaseIcon, CloseIcon, UserSettingsIcon } from "@/components/icons";
import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { StaffRegistrationForm } from "@/components/staff-registration-form";
import type { RoleListItem } from "@/lib/types";

function DialogFrame({
  dialogRef,
  eyebrow,
  title,
  description,
  onClose,
  children,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  eyebrow: string;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="registration-dialog"
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="registration-dialog__panel">
        <header className="registration-dialog__header">
          <div>
            <span className="page-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar ventana">
            <CloseIcon />
          </button>
        </header>
        <div className="registration-dialog__body">{children}</div>
      </div>
    </dialog>
  );
}

export function PatientRegistrationDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const close = () => {
    dialogRef.current?.close();
    setFormKey((current) => current + 1);
  };
  return (
    <>
      <button className="directory-primary" type="button" onClick={() => dialogRef.current?.showModal()}>
        <UserSettingsIcon />Nuevo paciente
      </button>
      <DialogFrame dialogRef={dialogRef} eyebrow="NUEVO REGISTRO" title="Registrar paciente" description="Completa sus datos personales y de contacto." onClose={close}>
        <PatientRegistrationForm key={formKey} onCancel={close} onSuccess={close} />
      </DialogFrame>
    </>
  );
}

export function StaffRegistrationDialog({ roles }: { roles: RoleListItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const close = () => {
    dialogRef.current?.close();
    setFormKey((current) => current + 1);
  };
  return (
    <>
      <button className="directory-primary" type="button" onClick={() => dialogRef.current?.showModal()}>
        <BriefcaseIcon />Nuevo empleado
      </button>
      <DialogFrame dialogRef={dialogRef} eyebrow="NUEVO EMPLEADO" title="Crear empleado" description="Registra sus datos personales, laborales y de acceso." onClose={close}>
        <StaffRegistrationForm key={formKey} roles={roles} onCancel={close} onSuccess={close} />
      </DialogFrame>
    </>
  );
}
