"use client";

const levels = [
  { label: "Muy débil", className: "very-weak" },
  { label: "Débil", className: "weak" },
  { label: "Aceptable", className: "acceptable" },
  { label: "Segura", className: "strong" },
] as const;

export function PasswordStrength({ password }: { password: string }) {
  const checks = {
    length: password.length >= 12,
    cases: /[a-záéíóúñ]/.test(password) && /[A-ZÁÉÍÓÚÑ]/.test(password),
    number: /\d/.test(password),
    symbol: /[^\p{L}\p{N}\s]/u.test(password),
  };
  const score = password ? Object.values(checks).filter(Boolean).length : 0;
  const level = levels[Math.max(0, score - 1)];
  const missing = [
    !checks.length && "12 caracteres",
    !checks.cases && "mayúsculas y minúsculas",
    !checks.number && "un número",
    !checks.symbol && "un símbolo",
  ].filter(Boolean) as string[];

  return (
    <div className={`password-strength password-strength--${level.className}`}>
      <div className="password-strength__heading">
        <span>Seguridad de la contraseña</span>
        <strong>{password ? level.label : "Sin evaluar"}</strong>
      </div>
      <div
        className="password-strength__bar"
        role="progressbar"
        aria-label="Nivel de seguridad de la contraseña"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={password ? level.label : "Sin evaluar"}
      >
        {[1, 2, 3, 4].map((segment) => (
          <span className={segment <= score ? "password-strength__segment--active" : ""} key={segment} />
        ))}
      </div>
      <small>
        {password && !missing.length
          ? "Cumple todas las recomendaciones de seguridad."
          : `Incluye ${missing.join(", ")}.`}
      </small>
    </div>
  );
}
