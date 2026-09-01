import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAllSessionQuestions, type SessionRow } from "@/lib/questions";

const DEFAULT_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 20;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { mode, topicId, questionCount } = body as {
    mode: "specific-topic" | "mixed";
    topicId?: number;
    questionCount?: number;
  };

  if (mode !== "specific-topic" && mode !== "mixed") {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  }
  if (mode === "specific-topic" && !topicId) {
    return NextResponse.json({ error: "topicId is required for specific-topic mode" }, { status: 400 });
  }
  if (
    questionCount !== undefined &&
    (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > MAX_QUESTION_COUNT)
  ) {
    return NextResponse.json({ error: `questionCount must be an integer between 1 and ${MAX_QUESTION_COUNT}` }, { status: 400 });
  }

  const insert = db.prepare(
    `INSERT INTO sessions (mode, topic_id, question_count_target, generation_status) VALUES (?, ?, ?, 'generating')`
  );
  const result = insert.run(mode, mode === "specific-topic" ? topicId : null, questionCount ?? DEFAULT_QUESTION_COUNT);
  const sessionId = result.lastInsertRowid as number;
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId) as SessionRow;

  // Nenhuma pergunta bloqueia a resposta: cada uma custa uma chamada de IA por
  // subprocesso (dezenas de segundos). O cliente navega na hora e a tela da
  // sessão faz poll em GET /api/sessions/[id]/next, que já sabe responder
  // `generating` enquanto isso.
  after(async () => {
    await generateAllSessionQuestions(session);
  });

  return NextResponse.json({ sessionId }, { status: 201 });
}
