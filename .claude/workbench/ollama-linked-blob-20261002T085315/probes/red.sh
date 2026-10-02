#!/usr/bin/env bash
# Rojo de TASK-THYROX-0782: añade las pruebas a sus archivos y las corre.
set -u
B=/home/user/thyrox/.claude/workbench/ollama-linked-blob-20261002T085315
P=/home/user/thyrox/src/packages
cat "$B/probes/cache.test.ts" >> "$P/local-models/__tests__/modelArtifactCache.test.ts"
cat "$B/probes/adopt-command.test.ts" >> "$P/local-models/__tests__/commands.test.ts"
cp "$B/probes/models-directory.test.ts" "$P/local-models/__tests__/ollamaModelsDirectory.test.ts"
cat "$B/probes/materializer.test.ts" >> "$P/model-scheduling/__tests__/podmanModelUnitMaterializer.test.ts"
python3 - <<'PY'
from pathlib import Path
P = Path("/home/user/thyrox/src/packages")
def sub(rel, old, new):
    p = P / rel; t = p.read_text(); assert t.count(old) == 1, (rel, old); p.write_text(t.replace(old, new, 1))
sub("local-models/__tests__/modelArtifactCache.test.ts",
    "import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'",
    "import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'")
sub("local-models/__tests__/modelArtifactCache.test.ts",
    "import { cachedArtifactPath, materializeArtifact, type ArtifactFetcher } from '../modelArtifactCache.js'",
    "import { adoptLocalArtifact, cachedArtifactPath, materializeArtifact, type ArtifactFetcher } from '../modelArtifactCache.js'")
sub("local-models/__tests__/commands.test.ts",
    "import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'",
    "import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'")
sub("model-scheduling/__tests__/podmanModelUnitMaterializer.test.ts",
    "import { MODEL_UNIT_CONTAINER_PREFIX, MODEL_UNIT_LABELS, modelUnitId, PodmanModelUnitMaterializer } from '../podmanModelUnitMaterializer.ts'",
    "import { MODEL_UNIT_CONTAINER_PREFIX, MODEL_UNIT_LABELS, modelUnitId, PodmanModelUnitMaterializer, type ArtifactMount } from '../podmanModelUnitMaterializer.ts'")
PY
run() { (cd "$P/$1" && bun test "$2" > "$B/outputs/red-$(basename "$2" .test.ts).txt" 2>&1); echo "$2: $(grep -cE '^\(fail\)' "$B/outputs/red-$(basename "$2" .test.ts).txt") fail · $(grep -E '^ *[0-9]+ (pass|fail)|^error:' "$B/outputs/red-$(basename "$2" .test.ts).txt" | head -3 | tr '\n' ' ')"; }
run local-models __tests__/modelArtifactCache.test.ts
run local-models __tests__/commands.test.ts
run local-models __tests__/ollamaModelsDirectory.test.ts
run model-scheduling __tests__/podmanModelUnitMaterializer.test.ts
