import "server-only";

const DEFAULT_BACKEND_URL = "http://localhost:3000";

export function backendUrl(path: string) {
  const baseUrl = (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(
    /\/$/,
    "",
  );
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function readApiMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message[0];
    return body.message;
  } catch {
    return undefined;
  }
}
