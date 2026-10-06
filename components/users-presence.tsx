"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { UserPresenceSnapshot } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;

type PresenceContextValue = {
  users: Record<number, UserPresenceSnapshot>;
  referenceTime: string;
};

const PresenceContext = createContext<PresenceContextValue>({
  users: {},
  referenceTime: "",
});

function presenceRecord(items: UserPresenceSnapshot[]) {
  return Object.fromEntries(items.map((item) => [item.id_usuario, item]));
}

export function UsersPresenceProvider({
  initialUsers,
  initialReferenceTime,
  children,
}: {
  initialUsers: UserPresenceSnapshot[];
  initialReferenceTime: string;
  children: ReactNode;
}) {
  const [presence, setPresence] = useState(() => presenceRecord(initialUsers));
  const [referenceTime, setReferenceTime] = useState(initialReferenceTime);
  const requestInFlight = useRef(false);
  const ids = useMemo(
    () => initialUsers.map((user) => user.id_usuario).join(","),
    [initialUsers],
  );

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function refreshPresence() {
      if (
        document.visibilityState !== "visible" ||
        requestInFlight.current
      ) {
        return;
      }

      requestInFlight.current = true;
      controller = new AbortController();
      setReferenceTime(new Date().toISOString());

      try {
        const response = await fetch(
          `/api/users/presence?${new URLSearchParams({ ids }).toString()}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return;

        const updates = (await response.json()) as UserPresenceSnapshot[];
        if (active) setPresence(presenceRecord(updates));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // El siguiente intervalo vuelve a intentar sin interrumpir la tabla.
      } finally {
        requestInFlight.current = false;
      }
    }

    function resumePolling() {
      if (document.visibilityState === "visible") void refreshPresence();
    }

    void refreshPresence();
    const interval = window.setInterval(refreshPresence, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", resumePolling);
    window.addEventListener("focus", resumePolling);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resumePolling);
      window.removeEventListener("focus", resumePolling);
    };
  }, [ids]);

  return (
    <PresenceContext.Provider value={{ users: presence, referenceTime }}>
      {children}
    </PresenceContext.Provider>
  );
}

function zonedDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/La_Paz",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function calendarDay(date: Date) {
  const parts = zonedDateParts(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

function formatLastActivity(value: string | null, referenceTime: string) {
  if (!value) return "Sin actividad registrada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin actividad registrada";
  const reference = new Date(referenceTime);
  const currentDate = Number.isNaN(reference.getTime()) ? new Date() : reference;

  const formattedTime = new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/La_Paz",
  }).format(date);
  const dayDifference = calendarDay(currentDate) - calendarDay(date);

  if (dayDifference === 0) return `Hoy, ${formattedTime}`;
  if (dayDifference === 1) return `Ayer, ${formattedTime}`;

  const formattedDate = new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/La_Paz",
  })
    .format(date)
    .replace(/\./g, "");

  return `${formattedDate}, ${formattedTime}`;
}

export function UserPresenceStatus({ userId }: { userId: number }) {
  const { users, referenceTime } = useContext(PresenceContext);
  const presence = users[userId];

  if (presence?.en_linea) {
    return (
      <span className="user-presence user-presence--online">
        <strong><i />En línea</strong>
        <small>Activo ahora</small>
      </span>
    );
  }

  return (
    <span className="user-presence user-presence--offline">
      <strong><i />Desconectado</strong>
      <small>
        {formatLastActivity(
          presence?.ultima_desconexion_en ??
            presence?.ultima_actividad_en ??
            null,
          referenceTime,
        )}
      </small>
    </span>
  );
}
