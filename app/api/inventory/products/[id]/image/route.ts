import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { backendUrl } from "@/lib/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getSessionToken();
  const { id } = await params;
  if (!token || !/^\d+$/.test(id)) return new NextResponse(null, { status: 404 });

  try {
    const response = await fetch(backendUrl(`/inventario/productos/${id}/imagen`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok || !response.body)
      return new NextResponse(null, { status: response.status || 404 });
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/webp",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
