import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQuestionsForSession, type SessionRow } from "@/lib/questions";

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
    `INSERT INTO sessions (mode, topic_id, question_count_target) VALUES (?, ?, ?)`
  );
  const result = insert.run(mode, mode === "specific-topic" ? topicId : null, questionCount ?? DEFAULT_QUESTION_COUNT);
  const sessionId = result.lastInsertRowid as number;
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId) as SessionRow;

  try {
    await generateQuestionsForSession(session);
  } catch (err) {
    db.prepare(`DELETE FROM questions WHERE session_id = ?`).run(sessionId);
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    console.error("failed to pre-generate questions for session", err);
    return NextResponse.json({ error: "failed to generate questions" }, { status: 502 });
  }

  return NextResponse.json({ sessionId }, { status: 201 });
}
