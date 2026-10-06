"use client";

import { type RefObject, useEffect } from "react";

export function useCloseDetailsOnOutside(
  detailsRef: RefObject<HTMLDetailsElement | null>,
) {
  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const details = detailsRef.current;
      if (
        !details?.open ||
        !(event.target instanceof Node) ||
        details.contains(event.target)
      ) {
        return;
      }

      details.removeAttribute("open");
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [detailsRef]);
}
