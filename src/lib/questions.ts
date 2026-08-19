import { db } from "./db";
import { getContentProvider } from "./config";

export interface Topic {
  id: number;
  name: string;
  slug: string;
  precisa_fonte: number;
  active: number;
  is_custom: number;
}

export interface QuestionRow {
  id: number;
  topic_id: number;
  session_id: number | null;
  prompt: string;
  options: string; // JSON-encoded string[]
  correct_index: number;
  explanation: string;
  source_url: string | null;
  status: string;
  generated_by: string;
}

export interface SessionRow {
  id: number;
  mode: "specific-topic" | "mixed";
  topic_id: number | null;
  question_count_target: number;
  completed: number;
}

const RECENT_PROMPTS_LIMIT = 5;

export async function generateNextQuestion(topic: Topic, sessionId: number | null = null): Promise<QuestionRow> {
  const recentPrompts = db
    .prepare(
      `SELECT prompt FROM questions WHERE topic_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(topic.id, RECENT_PROMPTS_LIMIT)
    .map((row) => (row as { prompt: string }).prompt);

  const provider = getContentProvider();
  const generated = await provider.generateQuestion({
    topicName: topic.name,
    precisaFonte: !!topic.precisa_fonte,
    recentPrompts,
  });

  const insert = db.prepare(
    `INSERT INTO questions (topic_id, session_id, prompt, options, correct_index, explanation, source_url, generated_by)
     VALUES (@topicId, @sessionId, @prompt, @options, @correctIndex, @explanation, @sourceUrl, @generatedBy)`
  );
  const result = insert.run({
    topicId: topic.id,
    sessionId,
    prompt: generated.prompt,
    options: JSON.stringify(generated.options),
    correctIndex: generated.correctIndex,
    explanation: generated.explanation,
    sourceUrl: generated.sourceUrl ?? null,
    generatedBy: provider.id,
  });

  return db
    .prepare(`SELECT * FROM questions WHERE id = ?`)
    .get(result.lastInsertRowid) as QuestionRow;
}

// Gera todas as perguntas da sessão de uma vez, na criação, para que o quiz
// nunca precise esperar a IA responder entre uma pergunta e outra.
export async function generateQuestionsForSession(session: SessionRow): Promise<QuestionRow[]> {
  const questions: QuestionRow[] = [];
  for (let i = 0; i < session.question_count_target; i++) {
    const topic = pickTopicForSession(session.mode, session.topic_id);
    questions.push(await generateNextQuestion(topic, session.id));
  }
  return questions;
}

export function getNextSessionQuestion(sessionId: number): (QuestionRow & { topic_name: string }) | undefined {
  return db
    .prepare(
      `SELECT q.*, t.name as topic_name FROM questions q
       JOIN topics t ON t.id = q.topic_id
       WHERE q.session_id = ?
         AND q.id NOT IN (SELECT question_id FROM attempts WHERE session_id = ?)
       ORDER BY q.id ASC
       LIMIT 1`
    )
    .get(sessionId, sessionId) as (QuestionRow & { topic_name: string }) | undefined;
}

export function pickTopicForSession(mode: "specific-topic" | "mixed", topicId: number | null): Topic {
  if (mode === "specific-topic") {
    const topic = db.prepare(`SELECT * FROM topics WHERE id = ?`).get(topicId) as Topic | undefined;
    if (!topic) throw new Error(`Topic ${topicId} not found`);
    return topic;
  }
  const topic = db
    .prepare(`SELECT * FROM topics WHERE active = 1 ORDER BY RANDOM() LIMIT 1`)
    .get() as Topic | undefined;
  if (!topic) throw new Error("No active topics available");
  return topic;
}
