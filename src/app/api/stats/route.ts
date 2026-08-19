import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const rows = db
    .prepare(`SELECT DISTINCT date FROM sessions WHERE completed = 1 ORDER BY date DESC`)
    .all() as { date: string }[];
  const completedDates = new Set(rows.map((r) => r.date));

  let streak = 0;
  const cursor = new Date();
  // motivo: se a sessão de hoje ainda não foi feita, o streak conta a partir de ontem pra não zerar o dia inteiro antes de estudar
  if (!completedDates.has(toDateOnly(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDates.has(toDateOnly(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return NextResponse.json({ streak, studiedToday: completedDates.has(toDateOnly(new Date())) });
}
