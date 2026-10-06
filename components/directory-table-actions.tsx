"use client";

import { useMemo, useRef } from "react";
import { CheckIcon, ChevronRightIcon, ColumnsIcon, FileSpreadsheetIcon, FileTextIcon, PrinterIcon } from "@/components/icons";
import { useCloseDetailsOnOutside } from "@/components/use-close-details-on-outside";
import { usePersistentColumns } from "@/components/use-persistent-columns";

type DirectoryColumn = { key: string; label: string };
const directoryColumnSelector = (key: string) => `[data-directory-column="${key}"]`;

export function DirectoryTableActions({
  scope,
  fileName,
  columns,
  showActions,
}: {
  scope: string;
  fileName: string;
  columns: DirectoryColumn[];
  showActions: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseDetailsOnOutside(detailsRef);
  const activeColumns = useMemo(
    () => columns.filter((column) => column.key !== "actions" || showActions),
    [columns, showActions],
  );
  const { visibility, toggleColumn } = usePersistentColumns({
    storageKey: `warmi:table-columns:${scope}`,
    columns: activeColumns,
    rootSelector: `[data-directory-scope="${scope}"]`,
    tableSelector: "table",
    columnSelector: directoryColumnSelector,
    minimumWidth: 680,
    widthPerColumn: 145,
  });

  function exportExcel() {
    const table = document.querySelector<HTMLTableElement>(`[data-directory-scope="${scope}"] table`);
    if (!table) return;
    const rows = [...table.rows].map((row) => [...row.cells]
      .filter((cell) => !cell.hidden)
      .map((cell) => {
        const value = cell.innerText.replace(/\s+/g, " ").trim();
        const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
        return `"${safe.replaceAll('"', '""')}"`;
      }).join(","));
    const blob = new Blob(["\uFEFF", rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="directory-actionbar" aria-label="Acciones de la tabla">
      <button type="button" className="table-action table-action--excel" onClick={exportExcel}>
        <FileSpreadsheetIcon /><span>Excel</span>
      </button>
      <button type="button" className="table-action table-action--pdf" onClick={() => window.print()} title="En la ventana de impresión elige Guardar como PDF">
        <FileTextIcon /><span>PDF</span>
      </button>
      <button type="button" className="table-action" onClick={() => window.print()}>
        <PrinterIcon /><span>Imprimir</span>
      </button>
      <details ref={detailsRef} className="column-selector">
        <summary className="table-action"><ColumnsIcon /><span>Columnas</span><ChevronRightIcon className="table-action__chevron" /></summary>
        <div className="column-selector__menu">
          <div className="column-selector__heading"><strong>Columnas visibles</strong><small>Personaliza la tabla</small></div>
          {activeColumns.map((column) => (
            <label key={column.key}>
              <input type="checkbox" checked={visibility[column.key] !== false} onChange={(event) => toggleColumn(column.key, event.target.checked)} />
              <span className="column-checkbox"><CheckIcon /></span><span>{column.label}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
