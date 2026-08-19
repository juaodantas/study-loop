import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface QuestionRow {
  id: number;
  correct_index: number;
  explanation: string;
  source_url: string | null;
  status: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, questionId, answeredIndex } = body as {
    sessionId: number;
    questionId: number;
    answeredIndex: number;
  };

  const question = db.prepare(`SELECT * FROM questions WHERE id = ?`).get(questionId) as
    | QuestionRow
    | undefined;
  if (!question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const correct = answeredIndex === question.correct_index;

  db.prepare(
    `INSERT INTO attempts (session_id, question_id, correct, answered_index) VALUES (?, ?, ?, ?)`
  ).run(sessionId, questionId, correct ? 1 : 0, answeredIndex);

  return NextResponse.json({
    correct,
    correctIndex: question.correct_index,
    explanation: question.explanation,
    sourceUrl: question.source_url,
  });
}
