"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState } from "@/lib/types";
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
const ok = (title: string, message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "success",
  title,
  message,
});
async function mutate(path: string, method: "POST" | "PATCH", body: object) {
  const token = await getSessionToken();
  if (!token) return fail("La sesión venció.");
  try {
    const response = await fetch(backendUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok)
      return fail(
        (await readApiMessage(response)) || "La operación no pudo completarse.",
      );
  } catch {
    return fail("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/ventas/notas");
  revalidatePath("/dashboard/ventas/pagos");
  return null;
}
const money = (v: string) => /^\d+(?:\.\d{1,2})?$/.test(v.replace(",", "."));
const iso = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? new Date(`${value}:00-04:00`).toISOString()
    : null;
export async function createSaleNote(
  _s: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const numero = text(data, "numero_nota");
  const fecha = iso(text(data, "fecha_emision"));
  const discount = text(data, "descuento").replace(",", ".") || "0";
  const count = Number(text(data, "detail_count"));
  const errors: Record<string, string> = {};
  if (!numero) errors.numero_nota = "Ingresa el número de nota.";
  if (!fecha) errors.fecha_emision = "Selecciona la fecha de emisión.";
  if (!money(discount)) errors.descuento = "Ingresa un descuento válido.";
  const detalles: Array<Record<string, string | number>> = [];
  for (let i = 0; i < count; i++) {
    const selected = text(data, `item_${i}`);
    const [type, rawId] = selected.split(":");
    const id = Number(rawId);
    const quantity = text(data, `cantidad_${i}`).replace(",", ".");
    const price = text(data, `precio_${i}`).replace(",", ".");
    const detailDiscount =
      text(data, `descuento_${i}`).replace(",", ".") || "0";
    if (
      !new Set(["SERVICIO", "PRODUCTO", "PAQUETE"]).has(type) ||
      !Number.isInteger(id)
    ) {
      errors[`item_${i}`] = "Selecciona un concepto.";
      continue;
    }
    if (!money(quantity) || Number(quantity) <= 0)
      errors[`cantidad_${i}`] = "Cantidad inválida.";
    if (!money(price)) errors[`precio_${i}`] = "Precio inválido.";
    if (!money(detailDiscount))
      errors[`descuento_${i}`] = "Descuento inválido.";
    const key =
      type === "SERVICIO"
        ? "id_servicio"
        : type === "PRODUCTO"
          ? "id_producto"
          : "id_paquete";
    detalles.push({
      [key]: id,
      cantidad: quantity,
      precio_unitario: price,
      descuento: detailDiscount,
    });
  }
  if (!detalles.length) errors.detalles = "Agrega al menos un concepto.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const patient = Number(text(data, "id_paciente"));
  const acquisition = Number(text(data, "id_adquisicion"));
  const result = await mutate("/ventas/notas", "POST", {
    numero_nota: numero,
    fecha_emision: fecha,
    id_paciente: patient > 0 ? patient : undefined,
    id_adquisicion: acquisition > 0 ? acquisition : undefined,
    descuento: discount,
    observaciones: text(data, "observaciones") || undefined,
    detalles,
  });
  return (
    result ?? ok("Nota emitida", "La venta y sus importes fueron registrados.")
  );
}
export async function cancelSaleNote(id: number): Promise<RegistrationState> {
  const result = await mutate(`/ventas/notas/${id}`, "PATCH", {
    estado: "ANULADA",
  });
  return (
    result ??
    ok("Nota anulada", "La nota permanece en el historial financiero.")
  );
}
export async function createPayment(
  _s: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const note = Number(text(data, "id_nota_venta"));
  const amount = text(data, "monto").replace(",", ".");
  const date = iso(text(data, "fecha_pago"));
  const method = text(data, "metodo_pago");
  const errors: Record<string, string> = {};
  if (!Number.isInteger(note) || note < 1)
    errors.id_nota_venta = "Selecciona una nota.";
  if (!money(amount) || Number(amount) <= 0)
    errors.monto = "Ingresa un monto mayor a cero.";
  if (!date) errors.fecha_pago = "Selecciona la fecha del pago.";
  if (
    !new Set(["EFECTIVO", "QR", "TRANSFERENCIA", "TARJETA", "OTRO"]).has(method)
  )
    errors.metodo_pago = "Selecciona el método.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const result = await mutate("/ventas/pagos", "POST", {
    id_nota_venta: note,
    monto: amount,
    fecha_pago: date,
    metodo_pago: method,
    observaciones: text(data, "observaciones") || undefined,
  });
  return (
    result ?? ok("Pago registrado", "El saldo de la nota fue actualizado.")
  );
}
export async function cancelPayment(id: number): Promise<RegistrationState> {
  const result = await mutate(`/ventas/pagos/${id}`, "PATCH", {
    estado: "ANULADO",
  });
  return (
    result ??
    ok("Pago anulado", "El importe vuelve a formar parte del saldo pendiente.")
  );
}
