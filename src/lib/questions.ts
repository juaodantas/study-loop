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
  generation_status: "generating" | "ready" | "failed";
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

// Quantas chamadas ao provider de IA (cada uma é um subprocesso) podem rodar
// simultaneamente ao gerar o restante das perguntas de uma sessão em background.
const BACKGROUND_GENERATION_CONCURRENCY = 3;

async function mapWithConcurrency<T>(count: number, concurrency: number, fn: (index: number) => Promise<T>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < count) {
      const index = cursor++;
      await fn(index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker));
}

// Gera todas as perguntas da sessão em paralelo (limitado por concorrência).
// Roda depois da resposta de criação da sessão (via `after()` no route handler),
// então o usuário navega na hora e a tela da sessão faz poll enquanto isso.
// Falhas individuais são best-effort: registramos e seguimos, para não perder a
// sessão inteira por causa de uma única chamada de IA que falhou. Se nenhuma
// pergunta ficou de pé, a sessão é marcada como `failed` para a UI poder
// mostrar erro em vez de esperar para sempre.
export async function generateAllSessionQuestions(session: SessionRow): Promise<void> {
  await mapWithConcurrency(session.question_count_target, BACKGROUND_GENERATION_CONCURRENCY, async () => {
    try {
      const topic = pickTopicForSession(session.mode, session.topic_id);
      await generateNextQuestion(topic, session.id);
    } catch (err) {
      console.error(`failed to generate question for session ${session.id}`, err);
    }
  });

  const { generated } = db
    .prepare(`SELECT COUNT(*) as generated FROM questions WHERE session_id = ?`)
    .get(session.id) as { generated: number };

  db.prepare(`UPDATE sessions SET generation_status = ? WHERE id = ?`).run(
    generated > 0 ? "ready" : "failed",
    session.id
  );
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
