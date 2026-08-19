import { claudeCodeProvider } from "./providers/claudeCode";
import { openCodeProvider } from "./providers/openCode";
import type { ContentProvider } from "./providers/types";

export function getContentProvider(): ContentProvider {
  const choice = process.env.CONTENT_PROVIDER ?? "claude-code";
  if (choice === "claude-code") return claudeCodeProvider;
  if (choice === "opencode") return openCodeProvider;
  throw new Error(`Unknown CONTENT_PROVIDER: ${choice}`);
}
