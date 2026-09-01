#!/usr/bin/env bash
# Instala (ou remove) o atalho do study-loop no menu de aplicativos do desktop.
#
# O .desktop precisa de caminhos absolutos, então ele é gerado aqui a partir do
# local real do repositório em vez de ficar versionado com o caminho de uma
# máquina só.
#
#   install-desktop-entry.sh              instala/atualiza
#   install-desktop-entry.sh --uninstall  remove

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DESKTOP_FILE="$APP_DIR/study-loop.desktop"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/study-loop"
LAUNCHER="$PROJECT_DIR/scripts/study-loop.sh"
ICON="$PROJECT_DIR/scripts/study-loop.svg"

refresh_menu() {
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APP_DIR" || true
}

if [[ ${1:-} == "--uninstall" ]]; then
  rm -f "$DESKTOP_FILE"
  refresh_menu
  printf 'removido: %s\n' "$DESKTOP_FILE"
  exit 0
fi

[[ -f $LAUNCHER ]] || { printf 'lançador não encontrado: %s\n' "$LAUNCHER" >&2; exit 1; }
[[ -f $ICON ]] || { printf 'ícone não encontrado: %s\n' "$ICON" >&2; exit 1; }

chmod +x "$LAUNCHER"
mkdir -p "$APP_DIR" "$STATE_DIR"

cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=study-loop
GenericName=Sessão de estudo
Comment=Sobe o app e abre a sessão diária de perguntas
Exec="$LAUNCHER"
Icon=$ICON
Terminal=false
StartupNotify=true
Categories=Education;
Keywords=quiz;estudo;study;loop;perguntas;
Actions=stop;rebuild;log;

[Desktop Action stop]
Name=Parar servidor
Exec="$LAUNCHER" --stop

[Desktop Action rebuild]
Name=Recompilar e subir
Exec="$LAUNCHER" --rebuild

[Desktop Action log]
Name=Ver log
Exec="$LAUNCHER" --log
EOF

if command -v desktop-file-validate >/dev/null 2>&1; then
  desktop-file-validate "$DESKTOP_FILE"
fi
refresh_menu

printf 'instalado: %s\n' "$DESKTOP_FILE"
printf 'lançador:  %s\n' "$LAUNCHER"
printf '\nProcure por "study-loop" no menu de aplicativos. Para fixar na barra,\n'
printf 'clique com o botão direito no ícone e escolha "Adicionar aos favoritos".\n'
