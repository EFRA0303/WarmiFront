import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { getPublicCompanyIdentity } from "@/lib/public-company";
import { CompanyLogo } from "./company-logo";
import { LoginForm } from "./login-form";
import "./login.css";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

function splitTagline(tagline: string) {
  const separator = tagline.indexOf(",");
  if (separator < 0) return { lead: tagline, accent: "" };
  return {
    lead: tagline.slice(0, separator + 1).trim(),
    accent: tagline.slice(separator + 1).trim(),
  };
}

function splitLoginTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length < 3) {
    return { lead: words.slice(0, -1).join(" "), accent: words.at(-1) ?? title };
  }
  return {
    lead: words.slice(0, -2).join(" "),
    accent: words.slice(-2).join(" "),
  };
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const company = await getPublicCompanyIdentity();
  const tagline = splitTagline(company.tagline);
  const loginTitle = splitLoginTitle(company.loginTitle);
  const heroStyle = company.hasLoginBackground
    ? ({
        "--login-background-image":
          "url('/api/company-brand/login-background')",
      } as CSSProperties)
    : undefined;
  const panelStyle = company.hasLoginPanelBackground
    ? ({
        "--login-panel-background-image":
          "url('/api/company-brand/login-panel-background')",
      } as CSSProperties)
    : undefined;

  return (
    <main className="login-shell">
      <section
        className={`login-hero${company.hasLoginBackground ? " login-hero--branded" : ""}`}
        style={heroStyle}
      >
        <div className="hero-glow hero-glow--one" />
        <div className="hero-glow hero-glow--two" />
        <div className="hero-grid" />

        <div className="hero-content">
          <Brand
            inverse
            name={company.name}
            subtitle="Estética & bienestar"
            logoSrc={company.hasLogo ? "/api/company-brand/logo" : undefined}
          />
          <div className="hero-message">
            <span className="hero-eyebrow">TU BIENESTAR, NUESTRA PASIÓN</span>
            <h1>
              <span>{tagline.lead}</span>
              {tagline.accent && <em>{tagline.accent}</em>}
            </h1>
            {company.shortDescription && <p>{company.shortDescription}</p>}
          </div>
        </div>
      </section>

      <section
        className={`login-panel${company.hasLoginPanelBackground ? " login-panel--branded" : ""}`}
        style={panelStyle}
      >
        <span className="login-panel__leaf login-panel__leaf--top" aria-hidden="true" />
        <span className="login-panel__leaf login-panel__leaf--bottom" aria-hidden="true" />
        <div className="mobile-brand">
          <Brand
            name={company.name}
            subtitle="Gestión integral"
            logoSrc={company.hasLogo ? "/api/company-brand/logo" : undefined}
          />
        </div>
        <div className="login-card">
          <div className="login-heading">
            {company.hasLogo && (
              <CompanyLogo companyName={company.name} />
            )}
            <span className="welcome-pill">
              <span /> Bienvenido de vuelta
            </span>
            <h2>
              {loginTitle.lead}{" "}
              <em>{loginTitle.accent}</em>
            </h2>
            <p>
              Usa tus credenciales para continuar en{" "}
              <strong>{company.name}</strong>.
            </p>
          </div>
          <LoginForm />
          <div className="login-divider" aria-hidden="true"><span>✦</span></div>
          <div className="login-security">
            <span aria-hidden="true">✓</span>
            <p>
              Conexión segura. Tus credenciales se procesan de forma protegida.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
