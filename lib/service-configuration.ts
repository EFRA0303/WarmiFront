import type { MeasurementMoment } from "./types";

export function readServiceMeasurements(data: FormData) {
  const ids = data.getAll("medidas").map(Number);
  if (ids.length > 100 || ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length)
    return { ok: false as const, error: "Selecciona mediciones válidas, sin repetirlas." };
  const measures = ids.map(id => ({
    id_tipo_medida: id,
    obligatorio: data.get(`obligatoria_${id}`) === "on",
    momentos: data.getAll(`momentos_${id}`).map(String) as MeasurementMoment[],
  }));
  if (measures.some(item => !item.momentos.length || new Set(item.momentos).size !== item.momentos.length || item.momentos.some(value => !["INICIAL", "CADA_SESION", "FINAL"].includes(value))))
    return { ok: false as const, error: "Indica al menos un momento válido para cada medición seleccionada." };
  return { ok: true as const, value: measures };
}

export function readServiceSupplies(data: FormData) {
  const ids = data.getAll("productos").map(Number);
  if (ids.length > 100 || ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length)
    return { ok: false as const, error: "Selecciona productos válidos, sin repetirlos." };
  const supplies = ids.map(id => ({ id_producto: id, cantidad_referencial: String(data.get(`cantidad_${id}`) ?? "").trim().replace(",", ".") }));
  if (supplies.some(item => !/^\d{1,8}(?:\.\d{1,2})?$/.test(item.cantidad_referencial) || Number(item.cantidad_referencial) <= 0))
    return { ok: false as const, error: "Indica una cantidad positiva por sesión para cada producto, con hasta dos decimales." };
  return { ok: true as const, value: supplies };
}
