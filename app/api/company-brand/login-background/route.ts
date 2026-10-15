import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/backend";

export async function GET() {
  try {
    const response = await fetch(backendUrl("/empresa/fondo-login-publico"), {
      cache: "no-store",
    });
    if (!response.ok || !response.body)
      return new NextResponse(null, { status: response.status || 404 });

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/webp",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
