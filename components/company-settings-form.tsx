"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveCompany } from "@/app/dashboard/operaciones/actions";
import {
  ArrowIcon,
  BriefcaseIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SettingsIcon,
  UploadIcon,
  UserSettingsIcon,
} from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { FormattedPhone } from "@/components/formatted-phone";
import type { Company, CurrencyOption, RegistrationState } from "@/lib/types";

const initialState: RegistrationState = {};

function FieldError({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? (
    <small className="session-error">{state.fieldErrors[name]}</small>
  ) : null;
}

function CompanyDetail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="company-detail">
      <span className="company-detail__icon">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

function CompanyLogoField({
  company,
  state,
  disabled = false,
}: {
  company?: Company;
  state: RegistrationState;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string>();

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="company-logo-control">
      <label
        className={`company-logo-picker${disabled ? " company-logo-picker--disabled" : ""}`}
        title={company?.logo_url ? "Cambiar imagen" : "Seleccionar imagen"}
      >
        <input
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (preview) URL.revokeObjectURL(preview);
            setPreview(file ? URL.createObjectURL(file) : undefined);
          }}
        />
        <span className="company-logo-picker__preview">
          {preview || company?.logo_url ? (
            <Image
              src={preview || `/api/companies/${company!.id_empresa}/logo`}
              alt="Vista previa del logo"
              width={92}
              height={92}
              unoptimized
            />
          ) : (
            <UploadIcon />
          )}
          <span className="company-logo-picker__overlay">
            <UploadIcon />
            {company?.logo_url || preview ? "Cambiar imagen" : "Seleccionar imagen"}
          </span>
        </span>
      </label>
      <FieldError state={state} name="logo" />
    </div>
  );
}

function splitPreviewTagline(tagline: string) {
  const separator = tagline.indexOf(",");
  if (separator < 0) return { lead: tagline, accent: "" };
  return {
    lead: tagline.slice(0, separator + 1).trim(),
    accent: tagline.slice(separator + 1).trim(),
  };
}

function splitPreviewLoginTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length < 3) {
    return { lead: words.slice(0, -1).join(" "), accent: words.at(-1) ?? title };
  }
  return {
    lead: words.slice(0, -2).join(" "),
    accent: words.slice(-2).join(" "),
  };
}

function CompanyLoginPreviewScene({
  company,
  heroSource,
  panelSource,
  heroAction,
  panelAction,
  editor = false,
}: {
  company?: Company;
  heroSource?: string;
  panelSource?: string;
  heroAction?: ReactNode;
  panelAction?: ReactNode;
  editor?: boolean;
}) {
  const companyName = company?.nombre_comercial || "SPA";
  const tagline = splitPreviewTagline(
    company?.eslogan_principal ||
      "Cuidar de cada paciente comienza con una mejor organización.",
  );
  const loginTitle = splitPreviewLoginTitle(
    company?.titulo_login || "Ingresa a tu espacio",
  );
  const logo = company?.logo_url
    ? `/api/companies/${company.id_empresa}/logo`
    : undefined;

  return (
    <div
      className={`company-login-preview${editor ? " company-login-preview--editor" : ""}`}
      role={heroAction || panelAction ? undefined : "img"}
      aria-label={heroAction || panelAction
        ? undefined
        : `Vista previa de la pantalla de acceso de ${companyName}`}
    >
      <section className="company-login-preview__hero">
        {heroSource && (
          <Image
            className="company-login-preview__background company-login-preview__background--hero"
            src={heroSource}
            alt=""
            fill
            sizes="(max-width: 720px) 46vw, 38vw"
            unoptimized
          />
        )}
        <div className="company-login-preview__hero-content">
          <div className="company-login-preview__brand">
            {logo ? (
              <Image src={logo} alt="" width={46} height={46} unoptimized />
            ) : (
              <span>{companyName.slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <strong>{companyName}</strong>
              <small>{(company?.subtitulo_panel || "Gestión integral").toUpperCase()}</small>
            </div>
          </div>
          <div className="company-login-preview__message">
            <span>{(company?.texto_superior_login || "Tu bienestar, nuestra pasión").toUpperCase()}</span>
            <h4>
              <span>{tagline.lead}</span>
              {tagline.accent && <em>{tagline.accent}</em>}
            </h4>
            {company?.descripcion_corta && <p>{company.descripcion_corta}</p>}
          </div>
        </div>
        {heroAction}
      </section>

      <section className="company-login-preview__access">
        {panelSource && (
          <Image
            className="company-login-preview__background company-login-preview__background--access"
            src={panelSource}
            alt=""
            fill
            sizes="(max-width: 720px) 54vw, 42vw"
            unoptimized
          />
        )}
        <div className="company-login-preview__card">
          {logo && (
            <span className="company-login-preview__card-logo">
              <Image src={logo} alt="" width={54} height={54} unoptimized />
            </span>
          )}
          <span className="company-login-preview__welcome">
            <i /> BIENVENIDO DE VUELTA
          </span>
          <h4>
            {loginTitle.lead}{" "}
            <em>{loginTitle.accent}</em>
          </h4>
          <small className="company-login-preview__subtitle">{(company?.subtitulo_panel || "Gestión integral").toUpperCase()}</small>
          <p>
            Usa tus credenciales para continuar en <strong>{companyName}</strong>.
          </p>

          <div className="company-login-preview__form">
            <div className="company-login-preview__group">
              <b>Correo o nombre de usuario</b>
              <span className="company-login-preview__control">
                <UserSettingsIcon />
                <i>tu@correo.com o tu usuario</i>
              </span>
            </div>
            <div className="company-login-preview__group">
              <span className="company-login-preview__labels">
                <b>Contraseña</b>
                <i>¿Olvidaste tu contraseña?</i>
              </span>
              <span className="company-login-preview__control">
                <LockIcon />
                <i>Ingresa tu contraseña</i>
                <EyeIcon />
              </span>
            </div>
            <span className="company-login-preview__submit">
              Iniciar sesión <ArrowIcon />
            </span>
          </div>

          <span className="company-login-preview__divider">✦</span>
          <div className="company-login-preview__security">
            <span>✓</span>
            <p>Conexión segura. Tus credenciales se procesan de forma protegida.</p>
          </div>
        </div>
        {panelAction}
      </section>
    </div>
  );
}

function CompanyLoginBackgroundEditor({
  company,
  state,
}: {
  company?: Company;
  state: RegistrationState;
}) {
  const [heroPreview, setHeroPreview] = useState<string>();
  const [panelPreview, setPanelPreview] = useState<string>();
  const heroSource = heroPreview || (company?.imagen_fondo_login_url
    ? "/api/company-brand/login-background"
    : undefined);
  const panelSource = panelPreview || (company?.imagen_fondo_panel_login_url
    ? "/api/company-brand/login-panel-background"
    : undefined);

  useEffect(
    () => () => {
      if (heroPreview) URL.revokeObjectURL(heroPreview);
      if (panelPreview) URL.revokeObjectURL(panelPreview);
    },
    [heroPreview, panelPreview],
  );

  return (
    <div className="company-login-editor session-wide">
      <div className="company-login-editor__heading">
        <div>
          <strong>Previsualización del login</strong>
          <small>Cambia cada imagen directamente desde el panel donde se mostrará.</small>
        </div>
        <span>JPG, JPEG, PNG o WEBP · Máximo 8 MB</span>
      </div>

      <CompanyLoginPreviewScene
        company={company}
        heroSource={heroSource}
        panelSource={panelSource}
        editor
        heroAction={(
          <label className="company-login-preview__change">
            <input
              name="fondo_login"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (heroPreview) URL.revokeObjectURL(heroPreview);
                setHeroPreview(file ? URL.createObjectURL(file) : undefined);
              }}
            />
            <UploadIcon />
            {heroSource ? "Cambiar portada" : "Seleccionar portada"}
          </label>
        )}
        panelAction={(
          <label className="company-login-preview__change">
            <input
              name="fondo_panel_login"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (panelPreview) URL.revokeObjectURL(panelPreview);
                setPanelPreview(file ? URL.createObjectURL(file) : undefined);
              }}
            />
            <UploadIcon />
            {panelSource ? "Cambiar fondo" : "Seleccionar fondo"}
          </label>
        )}
      />

      <div className="company-login-editor__footer">
        <span>Las imágenes se convertirán a WEBP cuando guardes la información.</span>
        <FieldError state={state} name="fondo_login" />
        <FieldError state={state} name="fondo_panel_login" />
      </div>
    </div>
  );
}

export function CompanySettingsForm({
  company,
  currencies,
  canCreate,
  canEdit,
}: {
  company?: Company;
  currencies: CurrencyOption[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!company && canCreate);
  const [handledResultId, setHandledResultId] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    saveCompany.bind(null, company?.id_empresa ?? null),
    initialState,
  );

  if (!company && !canCreate)
    return (
      <div className="directory-message">
        <b>!</b>
        <div>
          <h2>Empresa sin configurar</h2>
          <p>Tu cuenta no tiene permiso para registrar los datos institucionales.</p>
        </div>
      </div>
    );

  if (company && !editing)
    return (
      <section className="company-profile-card">
        <div className="company-profile-card__accent" aria-hidden="true" />
        {canEdit && (
          <button
            className="company-profile-card__edit"
            type="button"
            aria-label="Editar empresa"
            title="Editar empresa"
            onClick={() => {
              setHandledResultId(state.resultId);
              setEditing(true);
            }}
          >
            <EditIcon />
          </button>
        )}

        <div className="company-profile-card__identity">
          {company.logo_url ? (
            <Image
              src={`/api/companies/${company.id_empresa}/logo`}
              alt={`Logo de ${company.nombre_comercial}`}
              width={94}
              height={94}
              unoptimized
            />
          ) : (
            <span className="company-settings-card__logo-placeholder">WS</span>
          )}
          <div>
            <span className="company-profile-card__eyebrow">IDENTIDAD INSTITUCIONAL</span>
            <h2>{company.nombre_comercial}</h2>
            <p>{company.razon_social || "Sin razón social registrada"}</p>
          </div>
        </div>

        <dl className="company-profile-card__details">
          <CompanyDetail icon={<FileTextIcon />} label="NIT">
            {company.nit || "No registrado"}
          </CompanyDetail>
          <CompanyDetail icon={<BriefcaseIcon />} label="Actividad económica">
            {company.actividad_economica || "No registrada"}
          </CompanyDetail>
          <CompanyDetail icon={<MapPinIcon />} label="Dirección">
            {company.direccion || "No registrada"}
          </CompanyDetail>
          <CompanyDetail icon={<PhoneIcon />} label="Teléfonos">
            <span className="company-phone-list">
              <FormattedPhone value={company.telefono1} fallback="No registrado" />
              {company.telefono2 && <FormattedPhone value={company.telefono2} />}
            </span>
          </CompanyDetail>
          <CompanyDetail icon={<MailIcon />} label="Correo">
            {company.correo || "No registrado"}
          </CompanyDetail>
          <CompanyDetail icon={<GlobeIcon />} label="Sitio web">
            {company.sitio_web || "No registrado"}
          </CompanyDetail>
          <CompanyDetail icon={<SettingsIcon />} label="Moneda">
            {company.moneda}
          </CompanyDetail>
        </dl>
        <section className="company-brand-summary">
          <div className="company-brand-summary__copy">
            <span className="company-profile-card__eyebrow">EXPERIENCIA Y APARIENCIA</span>
            <h3>{company.titulo_login || "Ingresa a tu espacio"}</h3>
            <strong>{company.eslogan_principal || "Tema institucional predeterminado"}</strong>
            {company.descripcion_corta && <p>{company.descripcion_corta}</p>}
          </div>
          <div className="company-brand-summary__visual">
            <span className="company-brand-summary__preview-label">Vista previa del acceso</span>
            <CompanyLoginPreviewScene
              company={company}
              heroSource={company.imagen_fondo_login_url
                ? "/api/company-brand/login-background"
                : undefined}
              panelSource={company.imagen_fondo_panel_login_url
                ? "/api/company-brand/login-panel-background"
                : undefined}
            />
            <small className="company-brand-summary__preview-help">
              Así se combinarán la portada izquierda y el fondo del panel de acceso.
            </small>
          </div>
        </section>
      </section>
    );

  const fields: Array<{
    name: keyof Company;
    label: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }> = [
    { name: "nombre_comercial", label: "Nombre comercial", required: true },
    { name: "subtitulo_panel", label: "Subtítulo (menú y login)", placeholder: "Ej. Gestión integral" },
    { name: "razon_social", label: "Razón social" },
    { name: "nit", label: "NIT" },
    { name: "actividad_economica", label: "Actividad económica" },
    { name: "correo", label: "Correo", type: "email" },
    { name: "direccion", label: "Dirección" },
    { name: "sitio_web", label: "Sitio web", type: "url" },
  ];

  return (
    <section className="company-settings-card">
      <form ref={formRef} action={action} className="session-form company-settings-form">
        <header className="company-settings-card__header">
          <div className="company-settings-card__identity">
            <CompanyLogoField company={company} state={state} disabled={pending} />
            <div>
              <span className="page-eyebrow">
                {company ? "EDITAR EMPRESA" : "REGISTRAR EMPRESA"}
              </span>
              <h2>{company?.nombre_comercial || "Datos de la empresa"}</h2>
              <p>
                Completa la información comercial, fiscal y de contacto.
              </p>
            </div>
          </div>
        </header>

        <fieldset disabled={!editing || pending}>
          <section className="company-form-section">
            <header>
              <span>01</span>
              <div><h3>Información institucional</h3><p>Datos comerciales, fiscales y de contacto.</p></div>
            </header>
          <div className="session-grid">
            {fields.map(({ name, label, type = "text", required, placeholder }) => (
              <label key={name}>
                <span>{label}{required ? " *" : ""}</span>
                <input
                  name={name}
                  type={type}
                  required={required}
                  maxLength={name === "actividad_economica" ? 180 : name === "subtitulo_panel" ? 40 : undefined}
                  placeholder={placeholder}
                  defaultValue={String(
                    company?.[name] ?? "",
                  )}
                />
                <FieldError state={state} name={name} />
              </label>
            ))}
            <InternationalPhoneInput
              name="telefono1"
              label="Teléfono principal"
              defaultValue={company?.telefono1}
              error={state.fieldErrors?.telefono1}
            />
            <InternationalPhoneInput
              name="telefono2"
              label="Teléfono alternativo"
              defaultValue={company?.telefono2}
              error={state.fieldErrors?.telefono2}
            />
            <div className="company-currency-field">
              <span>Moneda *</span>
              <CurrencyCombobox
                currencies={currencies}
                defaultValue={company?.moneda ?? "BOB"}
              />
              <FieldError state={state} name="moneda" />
            </div>
          </div>
          </section>

          <section className="company-form-section">
            <header>
              <span>02</span>
              <div><h3>Personalización del login</h3><p>Adapta los mensajes y la portada a la identidad de tu negocio.</p></div>
            </header>
            <div className="session-grid">
              <label className="session-wide">
                <span>Eslogan principal</span>
                <textarea name="eslogan_principal" className="company-slogan-input" maxLength={180} rows={4} defaultValue={company?.eslogan_principal ?? ""} placeholder={"Ej.\nCuida de ti,\npor dentro y\npor fuera."} />
                <small className="company-field-hint">Cada línea que escribas se verá en un renglón aparte en la portada. La parte después de la primera coma se resalta con el color de la marca.</small>
                <FieldError state={state} name="eslogan_principal" />
              </label>
              <label>
                <span>Texto superior del login</span>
                <input name="texto_superior_login" maxLength={60} defaultValue={company?.texto_superior_login ?? ""} placeholder="Ej. Tu bienestar, nuestra pasión" />
                <FieldError state={state} name="texto_superior_login" />
              </label>
              <label>
                <span>Título destacado del login</span>
                <input name="titulo_login" maxLength={180} defaultValue={company?.titulo_login ?? ""} placeholder="Ej. Ingresa a tu espacio" />
                <FieldError state={state} name="titulo_login" />
              </label>
              <label className="session-wide">
                <span>Descripción corta</span>
                <textarea name="descripcion_corta" maxLength={320} rows={3} defaultValue={company?.descripcion_corta ?? ""} placeholder="Describe brevemente la experiencia de tu empresa." />
                <FieldError state={state} name="descripcion_corta" />
              </label>
              <CompanyLoginBackgroundEditor company={company} state={state} />
            </div>
          </section>

        </fieldset>

        {editing && (
          <footer>
            {company && (
              <button
                type="button"
                onClick={() => {
                  formRef.current?.reset();
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
            )}
            <button className="directory-primary" type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar información"}
            </button>
          </footer>
        )}
      </form>

      {state.resultId && state.resultId !== handledResultId && (
        <SubmissionResultDialog
          key={state.resultId}
          state={state}
          onSuccess={() => {
            setHandledResultId(state.resultId);
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
