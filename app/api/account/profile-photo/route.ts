import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { backendUrl } from "@/lib/backend";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return new NextResponse(null, { status: 401 });

  const response = await fetch(backendUrl("/auth/me/foto-perfil"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return new NextResponse(null, { status: response.status });

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/webp",
      "Cache-Control": "private, no-store",
    },
  });
}
