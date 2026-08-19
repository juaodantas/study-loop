import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedTopics } from "@/lib/topics.seed";

export async function GET() {
  seedTopics();
  const topics = db.prepare(`SELECT * FROM topics ORDER BY name`).all();
  return NextResponse.json({ topics });
}

export async function POST(request: NextRequest) {
  seedTopics();
  const body = await request.json();
  const { name, precisaFonte } = body as { name: string; precisaFonte: boolean };

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const insert = db.prepare(
    `INSERT INTO topics (name, slug, precisa_fonte, active, is_custom) VALUES (?, ?, ?, 1, 1)`
  );
  try {
    const result = insert.run(name.trim(), slug, precisaFonte ? 1 : 0);
    const topic = db.prepare(`SELECT * FROM topics WHERE id = ?`).get(result.lastInsertRowid);
    return NextResponse.json({ topic }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "topic already exists" }, { status: 409 });
  }
}
