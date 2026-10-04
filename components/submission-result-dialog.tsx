"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import type { RegistrationState } from "@/lib/types";

export function SubmissionResultDialog({
  state,
  onSuccess,
}: {
  state: RegistrationState;
  onSuccess: () => void;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible || !state.outcome || !state.message) return null;

  const successful = state.outcome === "success";
  const close = () => {
    setVisible(false);
    if (successful) onSuccess();
  };

  return (
    <div className="submission-result__overlay" role="presentation">
      <section
        className={`submission-result submission-result--${state.outcome}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`submission-result-title-${state.resultId}`}
        aria-describedby={`submission-result-message-${state.resultId}`}
      >
        <span className="submission-result__icon" aria-hidden="true">
          {successful ? <CheckIcon /> : "!"}
        </span>
        <span className="page-eyebrow">{successful ? "REGISTRO COMPLETADO" : "NO SE PUDO REGISTRAR"}</span>
        <h2 id={`submission-result-title-${state.resultId}`}>
          {state.title ?? (successful ? "Registro exitoso" : "Revisa los datos")}
        </h2>
        <p id={`submission-result-message-${state.resultId}`}>{state.message}</p>
        <button type="button" onClick={close} autoFocus>
          {successful ? "Aceptar" : "Entendido"}
        </button>
      </section>
    </div>
  );
}
