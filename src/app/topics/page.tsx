"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Topic {
  id: number;
  name: string;
  slug: string;
  precisa_fonte: number;
  active: number;
  is_custom: number;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newName, setNewName] = useState("");
  const [newPrecisaFonte, setNewPrecisaFonte] = useState(false);

  async function load() {
    const res = await fetch("/api/topics");
    const data = await res.json();
    setTopics(data.topics);
  }

  useEffect(() => {
    load();
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
      alert(data.error ?? "não foi possível excluir");
      return;
    }
    load();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Temas</h1>

      <div className="mt-6 space-y-3">
        {topics.map((topic) => (
          <Card key={topic.id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{topic.name}</p>
                <div className="mt-1 flex gap-2">
                  {!!topic.precisa_fonte && <Badge variant="secondary">precisa fonte</Badge>}
                  {!!topic.is_custom && <Badge variant="outline">custom</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePrecisaFonte(topic)}>
                  {topic.precisa_fonte ? "Não exigir fonte" : "Exigir fonte"}
                </Button>
                <Button size="sm" variant={topic.active ? "secondary" : "default"} onClick={() => toggleActive(topic)}>
                  {topic.active ? "Desativar" : "Ativar"}
                </Button>
                {!!topic.is_custom && (
                  <Button size="sm" variant="destructive" onClick={() => deleteTopic(topic.id)}>
                    Excluir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Adicionar tema</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Nome do tema"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newPrecisaFonte}
              onChange={(e) => setNewPrecisaFonte(e.target.checked)}
            />
            Exige fonte (grounding via busca)
          </label>
          <Button onClick={addTopic}>Adicionar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
