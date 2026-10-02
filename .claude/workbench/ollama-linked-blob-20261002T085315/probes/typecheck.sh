#!/usr/bin/env bash
# Regenera las declaraciones de model-scheduling y local-models con el emisor del árbol y tipa local-models.
set -u
B=/home/user/thyrox/.claude/workbench/ollama-linked-blob-20261002T085315
cd /home/user/thyrox
for package in model-scheduling local-models; do
  uv run --quiet python -c "import sys; sys.path.insert(0, 'src'); from typescript.emit_declarations import emit_package; r = emit_package('src/packages/$package'); print('$package', getattr(r, 'status', r))" 2>&1 | tail -1
done
cd src/packages/local-models
for config in tsconfig.build.json tsconfig.test.json; do
  bunx tsc --noEmit -p "$config" > "$B/outputs/tsc-${config%.json}.txt" 2>&1
  echo "$config: $(grep -c 'error TS' "$B/outputs/tsc-${config%.json}.txt") errores"
  grep 'error TS' "$B/outputs/tsc-${config%.json}.txt" | cut -c1-170
done
git -C /home/user/thyrox status --short src/packages | grep -v '^ M\|^??' | head
