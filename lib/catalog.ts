import "server-only";

import { getSessionToken } from "@/lib/auth";
import { backendUrl, readApiMessage } from "@/lib/backend";
import type {
  CatalogArea,
  CatalogSupply,
  CatalogService,
  MeasureType,
  ProductCategory,
  PaginatedResponse,
  ServiceCatalogData,
  ServiceCategory,
} from "@/lib/types";

export type CatalogResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

async function request<T>(path: string, token: string): Promise<CatalogResult<T>> {
  try {
    const response = await fetch(backendUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: (await readApiMessage(response)) || "No fue posible cargar el catálogo.",
      };
    }
    return { ok: true, value: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0, message: "No pudimos conectar con el servidor." };
  }
}

export async function getServiceCatalog(): Promise<CatalogResult<ServiceCatalogData>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, status: 401, message: "La sesión no está disponible." };
  const [areas, categories, services, measures, productCategories, supplies] = await Promise.all([
    request<PaginatedResponse<CatalogArea>>("/catalogo/areas?limit=100", token),
    request<PaginatedResponse<ServiceCategory>>("/catalogo/categorias?limit=100", token),
    request<PaginatedResponse<CatalogService>>("/catalogo/servicios?limit=100", token),
    request<PaginatedResponse<MeasureType>>("/catalogo/tipos-medida?limit=100", token),
    request<PaginatedResponse<ProductCategory>>("/catalogo/categorias-producto?limit=100", token),
    request<CatalogSupply[]>("/catalogo/insumos-opciones", token),
  ]);
  const failed = [areas, categories, services, measures, productCategories, supplies].find((result) => !result.ok);
  if (failed && !failed.ok) return failed;
  if (!areas.ok || !categories.ok || !services.ok || !measures.ok || !productCategories.ok || !supplies.ok)
    return { ok: false, status: 0, message: "No fue posible cargar el catálogo." };
  return {
    ok: true,
    value: {
      areas: areas.value.data,
      categories: categories.value.data,
      services: services.value.data,
      measures: measures.value.data,
      productCategories: productCategories.value.data,
      supplies: supplies.value,
    },
  };
}
