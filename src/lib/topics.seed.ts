import { db } from "./db";

const INITIAL_TOPICS: Array<{ name: string; slug: string; precisaFonte: boolean }> = [
  { name: "Estruturas de Dados", slug: "estruturas-de-dados", precisaFonte: false },
  { name: "Algoritmos & Complexidade", slug: "algoritmos-complexidade", precisaFonte: false },
  { name: "Sistemas Operacionais", slug: "sistemas-operacionais", precisaFonte: false },
  { name: "Redes", slug: "redes", precisaFonte: false },
  { name: "Bancos de Dados", slug: "bancos-de-dados", precisaFonte: false },
  { name: "Arquitetura de Software & Design Patterns", slug: "arquitetura-design-patterns", precisaFonte: false },
  { name: "Sistemas Distribuídos", slug: "sistemas-distribuidos", precisaFonte: false },
  { name: "Cloud", slug: "cloud", precisaFonte: true },
  { name: "Segurança", slug: "seguranca", precisaFonte: true },
  { name: "Git & Boas Práticas", slug: "git-boas-praticas", precisaFonte: false },
  { name: "LeetCode / Entrevistas", slug: "leetcode-entrevistas", precisaFonte: false },
];

export function seedTopics() {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM topics").get() as { count: number };
  if (count > 0) return;

  const insert = db.prepare(
    "INSERT INTO topics (name, slug, precisa_fonte, active, is_custom) VALUES (@name, @slug, @precisaFonte, 1, 0)"
  );
  const insertMany = db.transaction((topics: typeof INITIAL_TOPICS) => {
    for (const topic of topics) {
      insert.run({ name: topic.name, slug: topic.slug, precisaFonte: topic.precisaFonte ? 1 : 0 });
    }
  });
  insertMany(INITIAL_TOPICS);
}
