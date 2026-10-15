"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { InventoryMovementType, RegistrationState } from "@/lib/types";
const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const failure = (message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "error",
  title: "No se pudo completar",
  message,
});
const success = (title: string, message: string): RegistrationState => ({
  resultId: randomUUID(),
  outcome: "success",
  title,
  message,
});
async function mutate(path: string, method: "POST" | "PATCH", body: object) {
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció.");
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
      return failure(
        (await readApiMessage(response)) || "La operación no pudo completarse.",
      );
  } catch {
    return failure("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/inventario", "layout");
  return null;
}
const numeric = (value: string) =>
  /^\d+(?:\.\d{1,2})?$/.test(value.replace(",", "."));
export async function saveProduct(
  id: number | null,
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const nombre = text(data, "nombre");
  const categoria = Number(text(data, "id_categoria_producto"));
  const unidad = text(data, "unidad_medida");
  const stock = text(data, "stock_minimo").replace(",", ".");
  const contenido = text(data, "contenido_presentacion").replace(",", ".");
  const precio = text(data, "precio_venta").replace(",", ".");
  const esInsumo = data.get("es_insumo") === "on";
  const esVendible = data.get("es_vendible") === "on";
  const imageEntry = data.get("imagen");
  const image = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const errors: Record<string, string> = {};
  if (!nombre) errors.nombre = "Ingresa el nombre.";
  if (!Number.isInteger(categoria) || categoria < 1) errors.id_categoria_producto = "Selecciona una categoría.";
  if (!unidad) errors.unidad_medida = "Ingresa la unidad de medida.";
  if (!numeric(stock)) errors.stock_minimo = "Ingresa un stock mínimo válido.";
  if (!/^\d+(?:\.\d{1,3})?$/.test(contenido) || Number(contenido) <= 0) errors.contenido_presentacion = "Ingresa un contenido mayor a cero.";
  if (!esInsumo && !esVendible) errors.es_insumo = "Selecciona al menos un uso para el producto.";
  if (esVendible && (!numeric(precio) || Number(precio) < 0)) errors.precio_venta = "Ingresa un precio de venta válido.";
  if (image && image.size > 5 * 1024 * 1024)
    errors.imagen = "La imagen no puede superar los 5 MB.";
  if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.type))
    errors.imagen = "Usa una imagen JPG, JPEG, PNG o WEBP.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const body = {
    id_categoria_producto: categoria,
    nombre,
    marca: text(data, "marca"),
    sku: text(data, "sku"),
    codigo_barras: text(data, "codigo_barras"),
    descripcion: text(data, "descripcion"),
    unidad_medida: unidad,
    presentacion: text(data, "presentacion"),
    contenido_presentacion: contenido,
    precio_venta: esVendible ? precio : null,
    es_insumo: esInsumo,
    es_vendible: esVendible,
    stock_minimo: stock,
    ...(id ? { estado: text(data, "estado") || "ACTIVO" } : {}),
  };
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció.");
  try {
    const response = await fetch(
      backendUrl(id ? `/inventario/productos/${id}` : "/inventario/productos"),
      {
        method: id ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    if (!response.ok)
      return failure(
        (await readApiMessage(response)) || "No fue posible guardar el producto.",
      );
    const saved = (await response.json()) as { id_producto: number };
    const productId = id ?? saved.id_producto;

    if (image) {
      const upload = new FormData();
      upload.append("imagen", image, image.name);
      const imageResponse = await fetch(
        backendUrl(`/inventario/productos/${productId}/imagen`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: upload,
          cache: "no-store",
        },
      );
      if (!imageResponse.ok)
        return {
          resultId: randomUUID(),
          outcome: "error",
          title: "Producto guardado sin imagen",
          message:
            (await readApiMessage(imageResponse)) ||
            "Los datos se guardaron, pero no fue posible procesar la imagen. Puedes intentarlo nuevamente desde Editar.",
        };
    }
  } catch {
    return failure("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/inventario", "layout");
  return success(
    id ? "Producto actualizado" : "Producto creado",
    image
      ? "Los datos y la imagen WebP del producto fueron guardados."
      : "Los datos del inventario fueron guardados.",
  );
}
export async function saveLot(
  id: number | null,
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const body: Record<string, string | number | undefined> = {
    numero_lote: text(data, "numero_lote") || undefined,
    fecha_vencimiento: text(data, "fecha_vencimiento") || undefined,
    costo_unitario: text(data, "costo_unitario").replace(",", ".") || undefined,
    estado: text(data, "estado") || "DISPONIBLE",
  };
  const errors: Record<string, string> = {};
  if (!id) {
    const product = Number(text(data, "id_producto"));
    const amount = text(data, "cantidad_inicial").replace(",", ".");
    const entry = text(data, "fecha_ingreso");
    if (!Number.isInteger(product) || product < 1)
      errors.id_producto = "Selecciona un producto.";
    if (!numeric(amount))
      errors.cantidad_inicial = "Ingresa una cantidad válida.";
    if (!entry) errors.fecha_ingreso = "Selecciona la fecha de ingreso.";
    Object.assign(body, {
      id_producto: product,
      cantidad_inicial: amount,
      fecha_ingreso: entry,
    });
  }
  if (body.costo_unitario && !numeric(String(body.costo_unitario)))
    errors.costo_unitario = "Ingresa un costo válido.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const result = await mutate(
    id ? `/inventario/lotes/${id}` : "/inventario/lotes",
    id ? "PATCH" : "POST",
    body,
  );
  return (
    result ??
    success(
      id ? "Lote actualizado" : "Lote registrado",
      id
        ? "Los datos permitidos fueron actualizados."
        : "El stock inicial se registró automáticamente.",
    )
  );
}
export async function createMovement(
  _state: RegistrationState,
  data: FormData,
): Promise<RegistrationState> {
  const lot = Number(text(data, "id_lote"));
  const tipo = text(data, "tipo") as InventoryMovementType;
  const cantidad = text(data, "cantidad").replace(",", ".");
  const rawDate = text(data, "fecha_movimiento");
  const allowed = new Set([
    "ENTRADA_COMPRA",
    "AJUSTE_ENTRADA",
    "AJUSTE_SALIDA",
    "MERMA",
    "VENCIMIENTO",
  ]);
  const errors: Record<string, string> = {};
  if (!Number.isInteger(lot) || lot < 1) errors.id_lote = "Selecciona un lote.";
  if (!allowed.has(tipo)) errors.tipo = "Selecciona un tipo permitido.";
  if (!numeric(cantidad) || Number(cantidad) <= 0)
    errors.cantidad = "Ingresa una cantidad mayor a cero.";
  if (!rawDate) errors.fecha_movimiento = "Selecciona la fecha y hora.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const fecha = new Date(`${rawDate}:00-04:00`).toISOString();
  const result = await mutate("/inventario/movimientos", "POST", {
    id_lote: lot,
    tipo,
    cantidad,
    fecha_movimiento: fecha,
    observaciones: text(data, "observaciones") || undefined,
  });
  return (
    result ??
    success("Movimiento registrado", "El stock del lote fue recalculado.")
  );
}
