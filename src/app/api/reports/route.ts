import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContentProvider } from "@/lib/config";

interface QuestionRow {
  id: number;
  topic_id: number;
  prompt: string;
  options: string;
  correct_index: number;
  explanation: string;
  source_url: string | null;
}

interface TopicRow {
  id: number;
  name: string;
  precisa_fonte: number;
}

export async function POST(request: NextRequest) {
  const { questionId } = (await request.json()) as { questionId: number };

  const question = db.prepare(`SELECT * FROM questions WHERE id = ?`).get(questionId) as
    | QuestionRow
    | undefined;
  if (!question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  db.prepare(`UPDATE questions SET status = 'pending_review' WHERE id = ?`).run(questionId);
  db.prepare(`INSERT INTO reports (question_id) VALUES (?)`).run(questionId);

  const topic = db.prepare(`SELECT * FROM topics WHERE id = ?`).get(question.topic_id) as TopicRow;

  try {
    const provider = getContentProvider();
    const corrected = await provider.regenerateCorrected({
      topicName: topic.name,
      precisaFonte: !!topic.precisa_fonte,
      recentPrompts: [],
      badQuestion: {
        prompt: question.prompt,
        options: JSON.parse(question.options),
        correctIndex: question.correct_index,
        explanation: question.explanation,
        sourceUrl: question.source_url ?? undefined,
      },
    });

    if (corrected) {
      db.prepare(
        `UPDATE questions SET prompt = ?, options = ?, correct_index = ?, explanation = ?, source_url = ?, status = 'active' WHERE id = ?`
      ).run(
        corrected.prompt,
        JSON.stringify(corrected.options),
        corrected.correctIndex,
        corrected.explanation,
        corrected.sourceUrl ?? null,
        questionId
      );
      db.prepare(`UPDATE reports SET resolved = 1 WHERE question_id = ?`).run(questionId);
      return NextResponse.json({ status: "auto_corrected" });
    }
  } catch (err) {
    // motivo: provider já loga a causa raiz internamente; aqui só decidimos deixar a pergunta em pending_review pra revisão manual
    console.error("report auto-correction pipeline failed", err);
  }

  return NextResponse.json({ status: "pending_review" });
}
