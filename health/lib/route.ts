import "server-only";
import { NextResponse } from "next/server";
import { AiError } from "./ai";
import { requireUser } from "./supabase/server";

type Handler = (body: Record<string, unknown>) => Promise<Response | unknown>;

/** Wraps an AI route: auth guard, JSON body parsing, uniform { error } responses. */
export function aiRoute(handler: Handler) {
  return async function POST(req: Request) {
    try {
      const auth = await requireUser(req);
      if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      const out = await handler(body);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (err) {
      const status = err instanceof AiError ? err.status : 500;
      const message = err instanceof Error ? err.message : "Unexpected server error";
      return NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
    }
  };
}

export function str(v: unknown, max = 40000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export class BadRequest extends AiError {
  constructor(message: string) {
    super(message, 400);
  }
}

const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]+$/i;

/** Validates a base64 data URL and returns its mime type. */
export function dataUrlMime(v: unknown, allowed: RegExp): string {
  if (typeof v !== "string" || v.length > 6_000_000 || !DATA_URL.test(v)) throw new BadRequest("Invalid or too large file");
  const mime = v.slice(5, v.indexOf(";")).toLowerCase();
  if (!allowed.test(mime)) throw new BadRequest(`Unsupported file type: ${mime}`);
  return mime;
}
