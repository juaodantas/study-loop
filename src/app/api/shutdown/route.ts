import { after, NextResponse } from "next/server";

// O header custom é o que separa "o usuário clicou no botão" de "uma página
// qualquer que ele abriu postou aqui": exigir um header não-simples força
// preflight, e o CORS barra a origem estranha antes do POST chegar.
const CONFIRM_HEADER = "x-study-loop-shutdown";

export async function POST(request: Request) {
  if (request.headers.get(CONFIRM_HEADER) !== "1") {
    return NextResponse.json({ error: "missing confirmation header" }, { status: 403 });
  }

  // after() roda depois da resposta ir embora; a folga extra é pro socket
  // esvaziar antes do processo sumir, senão o cliente vê um fetch quebrado em
  // vez do 200.
  after(() => {
    setTimeout(() => process.exit(0), 250);
  });

  return NextResponse.json({ ok: true });
}
