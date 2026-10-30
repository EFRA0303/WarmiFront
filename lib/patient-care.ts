export type CareContext = { id_paciente?: number; id_tratamiento?: number; id_sesion?: number };

export function careId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
}

export function careContext(params: Record<string, string | string[] | undefined>): CareContext {
  return { id_paciente: careId(params.id_paciente), id_tratamiento: careId(params.id_tratamiento), id_sesion: careId(params.id_sesion) };
}

export function careHref(path: string, context: CareContext, extra: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = { ...context, ...extra };
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.size ? `${path}?${params}` : path;
}

export function careEntryPath(permissions: string[]) {
  if (permissions.includes("tratamientos.leer")) return "/dashboard/tratamientos";
  if (permissions.includes("clinica.leer")) return "/dashboard/sesiones";
  return null;
}
