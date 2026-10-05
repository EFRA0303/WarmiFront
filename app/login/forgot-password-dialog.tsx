"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useTransition, type FormEvent } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { CloseIcon, MailIcon } from "@/components/icons";

export type ForgotPasswordDialogHandle = { open: () => void };

export const ForgotPasswordDialog = forwardRef<ForgotPasswordDialogHandle>(function ForgotPasswordDialog(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useImperativeHandle(ref, () => ({
    open() {
      setResult(null);
      dialogRef.current?.showModal();
    },
  }), []);

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => setResult(await requestPasswordReset(email)));
  }

  return (
    <dialog
            ref={dialogRef}
            className="recovery-dialog"
            onCancel={(event) => pending && event.preventDefault()}
            onClick={(event) => {
              if (event.target === dialogRef.current) close();
            }}
          >
            <form className="recovery-dialog__content" onSubmit={submit}>
              <header>
                <span className="recovery-dialog__icon"><MailIcon /></span>
                <div>
                  <span className="hero-eyebrow">RECUPERAR ACCESO</span>
                  <h2>¿Olvidaste tu contraseña?</h2>
                  <p>Escribe el correo registrado y te enviaremos un enlace seguro.</p>
                </div>
                <button type="button" className="recovery-dialog__close" onClick={close} disabled={pending} aria-label="Cerrar">
                  <CloseIcon />
                </button>
              </header>

              <label className="recovery-dialog__field">
                <span>Correo electrónico</span>
                <div className="field-control">
                  <MailIcon className="field-control__icon" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@correo.com"
                    maxLength={150}
                    required
                    disabled={pending || Boolean(result?.ok)}
                  />
                </div>
              </label>

              {result && (
                <div className={`recovery-result recovery-result--${result.ok ? "success" : "error"}`} role="status">
                  <span aria-hidden="true">{result.ok ? "✓" : "!"}</span>
                  <p>{result.message}</p>
                </div>
              )}

              <footer>
                <button type="button" className="recovery-dialog__cancel" onClick={close} disabled={pending}>Cerrar</button>
                <button type="submit" className="recovery-dialog__submit" disabled={pending || Boolean(result?.ok)}>
                  {pending ? "Enviando..." : result?.ok ? "Enlace solicitado" : "Enviar enlace"}
                </button>
              </footer>
            </form>
    </dialog>
  );
});
