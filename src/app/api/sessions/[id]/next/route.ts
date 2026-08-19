import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNextSessionQuestion, type SessionRow } from "@/lib/questions";

export async function GET(_request: Request, ctx: RouteContext<"/api/sessions/[id]/next">) {
  const { id } = await ctx.params;
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionRow | undefined;
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const { answered } = db
    .prepare(`SELECT COUNT(*) as answered FROM attempts WHERE session_id = ?`)
    .get(session.id) as { answered: number };

  // Todas as perguntas já foram pré-geradas na criação da sessão; aqui só lemos do banco.
  const question = session.completed || answered >= session.question_count_target
    ? undefined
    : getNextSessionQuestion(session.id);

  if (!question) {
    db.prepare(`UPDATE sessions SET completed = 1 WHERE id = ?`).run(session.id);
    return NextResponse.json({ done: true, answered, target: session.question_count_target });
  }

  return NextResponse.json({
    done: false,
    answered,
    target: session.question_count_target,
    question: {
      id: question.id,
      prompt: question.prompt,
      options: JSON.parse(question.options),
      topicName: question.topic_name,
    },
  });
}
