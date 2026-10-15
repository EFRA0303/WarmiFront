import "server-only";

import { cache } from "react";
import { backendUrl } from "@/lib/backend";
import type { CompanyBranding } from "@/lib/types";

type PublicCompanyResponse = {
  nombre_comercial?: unknown;
  logo_disponible?: unknown;
  eslogan_principal?: unknown;
  titulo_login?: unknown;
  descripcion_corta?: unknown;
  fondo_login_disponible?: unknown;
  fondo_panel_login_disponible?: unknown;
};

const FALLBACK_IDENTITY: CompanyBranding = {
  name: "SPA",
  tagline: "Cuidar de cada paciente comienza con una mejor organización.",
  loginTitle: "Ingresa a tu espacio",
  shortDescription:
    "Gestiona tratamientos, historias y seguimiento desde un espacio pensado para acompañar el bienestar de tus pacientes.",
  hasLogo: false,
  hasLoginBackground: false,
  hasLoginPanelBackground: false,
};

const safeText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const safeOptionalText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const getPublicCompanyIdentity = cache(async (): Promise<CompanyBranding> => {
  try {
    const response = await fetch(backendUrl("/empresa/identidad-publica"), {
      cache: "no-store",
    });
    if (!response.ok) return FALLBACK_IDENTITY;

    const data = (await response.json()) as PublicCompanyResponse;
    const name =
      typeof data.nombre_comercial === "string"
        ? data.nombre_comercial.trim()
        : "";

    return {
      name: name || FALLBACK_IDENTITY.name,
      tagline: safeText(
        data.eslogan_principal,
        FALLBACK_IDENTITY.tagline,
      ),
      loginTitle: safeText(data.titulo_login, FALLBACK_IDENTITY.loginTitle),
      shortDescription: safeOptionalText(data.descripcion_corta),
      hasLogo: Boolean(name && data.logo_disponible === true),
      hasLoginBackground: Boolean(
        name && data.fondo_login_disponible === true,
      ),
      hasLoginPanelBackground: Boolean(
        name && data.fondo_panel_login_disponible === true,
      ),
    };
  } catch {
    return FALLBACK_IDENTITY;
  }
});
