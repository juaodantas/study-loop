"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Flag, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingJokes } from "@/components/loading-jokes";
import { cn } from "@/lib/utils";

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

const GENERATION_POLL_INTERVAL_MS = 1200;
// Teto do poll: se a geração não terminar nesse tempo, algo travou no provider
// de IA e é melhor mostrar erro do que girar para sempre. Medido: uma sessão
// real leva ~90s para a primeira pergunta, então o teto precisa de folga.
const GENERATION_POLL_TIMEOUT_MS = 240_000;
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function formatElapsed(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState({ answered: 0, correct: 0, target: 5 });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [reported, setReported] = useState(false);
  const [waitingForGeneration, setWaitingForGeneration] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Único gatilho de busca: avançar de pergunta e o poll da geração apenas
  // incrementam isso, e o efeito abaixo é quem fala com a API.
  const [fetchTick, setFetchTick] = useState(0);
  const pollStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${sessionId}/next`)
      .then((res) => res.json())
      .then((data) => {
        // Descarta respostas de uma busca já substituída (inclui a dupla
        // invocação de efeitos do Strict Mode em dev).
        if (cancelled) return;
        setProgress({ answered: data.answered, correct: data.correct ?? 0, target: data.target });

        if (data.done) {
          setDone(true);
          setQuestion(null);
          setWaitingForGeneration(false);
          setLoading(false);
          return;
        }
        if (data.failed) {
          setFailed(true);
          setWaitingForGeneration(false);
          setLoading(false);
          return;
        }
        if (data.generating) {
          // Pergunta ainda sendo gerada em background: o efeito de poll reagenda.
          setQuestion(null);
          pollStartedAtRef.current ??= Date.now();
          if (Date.now() - pollStartedAtRef.current > GENERATION_POLL_TIMEOUT_MS) {
            setWaitingForGeneration(false);
            setFailed(true);
            setLoading(false);
            return;
          }
          setWaitingForGeneration(true);
          return;
        }

        pollStartedAtRef.current = null;
        setWaitingForGeneration(false);
        setQuestion(data.question);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchTick]);

  // Enquanto a geração não termina, reagenda a busca. O timer num efeito
  // separado faz o poll morrer junto com a tela.
  useEffect(() => {
    if (!waitingForGeneration) return;
    const timeout = setTimeout(() => setFetchTick((tick) => tick + 1), GENERATION_POLL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [waitingForGeneration, fetchTick]);

  // Avança para a próxima pergunta limpando o estado da anterior.
  const goNext = useCallback(() => {
    setLoading(true);
    setSelected(null);
    setResult(null);
    setReported(false);
    setElapsed(0);
    setFetchTick((tick) => tick + 1);
  }, []);

  // Cronômetro informativo da pergunta atual: conta enquanto a pergunta está
  // aberta e congela quando a resposta chega.
  useEffect(() => {
    if (!question || result) return;
    const interval = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [question, result]);

  const submitAnswer = useCallback(
    async (index: number) => {
      if (!question || result || selected !== null) return;
      setSelected(index);
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: Number(sessionId), questionId: question.id, answeredIndex: index }),
      });
      setResult(await res.json());
    },
    [question, result, selected, sessionId]
  );

  // Atalhos: 1-9 / a-i respondem, Enter avança.
  useEffect(() => {
    if (!question) return;
    const options = question.options;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (result) {
        if (event.key === "Enter") {
          event.preventDefault();
          goNext();
        }
        return;
      }

      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= options.length) {
        event.preventDefault();
        submitAnswer(digit - 1);
        return;
      }
      const letterIndex = OPTION_LETTERS.indexOf(event.key.toUpperCase());
      if (letterIndex >= 0 && letterIndex < options.length) {
        event.preventDefault();
        submitAnswer(letterIndex);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, result, submitAnswer, goNext]);

  async function reportQuestion() {
    if (!question) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id }),
    });
    setReported(true);
  }

  if (failed) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h1 className="flex items-center gap-2 text-base font-semibold">
            <TriangleAlert className="size-4 text-danger" aria-hidden />
            A geração das perguntas falhou
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            O provider de IA não respondeu. Vale checar se o CLI configurado está
            acessível e tentar de novo.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push("/")}>Voltar pro início</Button>
            <Button variant="outline" onClick={() => router.refresh()}>
              Recarregar
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <LoadingJokes
          status={
            waitingForGeneration && progress.answered > 0
              ? "Gerando a próxima pergunta"
              : "Gerando sua sessão"
          }
        />
      </main>
    );
  }

  if (done) {
    const total = progress.answered || progress.target;
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
            sessão concluída
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            <span className={progress.correct === total ? "text-success" : undefined}>
              {progress.correct}
            </span>
            <span className="text-muted-foreground">/{total}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {progress.correct === total
              ? "Placar limpo. Volte amanhã."
              : `${total - progress.correct} ${total - progress.correct === 1 ? "erro" : "erros"} — os reportados vão pra Revisão.`}
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push("/")}>
              Voltar pro início
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!question) return null;

  const stepIndex = Math.min(progress.answered + 1, progress.target);
  const barValue = ((progress.answered + (result ? 1 : 0)) / progress.target) * 100;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
      <div className="sticky top-12 z-10 -mx-4 border-b bg-background/85 px-4 py-3 backdrop-blur">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-signal transition-[width] duration-500"
            style={{ width: `${barValue}%` }}
            role="progressbar"
            aria-valuenow={progress.answered}
            aria-valuemin={0}
            aria-valuemax={progress.target}
            aria-label="Progresso da sessão"
          />
        </div>
        <div className="mt-2 flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="tabular-nums text-foreground">
            Q{stepIndex}
            <span className="text-muted-foreground">/{progress.target}</span>
          </span>
          <span className="rounded border px-1.5 py-0.5 text-[0.6875rem]">{question.topicName}</span>
          <span className="ml-auto tabular-nums" aria-label="tempo nesta pergunta">
            {formatElapsed(elapsed)}
          </span>
        </div>
      </div>

      <h1 className="mt-6 text-base font-medium leading-relaxed">{question.prompt}</h1>

      <div className="mt-4 space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrectOption = !!result && index === result.correctIndex;
          const isWrongSelected = !!result && isSelected && !result.correct;
          const dimmed = !!result && !isCorrectOption && !isWrongSelected;
          return (
            <button
              key={index}
              type="button"
              disabled={!!result || selected !== null}
              onClick={() => submitAnswer(index)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
                isCorrectOption && "border-success bg-success-surface",
                isWrongSelected && "border-danger bg-danger-surface",
                dimmed && "opacity-55",
                !result && "hover:border-foreground/25 hover:bg-accent"
              )}
            >
              <span
                className={cn(
                  "mt-px flex size-5 shrink-0 items-center justify-center rounded border font-mono text-[0.6875rem]",
                  isCorrectOption && "border-success text-success",
                  isWrongSelected && "border-danger text-danger",
                  !isCorrectOption && !isWrongSelected && "text-muted-foreground"
                )}
                aria-hidden
              >
                {OPTION_LETTERS[index] ?? index + 1}
              </span>
              <span className="flex-1 leading-relaxed">{option}</span>
              {isCorrectOption && <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />}
              {isWrongSelected && <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="mt-4 rounded-lg bg-muted p-4">
          <p
            className={cn(
              "font-mono text-[0.6875rem] uppercase tracking-[0.18em]",
              result.correct ? "text-success" : "text-danger"
            )}
          >
            {result.correct ? "certo" : "não foi dessa vez"}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{result.explanation}</p>
          {result.sourceUrl && (
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-signal hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Fonte
            </a>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={goNext}>
              Próxima
              <kbd className="ml-0.5 rounded border border-primary-foreground/30 px-1 font-mono text-[0.625rem] leading-4">
                ⏎
              </kbd>
            </Button>
            <Button variant="ghost" disabled={reported} onClick={reportQuestion}>
              <Flag aria-hidden />
              {reported ? "Reportado" : "Isso está errado"}
            </Button>
          </div>
        </div>
      )}

      {!result && (
        <p className="mt-4 font-mono text-[0.6875rem] text-muted-foreground/70">
          responda com {question.options.map((_, i) => OPTION_LETTERS[i]).join(" / ")} ou 1–
          {question.options.length}
        </p>
      )}
    </main>
  );
}
