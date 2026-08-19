"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Question {
  id: number;
  prompt: string;
  options: string[];
  topicName: string;
}

interface AttemptResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  sourceUrl: string | null;
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState({ answered: 0, target: 5 });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [reported, setReported] = useState(false);
  const requestIdRef = useRef(0);

  const loadNext = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setSelected(null);
    setResult(null);
    setReported(false);
    const res = await fetch(`/api/sessions/${sessionId}/next`);
    const data = await res.json();
    if (requestIdRef.current !== requestId) return; // resposta de uma chamada anterior (ex.: dupla invocação do Strict Mode); descartar
    setProgress({ answered: data.answered, target: data.target });
    if (data.done) {
      setDone(true);
      setQuestion(null);
    } else {
      setQuestion(data.question);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function submitAnswer(index: number) {
    if (!question || result) return;
    setSelected(index);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: Number(sessionId), questionId: question.id, answeredIndex: index }),
    });
    setResult(await res.json());
  }

  async function reportQuestion() {
    if (!question) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id }),
    });
    setReported(true);
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl px-4 py-10">Carregando pergunta...</main>;
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-xl font-semibold">Sessão concluída 🎉</h1>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Voltar pro início
        </Button>
      </main>
    );
  }

  if (!question) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Progress value={(progress.answered / progress.target) * 100} className="mb-4" />
      <p className="mb-2 text-sm text-muted-foreground">{question.topicName}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium leading-relaxed">{question.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrectOption = result && index === result.correctIndex;
            const isWrongSelected = result && isSelected && !result.correct;
            return (
              <button
                key={index}
                disabled={!!result}
                onClick={() => submitAnswer(index)}
                className={`w-full rounded-md border px-4 py-2 text-left transition-colors ${
                  isCorrectOption
                    ? "border-green-600 bg-green-50 dark:bg-green-950"
                    : isWrongSelected
                      ? "border-red-600 bg-red-50 dark:bg-red-950"
                      : "hover:bg-accent"
                }`}
              >
                {option}
              </button>
            );
          })}

          {result && (
            <div className="mt-4 space-y-2 rounded-md bg-muted p-4 text-sm">
              <p className="font-medium">{result.correct ? "Certo!" : "Não foi dessa vez."}</p>
              <p>{result.explanation}</p>
              {result.sourceUrl && (
                <a
                  href={result.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Fonte
                </a>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={loadNext}>Próxima</Button>
                <Button variant="ghost" disabled={reported} onClick={reportQuestion}>
                  {reported ? "Reportado" : "Isso está errado"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
