import { z } from "zod";

export const generatedQuestionSchema = z.object({
  prompt: z.string().min(10),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10),
  sourceUrl: z.string().url().optional(),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    prompt: { type: "string" },
    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
    explanation: { type: "string" },
    sourceUrl: { type: "string" },
  },
  required: ["prompt", "options", "correctIndex", "explanation"],
} as const;
