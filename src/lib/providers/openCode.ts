import { generatedQuestionSchema } from "../schema";
import { runExecFile } from "./execUtil";
import { buildPrompt, buildCorrectionPrompt, type ContentProvider, type GenerateQuestionParams, type RegenerateParams } from "./types";

const JSON_SHAPE_HINT = JSON.stringify({
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  sourceUrl: "(optional)",
});

interface OpenCodeEvent {
  type: string;
  part?: { type?: string; text?: string };
}

function extractFinalText(stdout: string): string {
  const events: OpenCodeEvent[] = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const textEvents = events.filter((e) => e.type === "text" && e.part?.text);
  return textEvents[textEvents.length - 1]?.part?.text ?? "";
}

function extractJson(text: string) {
  const slice = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(slice);
}

async function callOpenCode(promptText: string, precisaFonte: boolean) {
  const agent = precisaFonte ? "quiz-grounded" : "quiz-plain";
  const fullPrompt = `${promptText}\n\nRespond with ONLY a single JSON object matching this exact shape, no prose, no markdown fences:\n${JSON_SHAPE_HINT}`;

  const { stdout } = await runExecFile(
    "opencode",
    ["run", fullPrompt, "--agent", agent, "--format", "json"],
    120_000
  );

  const finalText = extractFinalText(stdout);
  return generatedQuestionSchema.parse(extractJson(finalText));
}

async function generateWithRetry(params: GenerateQuestionParams) {
  const prompt = buildPrompt(params);
  try {
    return await callOpenCode(prompt, params.precisaFonte);
  } catch (err) {
    // motivo: 1 retry automático é o comportamento esperado (CLI sem schema nativo); logamos a 1a falha e deixamos a 2a propagar se também falhar
    console.error("openCodeProvider.generateQuestion first attempt failed, retrying", err);
    return await callOpenCode(
      `${prompt}\n\nIMPORTANT: your previous response was not valid JSON. Return ONLY the JSON object.`,
      params.precisaFonte
    );
  }
}

export const openCodeProvider: ContentProvider = {
  id: "opencode",
  generateQuestion: generateWithRetry,
  regenerateCorrected: async (params: RegenerateParams) => {
    try {
      return await callOpenCode(buildCorrectionPrompt(params), true);
    } catch (err) {
      // motivo: correção automática é best-effort; falha aqui deve cair no fluxo de revisão manual (pending_review), não quebrar o report do usuário
      console.error("openCodeProvider.regenerateCorrected failed", err);
      return null;
    }
  },
};
