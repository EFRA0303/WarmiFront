"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const SEARCH_DELAY_MS = 350;

type DynamicSearchInputProps = {
  id: string;
  initialValue: string;
  placeholder: string;
  basePath: string;
};

export function DynamicSearchInput({
  id,
  initialValue,
  placeholder,
  basePath,
}: DynamicSearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (value === initialValue) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const search = value.trim();

      if (search) params.set("search", search);
      else params.delete("search");
      params.delete("page");
      params.delete("creado");

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${basePath}?${query}` : basePath, {
          scroll: false,
        });
      });
    }, SEARCH_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [basePath, initialValue, router, value]);

  return (
    <>
      <input
        id={id}
        name="search"
        type="search"
        value={value}
        placeholder={placeholder}
        maxLength={150}
        autoComplete="off"
        aria-busy={pending}
        onChange={(event) => setValue(event.target.value)}
      />
      <span
        className={`dynamic-search-progress${pending ? " dynamic-search-progress--active" : ""}`}
        aria-hidden="true"
      />
    </>
  );
}
