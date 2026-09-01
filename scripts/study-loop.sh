#!/usr/bin/env bash
# Lançador do study-loop para o ambiente gráfico (ícone do GNOME).
#
# Sobe o servidor de produção em background, reconstrói se o código mudou desde
# o último build, espera a porta responder e abre o navegador. Rodar de novo com
# o servidor já no ar apenas reabre a aba.
#
#   study-loop.sh            sobe (se preciso) e abre no navegador
#   study-loop.sh --stop     encerra o servidor
#   study-loop.sh --status   diz se está no ar
#   study-loop.sh --log      abre o log
#   study-loop.sh --rebuild  força um build novo antes de subir

set -uo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

# Um .desktop não herda o PATH de um shell interativo: aqui o node/npm vivem em
# ~/.local/bin e o CLI do opencode em ~/.opencode/bin. Sem isso o app até sobe,
# mas falha ao gerar as perguntas — que foi o problema visto com o opencode.
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$PATH"

# 3000 vive disputado com outros projetos locais; 7373 não colide com nada
# comum. Dá pra trocar por sessão exportando STUDY_LOOP_PORT.
PORT="${STUDY_LOOP_PORT:-7373}"
URL="http://127.0.0.1:${PORT}"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/study-loop"
LOG="$STATE_DIR/server.log"
PID_FILE="$STATE_DIR/server.pid"
READY_TIMEOUT_S=90
LOG_MAX_BYTES=$((1024 * 1024))

mkdir -p "$STATE_DIR" || exit 1
touch "$LOG"
# Log é histórico de conveniência, não auditoria: acima de 1 MB começa de novo.
if [[ $(stat -c %s "$LOG" 2>/dev/null || echo 0) -gt $LOG_MAX_BYTES ]]; then
  : >"$LOG"
fi

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >>"$LOG"; }

notify() {
  command -v notify-send >/dev/null 2>&1 && notify-send -a study-loop "$1" "${2:-}"
  return 0
}

die() {
  log "ERRO: $1"
  notify "study-loop falhou" "$1 — veja $LOG"
  printf 'study-loop: %s (log: %s)\n' "$1" "$LOG" >&2
  exit 1
}

server_up() { curl -fs -o /dev/null --max-time 2 "$URL" 2>/dev/null; }

server_pid() {
  [[ -f $PID_FILE ]] || return 1
  local pid
  pid=$(cat "$PID_FILE" 2>/dev/null) || return 1
  [[ -n $pid ]] && kill -0 "$pid" 2>/dev/null && printf '%s' "$pid"
}

stop_server() {
  local pid
  if pid=$(server_pid); then
    # O servidor roda em sessão própria (setsid), então derrubar o grupo pega o
    # npm e o next de uma vez — matar só o npm deixaria o next órfão na porta.
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.25
    done
    kill -0 "$pid" 2>/dev/null && kill -KILL -- "-$pid" 2>/dev/null
    rm -f "$PID_FILE"
    log "servidor encerrado (pid $pid)"
    notify "study-loop" "servidor encerrado"
  elif server_up; then
    rm -f "$PID_FILE"
    die "a porta $PORT está ocupada por um processo que este lançador não controla"
  else
    notify "study-loop" "não havia servidor rodando"
  fi
}

needs_build() {
  [[ -f .next/BUILD_ID ]] || return 0
  local watched=(src package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs)
  local existing=()
  local path
  for path in "${watched[@]}"; do
    [[ -e $path ]] && existing+=("$path")
  done
  [[ ${#existing[@]} -gt 0 ]] || return 1
  local changed
  changed=$(find "${existing[@]}" -newer .next/BUILD_ID -print -quit 2>/dev/null)
  [[ -n $changed ]]
}

start_server() {
  command -v npm >/dev/null 2>&1 || die "npm não encontrado no PATH"

  if [[ ${FORCE_REBUILD:-0} == 1 ]] || needs_build; then
    log "build: código mudou desde o último build"
    notify "study-loop" "compilando o app…"
    npm run build >>"$LOG" 2>&1 || die "o build falhou"
  fi

  log "subindo next start na porta $PORT"
  # Loopback só: o app é de uso local e expõe /api/shutdown, que não tem por que
  # ficar alcançável pela rede.
  setsid npm run start -- --port "$PORT" --hostname 127.0.0.1 >>"$LOG" 2>&1 &
  local pid=$!
  printf '%s\n' "$pid" >"$PID_FILE"

  local waited=0
  while ((waited < READY_TIMEOUT_S)); do
    server_up && return 0
    kill -0 "$pid" 2>/dev/null || die "o servidor morreu ao subir"
    sleep 1
    ((waited++))
  done
  die "o servidor não respondeu em ${READY_TIMEOUT_S}s"
}

case "${1:-}" in
--stop)
  stop_server
  exit 0
  ;;
--status)
  if server_up; then
    printf 'study-loop: no ar em %s (pid %s)\n' "$URL" "$(server_pid || echo 'externo')"
  else
    printf 'study-loop: parado\n'
  fi
  exit 0
  ;;
--log)
  exec xdg-open "$LOG"
  ;;
--rebuild)
  FORCE_REBUILD=1
  stop_server
  ;;
"") ;;
*)
  printf 'uso: %s [--stop|--status|--log|--rebuild]\n' "${0##*/}" >&2
  exit 2
  ;;
esac

if server_up; then
  log "servidor já no ar; apenas abrindo o navegador"
else
  start_server
fi

xdg-open "$URL" >>"$LOG" 2>&1 || die "não deu pra abrir o navegador em $URL"
