"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 60_000;
const MINIMUM_GAP_MS = 30_000;

export function PresenceHeartbeat() {
  const pathname = usePathname();
  const router = useRouter();
  const lastSentAt = useRef(0);

  useEffect(() => {
    let active = true;

    async function sendActivity(force = false) {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastSentAt.current < MINIMUM_GAP_MS) return;
      lastSentAt.current = now;

      try {
        const response = await fetch("/api/session/activity", {
          method: "POST",
          cache: "no-store",
        });
        if (active && response.ok && pathname === "/dashboard/usuarios") {
          router.refresh();
        }
      } catch {
        // El siguiente pulso vuelve a intentar sin interrumpir la interfaz.
      }
    }

    function resumeActivity() {
      void sendActivity();
    }

    void sendActivity(true);
    const interval = window.setInterval(sendActivity, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", resumeActivity);
    window.addEventListener("focus", resumeActivity);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resumeActivity);
      window.removeEventListener("focus", resumeActivity);
    };
  }, [pathname, router]);

  return null;
}
