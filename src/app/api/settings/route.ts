import { NextRequest, NextResponse } from "next/server";
import {
  envProviderId,
  getProviderId,
  isProviderId,
  PROVIDER_OPTIONS,
  setProviderId,
} from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    provider: getProviderId(),
    options: PROVIDER_OPTIONS,
    envProvider: envProviderId(),
  });
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: esperado JSON" }, { status: 400 });
  }

  const provider = (body as { provider?: unknown } | null)?.provider;

  if (!isProviderId(provider)) {
    return NextResponse.json({ error: "provider inválido" }, { status: 400 });
  }

  setProviderId(provider);
  return NextResponse.json({ provider });
}
