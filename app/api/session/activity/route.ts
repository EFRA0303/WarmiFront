import { backendUrl } from "@/lib/backend";
import { getSessionToken } from "@/lib/auth";

export async function POST() {
  const token = await getSessionToken();
  if (!token) {
    return Response.json({ en_linea: false }, { status: 401 });
  }

  try {
    const response = await fetch(backendUrl("/auth/activity"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { en_linea: false },
        { status: response.status },
      );
    }

    return Response.json({ en_linea: true });
  } catch {
    return Response.json({ en_linea: false }, { status: 503 });
  }
}
