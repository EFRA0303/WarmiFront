"use client";

import Image from "next/image";

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

export type PresenceDirectoryUser = {
  id_usuario: number;
  nombre: string;
  rol: string;
  correo: string;
  foto_perfil_ruta: string | null;
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

function PresenceCard({ user }: { user: PresenceDirectoryUser }) {
  const { users } = useContext(PresenceContext);
  const online = Boolean(users[user.id_usuario]?.en_linea);
  const initials = user.nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <article className={`presence-card presence-card--${online ? "online" : "offline"}`}>
      <div className="presence-card__avatar">
        {user.foto_perfil_ruta ? (
          <Image
            src={`/api/users/${user.id_usuario}/profile-photo`}
            alt={`Foto de ${user.nombre}`}
            width={54}
            height={54}
            unoptimized
          />
        ) : (
          <span className="presence-avatar">{initials || "U"}</span>
        )}
        <i aria-hidden="true" />
      </div>
      <div className="presence-card__identity">
        <strong title={user.nombre}>{user.nombre}</strong>
        <span>{user.rol}</span>
        <small title={user.correo}>{user.correo}</small>
      </div>
      <UserPresenceStatus userId={user.id_usuario} />
    </article>
  );
}

export function UsersPresenceBoard({ users: directoryUsers }: { users: PresenceDirectoryUser[] }) {
  const { users } = useContext(PresenceContext);
  const online = directoryUsers.filter((user) => users[user.id_usuario]?.en_linea);
  const offline = directoryUsers.filter((user) => !users[user.id_usuario]?.en_linea);

  return (
    <div className="presence-board">
      <div className="presence-summary" aria-label="Resumen de presencia">
        <article className="presence-summary__online"><span><i />En línea</span><strong>{online.length}</strong><small>usuarios activos ahora</small></article>
        <article><span>Desconectados</span><strong>{offline.length}</strong><small>usuarios sin sesión activa</small></article>
        <article><span>Total registrado</span><strong>{directoryUsers.length}</strong><small>usuarios supervisados</small></article>
      </div>

      <section className="presence-section presence-section--online">
        <header><div><span className="presence-section__eyebrow"><i />ACTIVOS AHORA</span><h2>Usuarios en línea</h2><p>Sesiones con actividad reciente dentro del sistema.</p></div><b>{online.length}</b></header>
        {online.length ? <div className="presence-grid">{online.map((user) => <PresenceCard key={user.id_usuario} user={user} />)}</div> : <div className="presence-empty"><strong>No hay usuarios en línea</strong><span>La lista se actualizará automáticamente cuando alguien inicie actividad.</span></div>}
      </section>

      <section className="presence-section presence-section--offline">
        <header><div><span className="presence-section__eyebrow">SIN CONEXIÓN</span><h2>Usuarios desconectados</h2><p>Se muestra su última actividad registrada.</p></div><b>{offline.length}</b></header>
        {offline.length ? <div className="presence-grid">{offline.map((user) => <PresenceCard key={user.id_usuario} user={user} />)}</div> : <div className="presence-empty"><strong>Todos están conectados</strong><span>No hay usuarios desconectados en este momento.</span></div>}
      </section>
    </div>
  );
}
