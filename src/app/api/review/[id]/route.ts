import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request, ctx: RouteContext<"/api/review/[id]">) {
  const { id } = await ctx.params;
  const { action } = (await request.json()) as { action: "approve" | "delete" };

  if (action === "approve") {
    db.prepare(`UPDATE questions SET status = 'active' WHERE id = ?`).run(id);
    db.prepare(`UPDATE reports SET resolved = 1 WHERE question_id = ?`).run(id);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    db.prepare(`DELETE FROM attempts WHERE question_id = ?`).run(id);
    db.prepare(`DELETE FROM reports WHERE question_id = ?`).run(id);
    db.prepare(`DELETE FROM questions WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
