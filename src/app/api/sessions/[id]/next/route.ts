import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNextSessionQuestion, type SessionRow } from "@/lib/questions";

export async function GET(_request: Request, ctx: RouteContext<"/api/sessions/[id]/next">) {
  const { id } = await ctx.params;
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionRow | undefined;
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const { answered, correct } = db
    .prepare(
      `SELECT COUNT(*) as answered, COALESCE(SUM(correct), 0) as correct
       FROM attempts WHERE session_id = ?`
    )
    .get(session.id) as { answered: number; correct: number };

  if (session.completed || answered >= session.question_count_target) {
    db.prepare(`UPDATE sessions SET completed = 1 WHERE id = ?`).run(session.id);
    return NextResponse.json({ done: true, answered, correct, target: session.question_count_target });
  }

  const question = getNextSessionQuestion(session.id);

  if (!question) {
    // As perguntas restantes ainda estão sendo geradas em background; o cliente
    // deve tentar de novo em breve em vez de tratar isso como sessão concluída.
    if (session.generation_status === "generating") {
      return NextResponse.json({
        done: false,
        generating: true,
        answered,
        correct,
        target: session.question_count_target,
      });
    }
    // Nenhuma pergunta chegou a ser gerada: a IA falhou. Sem isso o cliente
    // ficaria em poll infinito ou veria uma "sessão concluída" vazia.
    if (session.generation_status === "failed" && answered === 0) {
      return NextResponse.json({
        done: false,
        failed: true,
        answered,
        correct,
        target: session.question_count_target,
      });
    }
    db.prepare(`UPDATE sessions SET completed = 1 WHERE id = ?`).run(session.id);
    return NextResponse.json({ done: true, answered, correct, target: session.question_count_target });
  }

  return NextResponse.json({
    done: false,
    answered,
    correct,
    target: session.question_count_target,
    question: {
      id: question.id,
      prompt: question.prompt,
      options: JSON.parse(question.options),
      topicName: question.topic_name,
    },
  });
}
