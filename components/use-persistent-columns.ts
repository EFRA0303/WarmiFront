"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

type ColumnDefinition = { key: string };
const preferenceEvent = "warmi:column-preferences";

export function usePersistentColumns({
  storageKey,
  columns,
  rootSelector,
  tableSelector,
  columnSelector,
  minimumWidth,
  widthPerColumn,
}: {
  storageKey: string;
  columns: readonly ColumnDefinition[];
  rootSelector: string;
  tableSelector: string;
  columnSelector: (key: string) => string;
  minimumWidth: number;
  widthPerColumn: number;
}) {
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) notify();
    };
    const onPreference = (event: Event) => {
      if ((event as CustomEvent<string>).detail === storageKey) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(preferenceEvent, onPreference);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(preferenceEvent, onPreference);
    };
  }, [storageKey]);

  const getSnapshot = useCallback(
    () => window.localStorage.getItem(storageKey) || "",
    [storageKey],
  );
  const rawPreferences = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const visibility = useMemo(() => {
    let saved: Record<string, unknown> | null = null;
    try {
      saved = rawPreferences ? JSON.parse(rawPreferences) as Record<string, unknown> : null;
    } catch {
      saved = null;
    }
    return Object.fromEntries(columns.map((column) => [
      column.key,
      saved && typeof saved[column.key] === "boolean" ? saved[column.key] : true,
    ])) as Record<string, boolean>;
  }, [columns, rawPreferences]);
  const applyVisibility = useCallback((values: Record<string, boolean>) => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    for (const column of columns) {
      root.querySelectorAll<HTMLElement>(columnSelector(column.key)).forEach((element) => {
        element.hidden = values[column.key] === false;
      });
    }

    const table = root.querySelector<HTMLTableElement>(tableSelector);
    const headers = table ? [...table.tHead?.rows[0]?.cells ?? []] : [];
    const visibleColumns = headers.filter((header) => !header.hidden).length;
    if (table) {
      table.style.minWidth = visibleColumns < headers.length
        ? `${Math.max(minimumWidth, visibleColumns * widthPerColumn)}px`
        : "";
      table.style.tableLayout = visibleColumns < headers.length ? "auto" : "fixed";
    }
  }, [columnSelector, columns, minimumWidth, rootSelector, tableSelector, widthPerColumn]);

  useEffect(() => {
    applyVisibility(visibility);
    const root = document.querySelector<HTMLElement>(rootSelector);
    const observer = root ? new MutationObserver(() => applyVisibility(visibility)) : null;
    if (root && observer) observer.observe(root, { childList: true, subtree: true });
    return () => observer?.disconnect();
  }, [applyVisibility, rootSelector, visibility]);

  function toggleColumn(key: string, visible: boolean) {
    const next = { ...visibility, [key]: visible };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(preferenceEvent, { detail: storageKey }));
    } catch {
      applyVisibility(next);
    }
  }

  return { visibility, toggleColumn };
}
