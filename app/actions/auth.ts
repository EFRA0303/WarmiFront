"use server";

import { redirect } from "next/navigation";
import { backendUrl, readApiMessage } from "@/lib/backend";
import {
  createSession,
  deleteSession,
  getSessionToken,
} from "@/lib/auth";
import type { AuthResponse, LoginState } from "@/lib/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const correo = formData.get("correo_acceso");
  const password = formData.get("contrasena");
  const identificador = typeof correo === "string" ? correo.trim() : "";
  const contrasena = typeof password === "string" ? password : "";
  const fieldErrors: LoginState["fieldErrors"] = {};

  if (!identificador)
    fieldErrors.correo_acceso = "Ingresa tu correo o nombre de usuario.";
  else if (identificador.length > 150)
    fieldErrors.correo_acceso = "El identificador no puede superar 150 caracteres.";
  else if (identificador.includes("@") && !emailPattern.test(identificador))
    fieldErrors.correo_acceso = "Ingresa un correo válido.";

  if (!contrasena) fieldErrors.contrasena = "Ingresa tu contraseña.";
  else if (contrasena.length > 72)
    fieldErrors.contrasena = "La contraseña no puede superar 72 caracteres.";

  if (Object.keys(fieldErrors).length) return { fieldErrors };

  let response: Response;
  try {
    response = await fetch(backendUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo_acceso: identificador, contrasena }),
      cache: "no-store",
    });
  } catch {
    return {
      message:
        "No pudimos conectar con el servidor. Verifica que el backend esté activo.",
    };
  }

  if (!response.ok) {
    const apiMessage = await readApiMessage(response);
    const normalizedMessage = apiMessage?.toLowerCase() ?? "";
    const isLockMessage =
      normalizedMessage.includes("bloquead") ||
      normalizedMessage.includes("vuelve a intentarlo");
    return {
      message:
        response.status === 401
          ? isLockMessage
            ? apiMessage
            : "Correo, usuario o contraseña incorrectos, o la cuenta no está disponible."
          : apiMessage || "No fue posible iniciar sesión. Inténtalo nuevamente.",
    };
  }

  const data = (await response.json()) as Partial<AuthResponse>;
  if (!data.access_token || !data.expires_in) {
    return { message: "El servidor devolvió una respuesta de sesión inválida." };
  }

  await createSession(data.access_token, data.expires_in);
  redirect("/dashboard");
}

export async function logoutAction() {
  const token = await getSessionToken();

  if (token) {
    try {
      await fetch(backendUrl("/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // La sesión local se elimina incluso si el backend no está disponible.
    }
  }

  await deleteSession();
  redirect("/login");
}
