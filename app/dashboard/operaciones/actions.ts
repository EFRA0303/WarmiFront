"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import { isConfigurationAdmin } from "@/lib/configuration-access";
import type { AcquisitionStatus, RegistrationState } from "@/lib/types";
const text = (d: FormData, n: string) => {
  const v = d.get(n);
  return typeof v === "string" ? v.trim() : "";
};
const fail = (message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "error",
  title: "No se pudo completar",
  message,
});
const done = (title: string, message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "success",
  title,
  message,
});
async function mutate(path: string, method: "POST" | "PATCH", body: object) {
  const token = await getSessionToken();
  if (!token) return fail("La sesión venció.");
  try {
    const r = await fetch(backendUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok)
      return fail(
        (await readApiMessage(r)) || "La operación no pudo completarse.",
      );
  } catch {
    return fail("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard", "layout");
  return null;
}
const num = (v: string) => /^\d+(?:\.\d{1,2})?$/.test(v.replace(",", "."));
const iso = (v: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)
    ? new Date(`${v}:00-04:00`).toISOString()
    : null;
export async function createAcquisition(
  _s: RegistrationState,
  d: FormData,
): Promise<RegistrationState> {
  const patient = Number(text(d, "id_paciente")),
    offer = text(d, "offer");
  const [type, rawId] = offer.split(":");
  const id = Number(rawId),
    date = iso(text(d, "fecha_adquisicion"));
  const count = Number(text(d, "service_count"));
  const errors: Record<string, string> = {};
  if (!Number.isInteger(patient) || patient < 1)
    errors.id_paciente = "Selecciona un paciente.";
  if (!new Set(["SERVICIO", "PAQUETE", "PROMOCION"]).has(type) || !Number.isInteger(id) || id < 1)
    errors.offer = "Selecciona un servicio, paquete o promoción.";
  if (!date) errors.fecha_adquisicion = "Selecciona la fecha.";
  const detalles = [];
  for (let i = 0; i < count; i++) {
    const sid = Number(text(d, `service_id_${i}`)),
      sessions = Number(text(d, `sessions_${i}`)),
      price = text(d, `price_${i}`).replace(",", ".");
    if (!num(price)) errors[`price_${i}`] = "Ingresa un precio válido.";
    detalles.push({
      id_servicio: sid,
      sesiones_incluidas: sessions,
      precio_unitario: price,
      descuento: "0",
    });
  }
  if (!detalles.length)
    errors.offer = "La oferta no tiene servicios configurados.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const body = {
    clave_operacion: text(d, "clave_operacion"),
    id_paciente: patient,
    id_paquete: type === "PAQUETE" ? id : undefined,
    id_promocion: type === "PROMOCION" ? id : undefined,
    fecha_adquisicion: date,
    detalles,
  };
  const r = await mutate("/adquisiciones", "POST", body);
  return (
    r ??
    done(
      "Adquisición registrada",
      "Se generó la nota de venta y su saldo. Registra el primer abono en Ventas → Pagos para habilitar la asignación clínica; no se registró ningún pago automático.",
    )
  );
}
export async function changeAcquisition(
  id: number,
  estado: AcquisitionStatus,
  reason: string,
): Promise<RegistrationState> {
  const r = await mutate(`/adquisiciones/${id}`, "PATCH", { estado, motivo_anulacion: reason });
  return (
    r ??
    done(
      estado === "COMPLETADA"
        ? "Adquisición completada"
        : "Adquisición cancelada",
      "El historial se conservó.",
    )
  );
}
export async function createConsumption(
  _s: RegistrationState,
  d: FormData,
): Promise<RegistrationState> {
  return stockOperation(
    "/inventario/consumos-sesion",
    "id_sesion",
    d,
    "Consumo registrado",
  );
}
export async function createSaleOutput(
  _s: RegistrationState,
  d: FormData,
): Promise<RegistrationState> {
  return stockOperation(
    "/inventario/salidas-venta",
    "id_detalle",
    d,
    "Salida registrada",
  );
}
async function stockOperation(
  path: string,
  key: "id_sesion" | "id_detalle",
  d: FormData,
  title: string,
): Promise<RegistrationState> {
  const ref = Number(text(d, key)),
    lot = Number(text(d, "id_lote")),
    quantity = text(d, "cantidad").replace(",", ".");
  const errors: Record<string, string> = {};
  if (!Number.isInteger(ref) || ref < 1)
    errors[key] = "Selecciona el registro.";
  if (!Number.isInteger(lot) || lot < 1) errors.id_lote = "Selecciona un lote.";
  if (!num(quantity) || Number(quantity) <= 0)
    errors.cantidad = "Ingresa una cantidad mayor a cero.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const r = await mutate(path, "POST", {
    [key]: ref,
    id_lote: lot,
    cantidad: quantity,
    observaciones: text(d, "observaciones") || undefined,
  });
  return r ?? done(title, "El stock del lote fue actualizado.");
}
export async function saveCompany(
  id: number | null,
  _s: RegistrationState,
  d: FormData,
): Promise<RegistrationState> {
  const name = text(d, "nombre_comercial");
  const user = await getCurrentUser();
  if (!isConfigurationAdmin(user))
    return fail("Solo ROOT o ADMINISTRADOR puede modificar la empresa.");
  if (!name)
    return {
      fieldErrors: { nombre_comercial: "Ingresa el nombre comercial." },
    };
  const body = {
    nombre_comercial: name,
    razon_social: text(d, "razon_social") || undefined,
    nit: text(d, "nit") || undefined,
    actividad_economica: text(d, "actividad_economica") || undefined,
    telefono1: text(d, "telefono1") || undefined,
    telefono2: text(d, "telefono2") || undefined,
    correo: text(d, "correo") || undefined,
    direccion: text(d, "direccion") || undefined,
    sitio_web: text(d, "sitio_web") || undefined,
    moneda: text(d, "moneda") || "BOB",
    eslogan_principal: text(d, "eslogan_principal").replace(/\r\n?/g, "\n") || null,
    titulo_login: text(d, "titulo_login") || null,
    subtitulo_panel: text(d, "subtitulo_panel") || null,
    texto_superior_login: text(d, "texto_superior_login") || null,
    descripcion_corta: text(d, "descripcion_corta") || null,
  };
  const token = await getSessionToken();
  if (!token) return fail("La sesión venció.");
  try {
    const response = await fetch(backendUrl(id ? `/empresa/${id}` : "/empresa"), {
      method: id ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok)
      return fail((await readApiMessage(response)) || "No se pudo guardar la empresa.");
    const saved = (await response.json()) as { id_empresa: number };
    const companyId = id ?? saved.id_empresa;
    const logo = d.get("logo");
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > 5 * 1024 * 1024)
        return { fieldErrors: { logo: "El logo no puede superar los 5 MB." } };
      const upload = new FormData();
      upload.set("logo", logo);
      const logoResponse = await fetch(backendUrl(`/empresa/${companyId}/logo`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: upload,
        cache: "no-store",
      });
      if (!logoResponse.ok)
        return fail((await readApiMessage(logoResponse)) || "La empresa se guardó, pero no fue posible procesar el logo.");
    }
    const loginBackground = d.get("fondo_login");
    if (loginBackground instanceof File && loginBackground.size > 0) {
      if (loginBackground.size > 8 * 1024 * 1024)
        return {
          fieldErrors: {
            fondo_login: "La imagen de fondo no puede superar los 8 MB.",
          },
        };
      const upload = new FormData();
      upload.set("fondo_login", loginBackground);
      const backgroundResponse = await fetch(
        backendUrl(`/empresa/${companyId}/fondo-login`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: upload,
          cache: "no-store",
        },
      );
      if (!backgroundResponse.ok)
        return fail(
          (await readApiMessage(backgroundResponse)) ||
            "La empresa se guardó, pero no fue posible procesar el fondo del login.",
        );
    }
    const loginPanelBackground = d.get("fondo_panel_login");
    if (loginPanelBackground instanceof File && loginPanelBackground.size > 0) {
      if (loginPanelBackground.size > 8 * 1024 * 1024)
        return {
          fieldErrors: {
            fondo_panel_login: "La imagen de fondo no puede superar los 8 MB.",
          },
        };
      const upload = new FormData();
      upload.set("fondo_panel_login", loginPanelBackground);
      const panelBackgroundResponse = await fetch(
        backendUrl(`/empresa/${companyId}/fondo-panel-login`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: upload,
          cache: "no-store",
        },
      );
      if (!panelBackgroundResponse.ok)
        return fail(
          (await readApiMessage(panelBackgroundResponse)) ||
            "La empresa se guardó, pero no fue posible procesar el fondo del panel de acceso.",
        );
    }
    revalidatePath("/dashboard", "layout");
    revalidatePath("/login");
    return done(
      id ? "Empresa actualizada" : "Empresa registrada",
      "La información comercial y fiscal fue guardada.",
    );
  } catch {
    return fail("No pudimos conectar con el servidor.");
  }
}
