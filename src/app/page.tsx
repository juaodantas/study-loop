"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Topic {
  id: number;
  name: string;
  slug: string;
  precisa_fonte: number;
  active: number;
}

export default function Home() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [stats, setStats] = useState<{ streak: number; studiedToday: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((res) => res.json())
      .then((data) => setTopics(data.topics));
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  async function startSession(mode: "specific-topic" | "mixed") {
    setStarting(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, topicId: mode === "specific-topic" ? selectedTopicId : undefined }),
    });
    if (!res.ok) {
      setStarting(false);
      return;
    }
    const data = await res.json();
    router.push(`/session/${data.sessionId}`);
  }

  const activeTopics = topics.filter((t) => t.active);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">study-loop</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sessão diária curta pra manter as habilidades afiadas.
      </p>
      {stats && (
        <p className="mt-2 text-sm">
          🔥 {stats.streak} {stats.streak === 1 ? "dia seguido" : "dias seguidos"}
          {!stats.studiedToday && stats.streak > 0 && " — estude hoje pra manter"}
        </p>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Modo misto</CardTitle>
        </CardHeader>
        <CardContent>
          <Button disabled={starting} onClick={() => startSession("mixed")}>
            {starting ? "Gerando perguntas..." : "Iniciar sessão mista"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Escolher um tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {activeTopics.map((topic) => (
              <Badge
                key={topic.id}
                variant={selectedTopicId === topic.id ? "default" : "secondary"}
                className="cursor-pointer select-none"
                onClick={() => setSelectedTopicId(topic.id)}
              >
                {topic.name}
                {!!topic.precisa_fonte && " 🔎"}
              </Badge>
            ))}
          </div>
          <Button
            className="mt-4"
            disabled={!selectedTopicId || starting}
            onClick={() => startSession("specific-topic")}
          >
            {starting ? "Gerando perguntas..." : "Iniciar sessão neste tema"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
