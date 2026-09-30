#!/usr/bin/env bash
# Sonda: ¿qué procesos casa `pgrep -f "<ruta>/claude -p"` cuando el item corre
# envuelto por GNU Time y `timeout`, como en headless-pool? Un nvidia-smi real
# lista sólo el proceso con contexto de GPU; el falso tiene que casar lo mismo.
set -u
dir="$(mktemp -d -p "$(dirname "$0")")"
trap 'rm -rf "$dir"' EXIT
printf '#!/usr/bin/env bash\nsleep 2\n' > "$dir/claude"; chmod +x "$dir/claude"
timeout 5 /usr/bin/time -q -f '%M' -o /dev/null timeout 5 "$dir/claude" -p x &
sleep 0.5
echo "== sin ancla";       pgrep -af "$dir/claude -p"
echo "== con ancla ^bash"; pgrep -af "^bash $dir/claude -p"
wait
