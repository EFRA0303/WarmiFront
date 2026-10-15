import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { DirectoryTableActions } from "@/components/directory-table-actions";
import { DynamicSearchInput } from "@/components/dynamic-search-input";
import { NewPromotionDialog, PromotionActions } from "@/components/promotion-dialogs";
import { PromotionStatusFilter } from "@/components/promotion-controls";
import { getCurrentUser } from "@/lib/auth";
import { getPromotionOptions, getPromotions } from "@/lib/promotions";
import type { PromotionStatus } from "@/lib/types";
import "../people.css";
import "../sesiones/sessions.css";
import "../paquetes/packages.css";
import "./promotions.css";

export const metadata: Metadata = { title: "Promociones" };
const PAGE_SIZE = 10;
const statuses = new Set<PromotionStatus>(["PROGRAMADA", "ACTIVA", "FINALIZADA", "CANCELADA"]);
const labels: Record<PromotionStatus, string> = { PROGRAMADA: "Programada", ACTIVA: "Activa", FINALIZADA: "Finalizada", CANCELADA: "Cancelada" };
const columns = [
  { key: "promotion", label: "Promoción" }, { key: "discount", label: "Descuento" },
  { key: "validity", label: "Vigencia" }, { key: "services", label: "Servicios incluidos" },
  { key: "sales", label: "Adquisiciones" }, { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const date = (value: string) => new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
function discount(type: string, value: string | number) { return type === "PORCENTAJE" ? `${Number(value).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%` : new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(Number(value)); }
function url(page: number, search: string, estado?: PromotionStatus) { const params = new URLSearchParams(); if (search) params.set("search", search); if (estado) params.set("estado", estado); if (page > 1) params.set("page", String(page)); return params.size ? `/dashboard/promociones?${params}` : "/dashboard/promociones"; }

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (one(params.search) || "").trim().slice(0, 150);
  const rawStatus = one(params.estado)?.toUpperCase() as PromotionStatus | undefined;
  const estado = rawStatus && statuses.has(rawStatus) ? rawStatus : undefined;
  const [result, options, user] = await Promise.all([getPromotions({ page, limit: PAGE_SIZE, search, estado }), getPromotionOptions(), getCurrentUser()]);
  if ((!result.ok && result.status === 401) || (!options.ok && options.status === 401)) redirect("/login");
  if (!user?.permisos.includes("comercial.leer")) return <Message title="Acceso restringido" message="Tu cuenta no tiene permiso para consultar promociones." />;
  if (!result.ok) return <Message title="No pudimos cargar las promociones" message={result.message} />;
  if (!options.ok) return <Message title="No pudimos cargar los servicios" message={options.message} />;
  const canCreate = user.permisos.includes("comercial.crear");
  const canEdit = user.permisos.includes("comercial.actualizar");
  const { data, total, limit } = result.value;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);

  return <section className="directory-page promotions-page" data-directory-scope="promotions">
    <header className="directory-heading"><div><span className="page-eyebrow">PAQUETES Y PROMOCIONES</span><h1>Promociones</h1><p>Administra descuentos, vigencias y servicios promocionados.</p></div>{canCreate && <NewPromotionDialog />}</header>
    <DirectoryTableActions scope="promotions" fileName="promociones" columns={columns} showActions={canEdit} />
    <div className="directory-toolbar"><form action="/dashboard/promociones" method="get"><label className="directory-search"><SearchIcon /><DynamicSearchInput id="promotion-search" initialValue={search} placeholder="Buscar promoción, descripción o servicio..." basePath="/dashboard/promociones" /></label><PromotionStatusFilter initialValue={estado} /></form></div>
    {data.length ? <>
      <div className="directory-table-card promotions-table"><div className="directory-table-scroll"><table className="directory-table"><thead><tr><th data-directory-column="promotion">Promoción</th><th data-directory-column="discount">Descuento</th><th data-directory-column="validity">Vigencia</th><th data-directory-column="services">Servicios incluidos</th><th data-directory-column="sales">Adquisiciones</th><th data-directory-column="status">Estado</th>{canEdit && <th data-directory-column="actions">Acciones</th>}</tr></thead><tbody>{data.map((item) => <tr key={item.id_promocion}><td data-directory-column="promotion"><div className="directory-stacked"><strong>{item.nombre}</strong><small>{item.descripcion || `Promoción #${item.id_promocion}`}</small></div></td><td data-directory-column="discount"><strong className="promotion-discount">{discount(item.tipo_descuento, item.valor_descuento)}</strong><small className="promotion-type">{item.tipo_descuento === "PORCENTAJE" ? "Porcentaje" : "Monto fijo"}</small></td><td data-directory-column="validity"><div className="promotion-validity"><span><b>Desde</b>{date(item.fecha_inicio)}</span><span><b>Hasta</b>{date(item.fecha_fin)}</span></div></td><td data-directory-column="services">{item.servicios.length ? <div className="package-services">{item.servicios.slice(0, 2).map((service) => <span key={service.id_servicio}>{service.servicio} <b>{service.sesiones_incluidas}</b></span>)}{item.servicios.length > 2 && <em>+{item.servicios.length - 2}</em>}</div> : <span className="package-empty">Sin servicios configurados</span>}</td><td data-directory-column="sales"><div className="directory-stacked"><strong>{item.adquisiciones}</strong><small>registros históricos</small></div></td><td data-directory-column="status"><span className={`promotion-status promotion-status--${item.estado.toLowerCase()}`}><span />{labels[item.estado]}</span></td>{canEdit && <td data-directory-column="actions"><PromotionActions item={item} options={options.value} canEdit /></td>}</tr>)}</tbody></table></div></div>
      <div className="directory-mobile-list">{data.map((item) => <article className="directory-mobile-card" key={item.id_promocion}><div className="directory-card-head"><div className="directory-stacked"><strong>{item.nombre}</strong><small>{item.descripcion || `Promoción #${item.id_promocion}`}</small></div><span className={`promotion-status promotion-status--${item.estado.toLowerCase()}`}><span />{labels[item.estado]}</span></div><dl><div><dt>Descuento</dt><dd>{discount(item.tipo_descuento, item.valor_descuento)}</dd></div><div><dt>Servicios</dt><dd>{item.servicios.length}</dd></div><div><dt>Inicio</dt><dd>{date(item.fecha_inicio)}</dd></div><div><dt>Fin</dt><dd>{date(item.fecha_fin)}</dd></div></dl>{canEdit && <div className="directory-card-actions"><PromotionActions item={item} options={options.value} canEdit /></div>}</article>)}</div>
      <footer className="directory-footer"><p>Mostrando <strong>{total ? (current - 1) * limit + 1 : 0}–{Math.min(current * limit, total)}</strong> de <strong>{total}</strong></p>{pages > 1 && <nav><Link aria-disabled={current === 1} className={current === 1 ? "disabled" : ""} href={url(current - 1, search, estado)}><ChevronLeftIcon /></Link><span>Página {current} de {pages}</span><Link aria-disabled={current === pages} className={current === pages ? "disabled" : ""} href={url(current + 1, search, estado)}><ChevronRightIcon /></Link></nav>}</footer>
    </> : <div className="directory-message"><b>i</b><div><h2>No encontramos promociones</h2><p>{search || estado ? "Prueba con otros filtros." : "Todavía no existen promociones comerciales."}</p></div>{(search || estado) && <Link className="directory-clear" href="/dashboard/promociones">Ver todas</Link>}</div>}
  </section>;
}

function Message({ title, message }: { title: string; message: string }) { return <section className="directory-page"><div className="directory-message"><b>!</b><div><h2>{title}</h2><p>{message}</p></div></div></section>; }
