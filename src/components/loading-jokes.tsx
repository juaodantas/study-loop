"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMPUTING_JOKES } from "@/lib/jokes";
import { cn } from "@/lib/utils";

const ROTATION_MS = 5000;

function shuffled(): string[] {
  const items = [...COMPUTING_JOKES];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

interface LoadingJokesProps {
  /** Linha de status em mono, ex.: "Gerando sua sessão". */
  status: string;
  /** `page` ocupa a tela de espera; `inline` cabe dentro de um cartão. */
  variant?: "page" | "inline";
  className?: string;
}

export function LoadingJokes({ status, variant = "page", className }: LoadingJokesProps) {
  // A fila embaralhada é consumida até esgotar antes de reembaralhar, então
  // nenhuma piada repete dentro de uma espera.
  const queue = useRef<string[]>([]);
  const [joke, setJoke] = useState<string | null>(null);

  const [seconds, setSeconds] = useState(0);

  const nextJoke = useCallback(() => {
    if (queue.current.length === 0) queue.current = shuffled();
    setJoke(queue.current.pop() ?? null);
  }, []);

  useEffect(() => {
    // A primeira piada só é sorteada no cliente: sorteá-la durante o SSR
    // causaria mismatch de hidratação.
    nextJoke();
    const interval = setInterval(() => {
      // Aba em background não consome piadas.
      if (document.hidden) return;
      nextJoke();
    }, ROTATION_MS);
    return () => clearInterval(interval);
  }, [nextJoke]);

  // Contador de espera: gerar uma pergunta leva perto de um minuto e meio, e
  // ver o tempo andar deixa claro que não travou.
  useEffect(() => {
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        variant === "page" && "rounded-xl bg-card p-5 ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="font-mono text-xs tracking-tight text-muted-foreground"
        >
          {status}
          <span className="ml-1 inline-block w-4 text-left text-signal">
            <span className="animate-pulse motion-reduce:animate-none">···</span>
          </span>
        </p>
        <span className="font-mono text-[0.625rem] uppercase tracking-widest tabular-nums text-muted-foreground/70">
          {seconds}s
        </span>
      </div>

      <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full origin-left rounded-full bg-signal animate-indeterminate motion-reduce:w-2/5 motion-reduce:animate-none" />
      </div>

      <div
        className={cn(
          "flex items-start",
          variant === "page" ? "min-h-[4.5rem]" : "min-h-14"
        )}
      >
        {joke && (
          <p
            // A key remonta o parágrafo a cada troca, o que replaya a animação
            // de entrada sem precisar orquestrar fade-out.
            key={joke}
            aria-hidden
            className="animate-in fade-in slide-in-from-bottom-1 text-balance text-sm leading-relaxed text-foreground/85 duration-300 motion-reduce:animate-none"
          >
            {joke}
          </p>
        )}
      </div>
    </div>
  );
}
