"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ReviewItem {
  id: number;
  topicName: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceUrl: string | null;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/review");
    const data = await res.json();
    setItems(data.items);
  }, []);

  useEffect(() => {
    fetch("/api/review")
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);

  async function resolve(id: number, action: "approve" | "delete") {
    await fetch(`/api/review/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        fila de correção
      </p>
      <h1 className="mt-1.5 text-xl font-semibold tracking-tight">Revisão pendente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Perguntas que você reportou e que não foram corrigidas automaticamente.
      </p>

      <div className="mt-5 space-y-3">
        {items === null &&
          [0, 1].map((index) => (
            <div key={index} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          ))}

        {items?.length === 0 && (
          <p className="rounded-xl bg-card px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
            Nada pendente. A fila está limpa.
          </p>
        )}

        {items?.map((item) => (
          <article key={item.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <span className="rounded border px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
              {item.topicName}
            </span>
            <h2 className="mt-2 text-sm font-medium leading-relaxed">{item.prompt}</h2>

            <ul className="mt-3 space-y-1">
              {item.options.map((option, index) => {
                const isCorrect = index === item.correctIndex;
                return (
                  <li
                    key={index}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      isCorrect ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    <span className="mt-px font-mono text-[0.6875rem]">
                      {OPTION_LETTERS[index] ?? index + 1}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.explanation}</p>
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-signal hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Fonte
              </a>
            )}

            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => resolve(item.id, "approve")}>
                <Check aria-hidden />
                Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => resolve(item.id, "delete")}>
                <Trash2 aria-hidden />
                Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
