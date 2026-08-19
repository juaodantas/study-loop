import { generatedQuestionSchema, QUESTION_JSON_SCHEMA } from "../schema";
import { runExecFile } from "./execUtil";
import { buildPrompt, buildCorrectionPrompt, type ContentProvider } from "./types";

async function callClaude(promptText: string, precisaFonte: boolean) {
  const args = [
    "-p",
    promptText,
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(QUESTION_JSON_SCHEMA),
    "--model",
    process.env.CLAUDE_MODEL ?? "sonnet",
  ];
  if (precisaFonte) args.push("--allowedTools", "WebSearch,WebFetch");

  const { stdout } = await runExecFile("claude", args, 60_000);
  const outer = JSON.parse(stdout);
  if (outer.is_error) throw new Error(`claude CLI error: ${outer.result}`);
  return generatedQuestionSchema.parse(outer.structured_output);
}

export const claudeCodeProvider: ContentProvider = {
  id: "claude-code",
  generateQuestion: (params) => callClaude(buildPrompt(params), params.precisaFonte),
  regenerateCorrected: async (params) => {
    try {
      return await callClaude(buildCorrectionPrompt(params), true);
    } catch (err) {
      // motivo: correção automática é best-effort; falha aqui deve cair no fluxo de revisão manual (pending_review), não quebrar o report do usuário
      console.error("claudeCodeProvider.regenerateCorrected failed", err);
      return null;
    }
  },
};
