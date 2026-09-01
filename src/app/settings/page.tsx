"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface ProviderOption {
  id: string;
  label: string;
  hint: string;
}

interface SettingsResponse {
  provider: string;
  options: ProviderOption[];
  envProvider: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setSettings)
      .catch((err) => {
        console.error("failed to load settings", err);
        setError("não foi possível carregar os ajustes");
      });
  }, []);

  async function selectProvider(provider: string) {
    if (!settings || provider === settings.provider) return;
    const previous = settings.provider;
    // Otimista: o clique no rádio precisa responder na hora; se o PATCH falhar,
    // a seleção volta pro que o servidor ainda tem.
    setSettings({ ...settings, provider });
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error(`PATCH /api/settings respondeu ${res.status}`);
    } catch (err) {
      console.error("failed to save provider", err);
      setSettings((current) => (current ? { ...current, provider: previous } : current));
      setError("não deu pra salvar — a escolha anterior continua valendo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        configuração
      </p>
      <h1 className="mt-1.5 text-xl font-semibold tracking-tight">Ajustes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quem escreve as perguntas. Vale da próxima geração em diante — uma sessão já
        criada continua com o provedor de quando foi gerada.
      </p>

      <section className="mt-5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">
          Provedor de conteúdo
          {saving && <span className="ml-2 font-mono text-xs text-muted-foreground">salvando…</span>}
        </h2>

        {settings === null ? (
          <div className="mt-3 grid gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <RadioGroup
            className="mt-3"
            value={settings.provider}
            onValueChange={(value) => selectProvider(String(value))}
          >
            {settings.options.map((option) => {
              const active = settings.provider === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    active ? "border-primary bg-accent/40" : "hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value={option.id} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted-foreground">
                      {option.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        )}

        {settings?.envProvider && settings.envProvider !== settings.provider && (
          <p className="mt-3 font-mono text-[0.6875rem] text-muted-foreground">
            O .env.local pede <span className="text-foreground">{settings.envProvider}</span>; a
            escolha desta tela tem prioridade.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </main>
  );
}
