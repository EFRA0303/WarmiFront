import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export function InventoryPagination({ page, limit, total, path, filters = {} }: { page: number; limit: number; total: number; path: string; filters?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  const href = (next: number) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (next > 1) params.set("page", String(next));
    return params.size ? `${path}?${params}` : path;
  };
  return <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link className={current <= 1 ? "disabled" : ""} href={href(current - 1)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link className={current >= pages ? "disabled" : ""} href={href(current + 1)}><ChevronRightIcon /></Link></nav>}</footer>;
}
