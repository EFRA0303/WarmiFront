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
  const response = await fetch(backendUrl(`/empresa/${id}/logo`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return new NextResponse(null, { status: response.status });
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
    },
  });
}
