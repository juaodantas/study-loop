"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Topic {
  id: number;
  name: string;
  slug: string;
  precisa_fonte: number;
  active: number;
  is_custom: number;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrecisaFonte, setNewPrecisaFonte] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/topics");
    const data = await res.json();
    setTopics(data.topics);
  }, []);

  useEffect(() => {
    fetch("/api/topics")
      .then((res) => res.json())
      .then((data) => setTopics(data.topics))
      .catch(() => setTopics([]));
  }, []);

  async function toggleActive(topic: Topic) {
    await fetch(`/api/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !topic.active }),
    });
    load();
  }

  async function togglePrecisaFonte(topic: Topic) {
    await fetch(`/api/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precisaFonte: !topic.precisa_fonte }),
    });
    load();
  }

  async function addTopic() {
    if (!newName.trim()) return;
    await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), precisaFonte: newPrecisaFonte }),
    });
    setNewName("");
    setNewPrecisaFonte(false);
    load();
  }

  async function deleteTopic(id: number) {
    const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "não foi possível excluir");
      return;
    }
    setError(null);
    load();
  }

  const activeCount = topics?.filter((t) => t.active).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        catálogo
      </p>
      <h1 className="mt-1.5 text-xl font-semibold tracking-tight">Temas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O modo misto sorteia entre os temas ativos.{" "}
        {topics && (
          <span className="font-mono text-xs">
            {activeCount}/{topics.length} ativos
          </span>
        )}
      </p>

      <div className="mt-5 divide-y rounded-xl bg-card ring-1 ring-foreground/10">
        {topics === null &&
          [0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center justify-between gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}

        {topics?.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Nenhum tema ainda. Adicione o primeiro abaixo.
          </p>
        )}

        {topics?.map((topic) => (
          <div
            key={topic.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    topic.active ? "bg-signal" : "bg-muted-foreground/40"
                  )}
                />
                <span className={cn("truncate", !topic.active && "text-muted-foreground")}>
                  {topic.name}
                </span>
              </p>
              <div className="mt-1 flex items-center gap-2 pl-3 font-mono text-[0.6875rem] text-muted-foreground">
                {!!topic.precisa_fonte && (
                  <span className="inline-flex items-center gap-1">
                    <Search className="size-3" aria-hidden />
                    exige fonte
                  </span>
                )}
                {!!topic.is_custom && <span>custom</span>}
                {!topic.active && <span>inativo</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => togglePrecisaFonte(topic)}>
                {topic.precisa_fonte ? "Não exigir fonte" : "Exigir fonte"}
              </Button>
              <Button
                size="sm"
                variant={topic.active ? "outline" : "default"}
                onClick={() => toggleActive(topic)}
              >
                {topic.active ? "Desativar" : "Ativar"}
              </Button>
              {!!topic.is_custom && (
                <Button
                  size="icon-sm"
                  variant="destructive"
                  aria-label={`Excluir ${topic.name}`}
                  onClick={() => deleteTopic(topic.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <section className="mt-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">Adicionar tema</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Nome do tema"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTopic();
            }}
          />
          <Button size="lg" disabled={!newName.trim()} onClick={addTopic}>
            <Plus aria-hidden />
            Adicionar
          </Button>
        </div>
        <label className="mt-3 flex w-fit items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="size-3.5 accent-[var(--signal)]"
            checked={newPrecisaFonte}
            onChange={(e) => setNewPrecisaFonte(e.target.checked)}
          />
          Exige fonte (grounding via busca)
        </label>
      </section>
    </main>
  );
}
