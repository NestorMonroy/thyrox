#!/usr/bin/env bash
# Censo de los comandos de bin/ que llaman a un modelo: resuelve el guion
# destino de cada envoltorio y busca en él las marcas de uso de un modelo.
# Métrica: marcas literales en el guion destino (no en lo que importa).
set -u
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
marks='--task-class|headless-pool|bin/cli|thyrox -p|agent-recommend|recommend\(|/v1/messages|/v1/chat/completions|/api/embed|embedding|--model[ =]|MODEL'
printf 'comando\tdestino\tmarcas\n'
for wrapper in bin/*; do
  target=$(grep -oE '\$THYROX_ROOT/[^" ]+' "$wrapper" | tail -1 | sed 's#\$THYROX_ROOT/##')
  [ -n "$target" ] && [ -f "$target" ] || continue
  hits=$(grep -oE -- "$marks" "$target" 2>/dev/null | sort | uniq -c | gawk '{printf "%s×%s ", $2, $1}')
  [ -n "$hits" ] && printf '%s\t%s\t%s\n' "$(basename "$wrapper")" "$target" "$hits"
done
