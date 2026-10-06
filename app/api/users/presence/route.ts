import { backendUrl } from "@/lib/backend";
import { getSessionToken } from "@/lib/auth";

function validIds(value: string) {
  const ids = value.split(",");
  return (
    ids.length <= 100 &&
    ids.every((id) => /^[1-9]\d*$/.test(id.trim()))
  );
}

export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return Response.json({ message: "La sesión no está disponible." }, { status: 401 });
  }

  const ids = new URL(request.url).searchParams.get("ids")?.trim() || "";
  if (!ids || !validIds(ids)) {
    return Response.json(
      { message: "Los usuarios solicitados no son válidos." },
      { status: 400 },
    );
  }

  try {
    const params = new URLSearchParams({ ids });
    const response = await fetch(
      backendUrl(`/usuarios/presencia?${params.toString()}`),
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return Response.json(
        { message: "No fue posible actualizar la presencia." },
        { status: response.status },
      );
    }

    return Response.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { message: "No pudimos conectar con el servidor." },
      { status: 503 },
    );
  }
}
