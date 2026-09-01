import { db } from "./db";
import { claudeCodeProvider } from "./providers/claudeCode";
import { openCodeProvider } from "./providers/openCode";
import type { ContentProvider } from "./providers/types";

export type ProviderId = ContentProvider["id"];

const PROVIDERS: Record<ProviderId, ContentProvider> = {
  "claude-code": claudeCodeProvider,
  opencode: openCodeProvider,
};

export const PROVIDER_OPTIONS: { id: ProviderId; label: string; hint: string }[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    hint: "CLI `claude`, com WebSearch nos temas que exigem fonte.",
  },
  {
    id: "opencode",
    label: "opencode",
    hint: "CLI `opencode`, usando o modelo configurado nele.",
  },
];

const SETTING_KEY = "content_provider";
const DEFAULT_PROVIDER: ProviderId = "claude-code";

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

/** O que o .env.local pede, quando pede algo válido. */
export function envProviderId(): ProviderId | null {
  const fromEnv = process.env.CONTENT_PROVIDER;
  if (!fromEnv) return null;
  if (isProviderId(fromEnv)) return fromEnv;
  console.warn(`CONTENT_PROVIDER inválido: ${fromEnv} — ignorando`);
  return null;
}

/**
 * A escolha feita em Ajustes manda. O env fica valendo como padrão de primeira
 * execução, pra quem nunca abriu a tela — e some do caminho depois disso.
 */
export function getProviderId(): ProviderId {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(SETTING_KEY) as
    | { value: string }
    | undefined;
  if (isProviderId(row?.value)) return row.value;
  return envProviderId() ?? DEFAULT_PROVIDER;
}

export function setProviderId(id: ProviderId): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(SETTING_KEY, id);
}

export function getContentProvider(): ContentProvider {
  return PROVIDERS[getProviderId()];
}
