"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/topics", label: "Temas" },
  { href: "/review", label: "Revisão" },
  { href: "/settings", label: "Ajustes" },
];

type ShutdownState = "idle" | "confirming" | "stopping" | "stopped" | "failed";

export function SiteNav() {
  const pathname = usePathname();
  const [streak, setStreak] = useState<number | null>(null);
  const [shutdown, setShutdown] = useState<ShutdownState>("idle");

  useEffect(() => {
    let active = true;
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (active) setStreak(data.streak);
      })
      // O chip de streak é informativo: a nav funciona sem ele, mas a falha fica no console.
      .catch((err) => console.error("failed to load stats", err));
    return () => {
      active = false;
    };
  }, [pathname]);

  // Um clique errado no meio da sessão não pode derrubar o servidor, mas também
  // não deve deixar o botão armado pra sempre.
  useEffect(() => {
    if (shutdown !== "confirming") return;
    const timer = setTimeout(() => setShutdown("idle"), 5000);
    return () => clearTimeout(timer);
  }, [shutdown]);

  async function stopServer() {
    setShutdown("stopping");
    try {
      const res = await fetch("/api/shutdown", {
        method: "POST",
        headers: { "x-study-loop-shutdown": "1" },
      });
      if (!res.ok) throw new Error(`shutdown respondeu ${res.status}`);
      setShutdown("stopped");
    } catch (err) {
      console.error("failed to stop server", err);
      setShutdown("failed");
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-1 px-4">
          <Link
            href="/"
            className="mr-3 font-mono text-sm font-semibold tracking-tight"
          >
            study<span className="text-signal">-</span>loop
          </Link>

          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-1 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            {streak !== null && streak > 0 && (
              <span
                title={`${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"} de sessão`}
                className="inline-flex items-center gap-1 rounded-full bg-streak-surface px-2 py-0.5 font-mono text-xs text-streak"
              >
                <Flame className="size-3" aria-hidden />
                {streak}
              </span>
            )}

            {shutdown === "confirming" ? (
              <Button
                size="xs"
                variant="destructive"
                onClick={stopServer}
                autoFocus
              >
                <Power aria-hidden />
                Encerrar mesmo?
              </Button>
            ) : (
              <Button
                size="icon-xs"
                variant="ghost"
                title="Encerrar o servidor do study-loop"
                aria-label="Encerrar o servidor do study-loop"
                disabled={shutdown === "stopping"}
                onClick={() => setShutdown("confirming")}
                className="text-muted-foreground hover:text-destructive"
              >
                <Power aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {shutdown === "failed" && (
        <p role="alert" className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          Não deu pra encerrar o servidor daqui — use{" "}
          <code className="font-mono">study-loop.sh --stop</code>.
        </p>
      )}

      {shutdown === "stopped" && (
        <div
          role="status"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-background px-6 text-center"
        >
          <Power className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-mono text-sm font-semibold">servidor encerrado</p>
          <p className="text-sm text-muted-foreground">
            Pode fechar a aba. Pra voltar, abra o study-loop pelo menu de aplicativos.
          </p>
        </div>
      )}
    </>
  );
}
