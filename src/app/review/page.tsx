"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReviewItem {
  id: number;
  topicName: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceUrl: string | null;
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);

  async function load() {
    const res = await fetch("/api/review");
    const data = await res.json();
    setItems(data.items);
  }

  useEffect(() => {
    load();
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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Revisão pendente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Perguntas reportadas que não foram corrigidas automaticamente.
      </p>

      <div className="mt-6 space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nada pendente 🎉</p>}
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                {item.topicName}
              </Badge>
              <CardTitle className="text-base font-medium">{item.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="mb-2 space-y-1 text-sm">
                {item.options.map((option, index) => (
                  <li key={index} className={index === item.correctIndex ? "font-semibold" : ""}>
                    {option}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">{item.explanation}</p>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                  Fonte
                </a>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => resolve(item.id, "approve")}>
                  Aprovar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => resolve(item.id, "delete")}>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
