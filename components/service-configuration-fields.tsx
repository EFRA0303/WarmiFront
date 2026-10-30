"use client";

import { useState } from "react";
import type { CatalogSupply, MeasureType, ServiceMeasure, ServiceSupply } from "@/lib/types";

export function ServiceMeasurementsFields({ measures, current = [] }: { measures: MeasureType[]; current?: ServiceMeasure[] }) {
  const [selected, setSelected] = useState(() => new Set(current.map(item => item.id_tipo_medida)));
  const options = [...new Map([...measures, ...current.map(item => item.tipoMedida)].map(item => [item.id_tipo_medida, item])).values()]
    .filter(item => item.estado === "ACTIVO" || selected.has(item.id_tipo_medida));
  return <fieldset className="catalog-config catalog-form__wide"><legend>Mediciones del paciente</legend>
    <p>Selecciona qué medir y cuándo. La obligatoriedad se aplica a los momentos elegidos.</p>
    {!options.length && <p>No hay tipos de medida disponibles. Puedes crearlos desde el botón Mediciones.</p>}
    {options.map(measure => {
      const enabled = selected.has(measure.id_tipo_medida);
      const config = current.find(item => item.id_tipo_medida === measure.id_tipo_medida);
      return <div className="catalog-config__item" key={measure.id_tipo_medida}>
        <label className="catalog-config__choice"><input type="checkbox" name="medidas" value={measure.id_tipo_medida} checked={enabled} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(measure.id_tipo_medida); else next.delete(measure.id_tipo_medida); return next; })} /><span>{measure.nombre} <small>{measure.unidad || "Sin unidad"}{measure.estado !== "ACTIVO" ? " · Inactiva" : ""}</small></span></label>
        {enabled && <div className="catalog-config__settings">
          <label className="catalog-config__choice"><input type="checkbox" name={`obligatoria_${measure.id_tipo_medida}`} defaultChecked={config?.obligatorio ?? false} /><span>Obligatoria</span></label>
          <fieldset className="catalog-config__moments"><legend>Cuándo registrar {measure.nombre}</legend>{([["INICIAL", "Al inicio"], ["CADA_SESION", "En cada sesión"], ["FINAL", "Al finalizar"]] as const).map(([value, label]) => <label className="catalog-config__choice" key={value}><input type="checkbox" name={`momentos_${measure.id_tipo_medida}`} value={value} defaultChecked={(config?.momentos ?? ["INICIAL", "FINAL"]).includes(value)} /><span>{label}</span></label>)}</fieldset>
        </div>}
      </div>;
    })}
  </fieldset>;
}

export function ServiceSuppliesFields({ supplies, current = [] }: { supplies: CatalogSupply[]; current?: ServiceSupply[] }) {
  const [selected, setSelected] = useState(() => new Set(current.map(item => item.id_producto)));
  const options = [...new Map([...supplies, ...current.map(item => item.producto)].map(item => [item.id_producto, item])).values()]
    .filter(item => item.estado === "ACTIVO" || selected.has(item.id_producto));
  return <fieldset className="catalog-config catalog-form__wide"><legend>Productos previstos por sesión</legend>
    <p>Son cantidades de referencia. Configurar el servicio no descuenta inventario.</p>
    {!options.length && <p>No hay insumos activos. Registra los productos en Inventario para poder seleccionarlos.</p>}
    {options.map(product => {
      const enabled = selected.has(product.id_producto);
      return <div className="catalog-config__item" key={product.id_producto}>
        <label className="catalog-config__choice"><input type="checkbox" name="productos" value={product.id_producto} checked={enabled} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(product.id_producto); else next.delete(product.id_producto); return next; })} /><span>{product.nombre} <small>{product.unidad_medida}{product.estado !== "ACTIVO" ? " · Inactivo" : ""}</small></span></label>
        {enabled && <label className="catalog-config__quantity"><span>Cantidad por sesión ({product.unidad_medida}) *</span><input name={`cantidad_${product.id_producto}`} type="number" min="0.01" max="99999999.99" step="0.01" defaultValue={current.find(item => item.id_producto === product.id_producto)?.cantidad_referencial ?? 1} required /></label>}
      </div>;
    })}
  </fieldset>;
}
