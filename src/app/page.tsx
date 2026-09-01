"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, LoaderCircle, Search, Shuffle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Topic {
  id: number;
  name: string;
  slug: string;
  precisa_fonte: number;
  active: number;
}

type SessionMode = "specific-topic" | "mixed";

export default function Home() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  // Guarda *qual* modo está iniciando: com um booleano os dois botões entravam
  // em estado de carregamento ao mesmo tempo.
  const [startingMode, setStartingMode] = useState<SessionMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ streak: number; studiedToday: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((res) => res.json())
      .then((data) => setTopics(data.topics))
      .catch(() => setTopics([]));
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats)
      // O streak é informativo: a home funciona sem ele, mas a falha fica no console.
      .catch((err) => console.error("failed to load stats", err));
  }, []);

  async function startSession(mode: SessionMode) {
    if (startingMode) return;
    setStartingMode(mode);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, topicId: mode === "specific-topic" ? selectedTopicId : undefined }),
      });
      if (!res.ok) {
        setError("Não deu pra criar a sessão. Tente de novo.");
        setStartingMode(null);
        return;
      }
      const data = await res.json();
      // O estado de carregamento continua até a navegação acontecer.
      router.push(`/session/${data.sessionId}`);
    } catch {
      setError("Não deu pra criar a sessão. Tente de novo.");
      setStartingMode(null);
    }
  }

  const activeTopics = topics?.filter((t) => t.active) ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        sessão diária
      </p>
      <h1 className="mt-1.5 text-xl font-semibold tracking-tight">
        Cinco perguntas pra manter a faca afiada
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        As perguntas são geradas na hora pela IA a partir dos seus temas ativos.
      </p>

      <div className="mt-4 h-6">
        {stats && (
          <div className="flex items-center gap-2 text-xs">
            {stats.studiedToday ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-surface px-2 py-0.5 font-mono text-success">
                <Check className="size-3" aria-hidden />
                estudado hoje
              </span>
            ) : stats.streak > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-streak-surface px-2 py-0.5 font-mono text-streak">
                <Flame className="size-3" aria-hidden />
                {stats.streak} {stats.streak === 1 ? "dia" : "dias"} — estude hoje pra manter
              </span>
            ) : (
              <span className="font-mono text-muted-foreground">
                nenhum streak ativo — comece hoje
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Shuffle className="size-3.5 text-signal" aria-hidden />
              Modo misto
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Sorteia entre todos os temas ativos. É o caminho curto do dia a dia.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={startingMode !== null}
            onClick={() => startSession("mixed")}
          >
            {startingMode === "mixed" ? (
              <>
                <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                Criando sessão…
              </>
            ) : (
              "Iniciar sessão mista"
            )}
          </Button>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Target className="size-3.5 text-signal" aria-hidden />
              Tema específico
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Todas as perguntas saem do tema escolhido.
            </p>
          </div>

          <div role="radiogroup" aria-label="Temas" className="flex flex-wrap gap-1.5">
            {topics === null &&
              [64, 88, 52, 76, 60].map((width, index) => (
                <Skeleton key={index} className="h-6" style={{ width }} />
              ))}
            {topics !== null && activeTopics.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum tema ativo. Ative um em <span className="font-mono">Temas</span>.
              </p>
            )}
            {activeTopics.map((topic) => {
              const selected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-signal bg-signal-surface text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                  )}
                >
                  {topic.name}
                  {!!topic.precisa_fonte && (
                    <Search
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-label="exige fonte citada"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            variant={selectedTopicId ? "default" : "outline"}
            className="mt-auto w-full"
            disabled={!selectedTopicId || startingMode !== null}
            onClick={() => startSession("specific-topic")}
          >
            {startingMode === "specific-topic" ? (
              <>
                <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                Criando sessão…
              </>
            ) : (
              "Iniciar neste tema"
            )}
          </Button>
        </section>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </main>
  );
}
