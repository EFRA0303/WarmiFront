"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type { RegistrationState } from "@/lib/types";
import { readServiceMeasurements, readServiceSupplies } from "@/lib/service-configuration";

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const id = (data: FormData, name: string) => {
  const value = Number(text(data, name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
};
const failure = (message: string): RegistrationState => ({
  resultId: randomUUID(), outcome: "error", title: "No se pudo guardar", message,
});

async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body?: object) {
  const token = await getSessionToken();
  if (!token) return failure("La sesión venció. Vuelve a iniciar sesión.");
  try {
    const response = await fetch(backendUrl(path), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!response.ok) return failure((await readApiMessage(response)) || "La operación no pudo completarse.");
  } catch {
    return failure("No pudimos conectar con el servidor.");
  }
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/inventario/categorias");
  revalidatePath("/dashboard/inventario/productos");
  revalidatePath("/dashboard/tratamientos");
  revalidatePath("/dashboard/agenda");
  return null;
}

function success(title: string, message: string): RegistrationState {
  return { resultId: randomUUID(), outcome: "success", title, message };
}

export async function saveService(serviceId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const categoryId = id(data, "id_categoria");
  const name = text(data, "nombre");
  const duration = id(data, "duracion_minutos");
  const price = text(data, "precio").replace(",", ".");
  const sessions = id(data, "sesiones_incluidas");
  const measurements = readServiceMeasurements(data);
  const supplies = readServiceSupplies(data);
  const fieldErrors: Record<string, string> = {};
  if (!categoryId) fieldErrors.id_categoria = "Selecciona una categoría.";
  if (!name) fieldErrors.nombre = "Ingresa el nombre del servicio.";
  if (!duration) fieldErrors.duracion_minutos = "Ingresa una duración válida.";
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(price)) fieldErrors.precio = "Ingresa un precio total válido.";
  if (!sessions || sessions > 1000) fieldErrors.sesiones_incluidas = "Ingresa entre 1 y 1000 sesiones.";
  if (!measurements.ok) fieldErrors.medidas = measurements.error;
  if (!supplies.ok) fieldErrors.productos = supplies.error;
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (!measurements.ok || !supplies.ok) return { fieldErrors };
  const body = {
    id_categoria: categoryId,
    nombre: name,
    duracion_minutos: duration,
    precio: price,
    sesiones_incluidas: sessions,
    medidas: measurements.value,
    productos: supplies.value,
    descripcion: text(data, "descripcion") || null,
    requiere_valoracion: data.get("requiere_valoracion") === "on",
    ...(serviceId ? { estado: text(data, "estado") } : {}),
  };
  const result = await mutate(serviceId ? `/catalogo/servicios/${serviceId}` : "/catalogo/servicios", serviceId ? "PATCH" : "POST", body);
  return result ?? success(serviceId ? "Servicio actualizado" : "Servicio creado", "El catálogo de servicios quedó actualizado.");
}

export async function saveMeasure(measureId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const name = text(data, "nombre");
  if (!name) return { fieldErrors: { nombre: "Ingresa el nombre de la medición." } };
  const body = { nombre: name, unidad: text(data, "unidad") || null, ...(measureId ? { estado: text(data, "estado") } : {}) };
  const result = await mutate(measureId ? `/catalogo/tipos-medida/${measureId}` : "/catalogo/tipos-medida", measureId ? "PATCH" : "POST", body);
  return result ?? success(measureId ? "Medición actualizada" : "Medición creada", "El tipo de medición quedó disponible en el catálogo.");
}

export async function saveArea(areaId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const name = text(data, "nombre");
  if (!name) return { fieldErrors: { nombre: "Ingresa el nombre del área." } };
  const body = { nombre: name, descripcion: text(data, "descripcion") || null, ...(areaId ? { estado: text(data, "estado") } : {}) };
  const result = await mutate(areaId ? `/catalogo/areas/${areaId}` : "/catalogo/areas", areaId ? "PATCH" : "POST", body);
  return result ?? success(areaId ? "Área actualizada" : "Área creada", "La estructura del catálogo quedó actualizada.");
}

export async function saveCategory(categoryId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const areaId = id(data, "id_area");
  const name = text(data, "nombre");
  const fieldErrors: Record<string, string> = {};
  if (!areaId) fieldErrors.id_area = "Selecciona un área.";
  if (!name) fieldErrors.nombre = "Ingresa el nombre de la categoría.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const body = { id_area: areaId, nombre: name, descripcion: text(data, "descripcion") || null, ...(categoryId ? { estado: text(data, "estado") } : {}) };
  const result = await mutate(categoryId ? `/catalogo/categorias/${categoryId}` : "/catalogo/categorias", categoryId ? "PATCH" : "POST", body);
  return result ?? success(categoryId ? "Categoría actualizada" : "Categoría creada", "La estructura del catálogo quedó actualizada.");
}

export async function saveProductCategory(categoryId: number | null, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const name = text(data, "nombre");
  if (!name) return { fieldErrors: { nombre: "Ingresa el nombre de la categoría." } };
  const body = { nombre: name, descripcion: text(data, "descripcion") || null, ...(categoryId ? { estado: text(data, "estado") } : {}) };
  const result = await mutate(categoryId ? `/catalogo/categorias-producto/${categoryId}` : "/catalogo/categorias-producto", categoryId ? "PATCH" : "POST", body);
  return result ?? success(categoryId ? "Categoría actualizada" : "Categoría creada", "La clasificación de productos quedó actualizada.");
}

export async function syncServiceMeasures(serviceId: number, _state: RegistrationState, data: FormData): Promise<RegistrationState> {
  const measurements = readServiceMeasurements(data);
  if (!measurements.ok) return { fieldErrors: { medidas: measurements.error } };
  const result = await mutate(`/catalogo/servicios/${serviceId}`, "PATCH", { medidas: measurements.value });
  if (result) return result;
  return success("Mediciones actualizadas", "Las mediciones del servicio se guardaron correctamente.");
}
