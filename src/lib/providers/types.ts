import type { GeneratedQuestion } from "../schema";

export interface GenerateQuestionParams {
  topicName: string;
  precisaFonte: boolean;
  recentPrompts: string[];
}

export interface RegenerateParams extends GenerateQuestionParams {
  badQuestion: GeneratedQuestion;
}

export interface ContentProvider {
  readonly id: "claude-code" | "opencode";
  generateQuestion(params: GenerateQuestionParams): Promise<GeneratedQuestion>;
  regenerateCorrected(params: RegenerateParams): Promise<GeneratedQuestion | null>;
}

export function buildPrompt({ topicName, precisaFonte, recentPrompts }: GenerateQuestionParams): string {
  return [
    `Generate ONE multiple-choice question about "${topicName}" for a software engineer studying to avoid skill atrophy.`,
    `Return exactly 4 options, exactly one correct.`,
    recentPrompts.length
      ? `Avoid repeating or closely resembling these already-asked prompts:\n${recentPrompts.map((p) => `- ${p}`).join("\n")}`
      : "",
    precisaFonte
      ? `This topic requires grounding: search the web and cite a real, working source URL that supports the correct answer. Include that URL as "sourceUrl" in your JSON output — the search tool itself will not do this for you.`
      : `A source URL is optional; include one only if you are confident it is real and relevant.`,
    `Explanation should be 2-4 sentences.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCorrectionPrompt(params: RegenerateParams): string {
  return [
    buildPrompt(params),
    `The previous version of this question was flagged as incorrect by the user:\n${JSON.stringify(params.badQuestion)}`,
    `Re-verify with a fresh web search and provide a corrected version with a valid, working source URL.`,
  ].join("\n\n");
}
