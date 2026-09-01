# study-loop

App local de estudo por repetição: gera perguntas de múltipla escolha sobre temas
de engenharia de software usando um CLI de agente de IA que você já tem instalado
(`claude` ou `opencode`), guarda tudo em SQLite e conta um streak de dias
estudados.

Roda inteiro na sua máquina — nenhum serviço externo, nenhuma API key no projeto.
A IA é o CLI que já está autenticado no seu ambiente.

## Como funciona

1. Você escolhe um tema específico ou o modo misto na home.
2. A sessão é criada na hora e a navegação acontece imediatamente; as perguntas
   são geradas em background (3 em paralelo) via `after()` do Next.
3. A tela da sessão faz poll em `GET /api/sessions/[id]/next` e mostra cada
   pergunta assim que ela fica pronta.
4. Ao responder, você vê a explicação e a fonte (quando o tema exige fonte, o
   agente faz busca na web e cita uma URL real).
5. Se a pergunta estiver errada, o botão de report tenta uma correção automática
   com nova busca; se falhar, ela vai pra fila de **Revisão** pra você aprovar ou
   apagar na mão.

Temas marcados como "precisa fonte" (Cloud e Segurança, por padrão) são gerados
com WebSearch/WebFetch liberados. Os demais rodam sem ferramentas.

## Dependências

**Obrigatórias**

| O quê | Versão | Por quê |
|---|---|---|
| Node.js | 22+ | `next dev`/`next start` e o `better-sqlite3` |
| npm | 10+ | instalação e scripts |
| Um CLI de agente | — | `claude` **ou** `opencode`, já autenticado |

`better-sqlite3` é um módulo nativo: precisa compilar no `npm install`. Em
distros minimalistas isso exige `build-essential` e `python3`.

**Provedor de conteúdo — escolha pelo menos um**

- **Claude Code** (`claude` no PATH) — usa `--output-format json` com
  `--json-schema`, então a resposta já vem validada. É o padrão.
- **opencode** (`opencode` no PATH, normalmente em `~/.opencode/bin`) — usa os
  agentes definidos em `.opencode/agent/` (`quiz-plain` e `quiz-grounded`). Como
  o CLI não tem schema nativo, o app extrai o JSON da resposta e faz 1 retry
  automático se vier torto.

**Opcionais (só pro atalho de desktop no Linux)**

`xdg-open`, `curl`, `notify-send`, `update-desktop-database`.

## Instalação

```bash
npm install
```

Não precisa de `.env` pra rodar. O banco (`data/study-loop.db`) e os temas
iniciais são criados na primeira requisição.

## Como usar

### Desenvolvimento

```bash
npm run dev
```

Abre em <http://localhost:7373>. A porta 7373 é fixa no script pra não brigar
com outros projetos na 3000.

### Produção local

```bash
npm run build
npm run start -- --port 7373 --hostname 127.0.0.1
```

### Atalho no menu de aplicativos (Linux/GNOME)

O jeito recomendado no dia a dia: instala um `.desktop` que sobe o servidor,
recompila se o código mudou, espera a porta responder e abre o navegador.

```bash
./scripts/install-desktop-entry.sh              # instala/atualiza
./scripts/install-desktop-entry.sh --uninstall  # remove
```

Depois disso, procure por "study-loop" no menu. O lançador também funciona
direto do terminal:

```bash
./scripts/study-loop.sh            # sobe (se preciso) e abre no navegador
./scripts/study-loop.sh --status   # diz se está no ar
./scripts/study-loop.sh --stop     # encerra o servidor
./scripts/study-loop.sh --rebuild  # força build novo antes de subir
./scripts/study-loop.sh --log      # abre o log
```

O log fica em `~/.local/state/study-loop/server.log` (rotaciona em 1 MB).

O servidor sobe só em `127.0.0.1` de propósito: o app expõe `POST /api/shutdown`
(o botão de desligar na barra de navegação), que não tem por que ser alcançável
pela rede.

## Telas

- **/** — inicia sessão (tema específico ou misto) e mostra o streak.
- **/session/[id]** — responde as perguntas, vê explicação e fonte, reporta erro.
- **/topics** — ativa/desativa temas e cria temas customizados (com a flag de
  "precisa fonte").
- **/review** — fila de perguntas reportadas que a correção automática não
  resolveu: aprovar ou apagar.
- **/settings** — troca o provedor de conteúdo em tempo de execução.

## Configuração

Variáveis de ambiente, todas opcionais, em `.env.local`:

| Variável | Padrão | O que faz |
|---|---|---|
| `CONTENT_PROVIDER` | `claude-code` | Provedor inicial: `claude-code` ou `opencode`. Vale só até você escolher em **/settings** — a escolha da UI fica no banco e passa a mandar. |
| `CLAUDE_MODEL` | `sonnet` | Modelo passado pro CLI `claude`. |
| `OPENCODE_BIN` | auto | Caminho do binário do opencode. Se não definido, tenta `~/.opencode/bin/opencode` e cai pro PATH. |
| `DB_PATH` | `./data/study-loop.db` | Arquivo do SQLite. |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui
sobre Base UI · better-sqlite3 · Zod.

O schema do banco é aplicado por `src/lib/db.ts` no import (`CREATE TABLE IF NOT
EXISTS` + migrações incrementais por `PRAGMA table_info`), então não existe passo
de migração separado. `data/` está no `.gitignore`: apagar esse diretório zera
histórico, streak e temas customizados.

## Problemas comuns

**"Não deu pra criar a sessão" ou sessão que falha ao gerar** — o CLI de agente
não foi encontrado ou não está autenticado. Teste `claude -p "oi"` /
`opencode run "oi"` no mesmo ambiente em que o servidor roda.

**Funciona no terminal mas falha pelo ícone do desktop** — um `.desktop` não
herda o PATH do shell interativo. O `scripts/study-loop.sh` já injeta
`~/.local/bin` e `~/.opencode/bin`; se seus binários vivem em outro lugar, ajuste
o `export PATH` lá ou defina `OPENCODE_BIN`.

**Erro de build do `better-sqlite3`** — falta toolchain nativa. Instale
`build-essential` e `python3` e rode `npm install` de novo.

**A geração é lenta** — cada pergunta é uma chamada de IA em subprocesso
(dezenas de segundos, timeout de 60s no `claude` e 120s no `opencode`). Por isso
a sessão abre na hora e as perguntas aparecem à medida que ficam prontas.
