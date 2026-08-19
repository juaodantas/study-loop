import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rows = db
    .prepare(
      `SELECT q.*, t.name as topic_name FROM questions q
       JOIN topics t ON t.id = q.topic_id
       WHERE q.status = 'pending_review'
       ORDER BY q.created_at DESC`
    )
    .all();

  const items = rows.map((row) => {
    const r = row as {
      id: number;
      topic_name: string;
      prompt: string;
      options: string;
      correct_index: number;
      explanation: string;
      source_url: string | null;
    };
    return {
      id: r.id,
      topicName: r.topic_name,
      prompt: r.prompt,
      options: JSON.parse(r.options),
      correctIndex: r.correct_index,
      explanation: r.explanation,
      sourceUrl: r.source_url,
    };
  });

  return NextResponse.json({ items });
}
