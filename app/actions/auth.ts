"use server";

import { redirect } from "next/navigation";
import { backendUrl, readApiMessage } from "@/lib/backend";
import {
  createSession,
  deleteSession,
  getSessionToken,
} from "@/lib/auth";
import type { AuthResponse, LoginState, PasswordResetState } from "@/lib/types";

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

export async function requestPasswordReset(email: string) {
  const correo_acceso = email.trim().toLowerCase();
  if (
    !correo_acceso ||
    correo_acceso.length > 150 ||
    !emailPattern.test(correo_acceso)
  ) {
    return { ok: false, message: "Ingresa un correo electrónico válido." };
  }

  try {
    const response = await fetch(backendUrl("/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo_acceso }),
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        message:
          (await readApiMessage(response)) ||
          "No fue posible procesar la solicitud.",
      };
    }
    return {
      ok: true,
      message:
        "Si el correo pertenece a una cuenta activa, recibirás un enlace válido durante 15 minutos.",
    };
  } catch {
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}

export async function resetPasswordAction(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const tokenValue = formData.get("token");
  const passwordValue = formData.get("nueva_contrasena");
  const confirmationValue = formData.get("confirmar_contrasena");
  const token = typeof tokenValue === "string" ? tokenValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const confirmation =
    typeof confirmationValue === "string" ? confirmationValue : "";
  const fieldErrors: Record<string, string> = {};

  if (!/^[a-fA-F0-9]{64}$/.test(token))
    fieldErrors.token = "El enlace de recuperación no es válido.";
  if (password.length < 12 || password.length > 72)
    fieldErrors.nueva_contrasena =
      "La contraseña debe tener entre 12 y 72 caracteres.";
  if (password !== confirmation)
    fieldErrors.confirmar_contrasena = "Las contraseñas no coinciden.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  try {
    const response = await fetch(backendUrl("/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, nueva_contrasena: password }),
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        message:
          (await readApiMessage(response)) ||
          "El enlace no es válido o ya expiró.",
      };
    }
    return {
      success: true,
      message: "Tu contraseña fue actualizada. Ya puedes iniciar sesión.",
    };
  } catch {
    return { message: "No pudimos conectar con el servidor." };
  }
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
