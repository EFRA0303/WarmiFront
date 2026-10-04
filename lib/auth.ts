import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { backendUrl } from "@/lib/backend";
import type { CurrentUser } from "@/lib/types";

export const SESSION_COOKIE = "warmi_session";
export const SESSION_MAX_AGE = 60 * 60;

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function createSession(token: string, expiresIn = SESSION_MAX_AGE) {
  const maxAge =
    Number.isInteger(expiresIn) && expiresIn >= 60
      ? expiresIn
      : SESSION_MAX_AGE;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
    priority: "high",
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const response = await fetch(backendUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as CurrentUser;
  } catch {
    return null;
  }
});
