import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(request: Request, ctx: RouteContext<"/api/topics/[id]">) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { active?: boolean; precisaFonte?: boolean };

  if (typeof body.active === "boolean") {
    db.prepare(`UPDATE topics SET active = ? WHERE id = ?`).run(body.active ? 1 : 0, id);
  }
  if (typeof body.precisaFonte === "boolean") {
    db.prepare(`UPDATE topics SET precisa_fonte = ? WHERE id = ?`).run(body.precisaFonte ? 1 : 0, id);
  }

  const topic = db.prepare(`SELECT * FROM topics WHERE id = ?`).get(id);
  return NextResponse.json({ topic });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/topics/[id]">) {
  const { id } = await ctx.params;

  const { count } = db.prepare(`SELECT COUNT(*) as count FROM questions WHERE topic_id = ?`).get(id) as {
    count: number;
  };
  if (count > 0) {
    return NextResponse.json(
      { error: "topic has questions; deactivate it instead of deleting" },
      { status: 409 }
    );
  }

  db.prepare(`DELETE FROM topics WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
