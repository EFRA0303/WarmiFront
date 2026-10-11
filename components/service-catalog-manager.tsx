"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CloseIcon, EditIcon, PlusIcon, SearchIcon, SettingsIcon } from "@/components/icons";
import { SubmissionResultDialog } from "@/components/submission-result-dialog";
import {
  saveArea,
  saveCategory,
  saveMeasure,
  saveService,
  syncServiceMeasures,
} from "@/app/dashboard/servicios/actions";
import type {
  CatalogArea,
  CatalogService,
  MeasureType,
  RegistrationState,
  ServiceCatalogData,
  ServiceCategory,
} from "@/lib/types";

type Tab = "services" | "measures" | "structure";
type Editor =
  | { kind: "service"; item?: CatalogService }
  | { kind: "measure"; item?: MeasureType }
  | { kind: "area"; item?: CatalogArea }
  | { kind: "category"; item?: ServiceCategory }
  | { kind: "assign"; item: CatalogService }
  | null;
const initial: RegistrationState = {};
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function Dialog({ open, onClose, title, eyebrow, description, children }: { open: boolean; onClose: () => void; title: string; eyebrow: string; description: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return <dialog ref={ref} className="catalog-dialog" onCancel={onClose} onClick={(event) => event.target === ref.current && onClose()}>
    <section><header><span className="catalog-dialog__icon"><SettingsIcon /></span><div><span className="page-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button></header>{children}</section>
  </dialog>;
}

function ErrorText({ state, name }: { state: RegistrationState; name: string }) {
  return state.fieldErrors?.[name] ? <small className="catalog-error">{state.fieldErrors[name]}</small> : null;
}

function Result({ state, close }: { state: RegistrationState; close: () => void }) {
  return state.resultId ? <SubmissionResultDialog key={state.resultId} state={state} onSuccess={close} /> : null;
}

function ServiceForm({ item, categories, close }: { item?: CatalogService; categories: ServiceCategory[]; close: () => void }) {
  const [state, action, pending] = useActionState(saveService.bind(null, item?.id_servicio ?? null), initial);
  const activeCategories = categories.filter((category) => category.estado === "ACTIVO" || category.id_categoria === item?.id_categoria);
  return <><form action={action} className="catalog-form"><div className="catalog-form__grid">
    <label><span>Categoría *</span><select name="id_categoria" defaultValue={item?.id_categoria ?? ""} required><option value="">Seleccionar categoría</option>{activeCategories.map((category) => <option key={category.id_categoria} value={category.id_categoria}>{category.area?.nombre ? `${category.area.nombre} · ` : ""}{category.nombre}</option>)}</select><ErrorText state={state} name="id_categoria" /></label>
    <label><span>Nombre *</span><input name="nombre" defaultValue={item?.nombre ?? ""} maxLength={100} required /><ErrorText state={state} name="nombre" /></label>
    <label><span>Duración en minutos *</span><input name="duracion_minutos" type="number" min="1" max="1440" defaultValue={item?.duracion_minutos ?? 60} required /><ErrorText state={state} name="duracion_minutos" /></label>
    {item && <label><span>Estado *</span><select name="estado" defaultValue={item.estado}><option value="ACTIVO">Activo</option><option value="BAJA">Baja</option></select></label>}
    <label className="catalog-form__wide catalog-check"><input name="requiere_valoracion" type="checkbox" defaultChecked={item?.requiere_valoracion} /><span><strong>Requiere valoración previa</strong><small>Se mostrará esta condición al indicar el servicio.</small></span></label>
    <label className="catalog-form__wide"><span>Descripción</span><textarea name="descripcion" maxLength={255} rows={4} defaultValue={item?.descripcion ?? ""} /></label>
  </div><footer><button type="button" className="catalog-secondary" onClick={close}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending || activeCategories.length === 0}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Crear servicio"}</button></footer></form><Result state={state} close={close} /></>;
}

function MeasureForm({ item, close }: { item?: MeasureType; close: () => void }) {
  const [state, action, pending] = useActionState(saveMeasure.bind(null, item?.id_tipo_medida ?? null), initial);
  return <><form action={action} className="catalog-form"><div className="catalog-form__grid">
    <label><span>Nombre *</span><input name="nombre" maxLength={80} defaultValue={item?.nombre ?? ""} placeholder="Ej. Peso, cintura, dolor" required /><ErrorText state={state} name="nombre" /></label>
    <label><span>Unidad</span><input name="unidad" maxLength={20} defaultValue={item?.unidad ?? ""} placeholder="kg, cm, escala 1–10" /></label>
    {item && <label><span>Estado *</span><select name="estado" defaultValue={item.estado}><option value="ACTIVO">Activo</option><option value="BAJA">Baja</option></select></label>}
  </div><footer><button type="button" className="catalog-secondary" onClick={close}>Cancelar</button><button type="submit" className="directory-primary" disabled={pending}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Crear medición"}</button></footer></form><Result state={state} close={close} /></>;
}

function AreaForm({ item, close }: { item?: CatalogArea; close: () => void }) {
  const [state, action, pending] = useActionState(saveArea.bind(null, item?.id_area ?? null), initial);
  return <><form action={action} className="catalog-form"><div className="catalog-form__grid"><label><span>Nombre *</span><input name="nombre" maxLength={100} defaultValue={item?.nombre ?? ""} required /><ErrorText state={state} name="nombre" /></label>{item && <label><span>Estado *</span><select name="estado" defaultValue={item.estado}><option value="ACTIVO">Activo</option><option value="BAJA">Baja</option></select></label>}<label className="catalog-form__wide"><span>Descripción</span><textarea name="descripcion" maxLength={255} rows={3} defaultValue={item?.descripcion ?? ""} /></label></div><footer><button type="button" className="catalog-secondary" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Crear área"}</button></footer></form><Result state={state} close={close} /></>;
}

function CategoryForm({ item, areas, close }: { item?: ServiceCategory; areas: CatalogArea[]; close: () => void }) {
  const [state, action, pending] = useActionState(saveCategory.bind(null, item?.id_categoria ?? null), initial);
  const available = areas.filter((area) => area.estado === "ACTIVO" || area.id_area === item?.id_area);
  return <><form action={action} className="catalog-form"><div className="catalog-form__grid"><label><span>Área *</span><select name="id_area" defaultValue={item?.id_area ?? ""} required><option value="">Seleccionar área</option>{available.map((area) => <option key={area.id_area} value={area.id_area}>{area.nombre}</option>)}</select><ErrorText state={state} name="id_area" /></label><label><span>Nombre *</span><input name="nombre" maxLength={100} defaultValue={item?.nombre ?? ""} required /><ErrorText state={state} name="nombre" /></label>{item && <label><span>Estado *</span><select name="estado" defaultValue={item.estado}><option value="ACTIVO">Activo</option><option value="BAJA">Baja</option></select></label>}<label className="catalog-form__wide"><span>Descripción</span><textarea name="descripcion" maxLength={255} rows={3} defaultValue={item?.descripcion ?? ""} /></label></div><footer><button type="button" className="catalog-secondary" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending || !available.length}>{pending ? "Guardando..." : item ? "Guardar cambios" : "Crear categoría"}</button></footer></form><Result state={state} close={close} /></>;
}

function AssignmentForm({ service, measures, close }: { service: CatalogService; measures: MeasureType[]; close: () => void }) {
  const currentIds = service.medidas.map((item) => item.id_tipo_medida);
  const [state, action, pending] = useActionState(syncServiceMeasures.bind(null, service.id_servicio, currentIds), initial);
  const [selected, setSelected] = useState(() => new Set(currentIds));
  return <><form action={action} className="catalog-form"><div className="measure-picker">{measures.filter((measure) => measure.estado === "ACTIVO" || selected.has(measure.id_tipo_medida)).map((measure) => {
    const checked = selected.has(measure.id_tipo_medida);
    const relation = service.medidas.find((item) => item.id_tipo_medida === measure.id_tipo_medida);
    return <div key={measure.id_tipo_medida} className={checked ? "selected" : ""}><label><input type="checkbox" name="medidas" value={measure.id_tipo_medida} checked={checked} onChange={(event) => setSelected((previous) => { const next = new Set(previous); if (event.target.checked) next.add(measure.id_tipo_medida); else next.delete(measure.id_tipo_medida); return next; })} /><span><strong>{measure.nombre}</strong><small>{measure.unidad || "Sin unidad"}</small></span></label><label className="measure-required"><input type="checkbox" name={`obligatoria_${measure.id_tipo_medida}`} defaultChecked={relation?.obligatorio} disabled={!checked} /> Obligatoria</label></div>;
  })}</div>{!measures.length && <p className="catalog-empty-inline">Primero crea un tipo de medición.</p>}<footer><button type="button" className="catalog-secondary" onClick={close}>Cancelar</button><button className="directory-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar mediciones"}</button></footer></form><Result state={state} close={close} /></>;
}

function Status({ value }: { value: "ACTIVO" | "BAJA" }) { return <span className={`catalog-status catalog-status--${value.toLowerCase()}`}><i />{value === "ACTIVO" ? "Activo" : "Baja"}</span>; }

export function ServiceCatalogManager({ data, canCreate, canEdit, initialTab = "services" }: { data: ServiceCatalogData; canCreate: boolean; canEdit: boolean; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor>(null);
  const term = normalize(search);
  const services = useMemo(() => data.services.filter((item) => normalize(`${item.nombre} ${item.descripcion ?? ""} ${item.categoria?.nombre ?? ""} ${item.categoria?.area?.nombre ?? ""}`).includes(term)), [data.services, term]);
  const measures = useMemo(() => data.measures.filter((item) => normalize(`${item.nombre} ${item.unidad ?? ""}`).includes(term)), [data.measures, term]);
  const close = () => setEditor(null);
  const newItem = () => setEditor({ kind: tab === "services" ? "service" : tab === "measures" ? "measure" : "area" });
  return <div className="catalog-manager">
    <div className="catalog-tabs"><button className={tab === "services" ? "active" : ""} onClick={() => { setTab("services"); setSearch(""); }}>Servicios <span>{data.services.length}</span></button><button className={tab === "measures" ? "active" : ""} onClick={() => { setTab("measures"); setSearch(""); }}>Mediciones <span>{data.measures.length}</span></button><button className={tab === "structure" ? "active" : ""} onClick={() => { setTab("structure"); setSearch(""); }}>Áreas y categorías</button></div>
    <div className="catalog-toolbar">{tab !== "structure" && <label><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "services" ? "Buscar servicio, categoría o área..." : "Buscar medición o unidad..."} /></label>}{canCreate && <div className="catalog-create-actions">{tab === "structure" && <button className="catalog-secondary" type="button" onClick={() => setEditor({ kind: "category" })}><PlusIcon />Nueva categoría</button>}<button className="directory-primary" type="button" onClick={newItem}><PlusIcon />{tab === "services" ? "Nuevo servicio" : tab === "measures" ? "Nueva medición" : "Nueva área"}</button></div>}</div>
    {tab === "services" && <div className="catalog-table-card"><table><thead><tr><th>Servicio</th><th>Área / categoría</th><th>Duración</th><th>Mediciones</th><th>Valoración</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr></thead><tbody>{services.map((service) => <tr key={service.id_servicio}><td><strong>{service.nombre}</strong><small>{service.descripcion || "Sin descripción"}</small></td><td><strong>{service.categoria?.area?.nombre || "Sin área"}</strong><small>{service.categoria?.nombre || `Categoría #${service.id_categoria}`}</small></td><td><strong>{service.duracion_minutos} min</strong></td><td><button className="catalog-measure-count" type="button" disabled={!canEdit} onClick={() => setEditor({ kind: "assign", item: service })}>{service.medidas.length} configuradas</button></td><td>{service.requiere_valoracion ? "Sí" : "No"}</td><td><Status value={service.estado} /></td>{canEdit && <td><div className="catalog-row-actions"><button onClick={() => setEditor({ kind: "assign", item: service })} title="Configurar mediciones"><SettingsIcon /></button><button onClick={() => setEditor({ kind: "service", item: service })} title="Editar servicio"><EditIcon /></button></div></td>}</tr>)}</tbody></table>{!services.length && <div className="catalog-empty">No encontramos servicios con esos criterios.</div>}</div>}
    {tab === "measures" && <div className="catalog-table-card"><table><thead><tr><th>Medición</th><th>Unidad</th><th>Servicios asociados</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr></thead><tbody>{measures.map((measure) => { const count = data.services.filter((service) => service.medidas.some((item) => item.id_tipo_medida === measure.id_tipo_medida)).length; return <tr key={measure.id_tipo_medida}><td><strong>{measure.nombre}</strong></td><td>{measure.unidad || "Sin unidad"}</td><td>{count} servicios</td><td><Status value={measure.estado} /></td>{canEdit && <td><div className="catalog-row-actions"><button onClick={() => setEditor({ kind: "measure", item: measure })} title="Editar medición"><EditIcon /></button></div></td>}</tr>; })}</tbody></table>{!measures.length && <div className="catalog-empty">No encontramos mediciones con esos criterios.</div>}</div>}
    {tab === "structure" && <div className="catalog-structure"><section><header><div><h2>Áreas</h2><p>Agrupan las categorías principales.</p></div></header>{data.areas.map((area) => <article key={area.id_area}><div><strong>{area.nombre}</strong><small>{area.descripcion || "Sin descripción"}</small></div><Status value={area.estado} />{canEdit && <button onClick={() => setEditor({ kind: "area", item: area })}><EditIcon /></button>}</article>)}</section><section><header><div><h2>Categorías</h2><p>Organizan los servicios dentro de cada área.</p></div></header>{data.categories.map((category) => <article key={category.id_categoria}><div><strong>{category.nombre}</strong><small>{category.area?.nombre || `Área #${category.id_area}`}</small></div><Status value={category.estado} />{canEdit && <button onClick={() => setEditor({ kind: "category", item: category })}><EditIcon /></button>}</article>)}</section></div>}
    <Dialog open={editor !== null} onClose={close} eyebrow={editor?.kind === "assign" ? "CONFIGURACIÓN CLÍNICA" : "CATÁLOGO DE SERVICIOS"} title={editor?.kind === "service" ? `${editor.item ? "Editar" : "Nuevo"} servicio` : editor?.kind === "measure" ? `${editor.item ? "Editar" : "Nueva"} medición` : editor?.kind === "area" ? `${editor.item ? "Editar" : "Nueva"} área` : editor?.kind === "category" ? `${editor.item ? "Editar" : "Nueva"} categoría` : editor?.kind === "assign" ? `Mediciones de ${editor.item.nombre}` : "Catálogo"} description={editor?.kind === "assign" ? "Selecciona qué datos clínicos se registrarán durante este servicio." : "Completa los datos usando la estructura actual del sistema."}>
      {editor?.kind === "service" && <ServiceForm key={editor.item?.id_servicio ?? "new"} item={editor.item} categories={data.categories} close={close} />}{editor?.kind === "measure" && <MeasureForm key={editor.item?.id_tipo_medida ?? "new"} item={editor.item} close={close} />}{editor?.kind === "area" && <AreaForm key={editor.item?.id_area ?? "new"} item={editor.item} close={close} />}{editor?.kind === "category" && <CategoryForm key={editor.item?.id_categoria ?? "new"} item={editor.item} areas={data.areas} close={close} />}{editor?.kind === "assign" && <AssignmentForm key={editor.item.id_servicio} service={editor.item} measures={data.measures} close={close} />}
    </Dialog>
  </div>;
}
