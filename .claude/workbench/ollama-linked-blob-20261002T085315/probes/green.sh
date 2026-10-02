#!/usr/bin/env bash
# Verde de TASK-THYROX-0782: aplica la implementación y corre las suites tocadas y los paquetes.
set -u
B=/home/user/thyrox/.claude/workbench/ollama-linked-blob-20261002T085315
P=/home/user/thyrox/src/packages
cp "$B/probes/src/ollamaModelsDirectory.ts" "$P/local-models/ollamaModelsDirectory.ts"
python3 "$B/probes/impl.py" || exit 1
run() { (cd "$P/$1" && bun test $2 > "$B/outputs/green-$3.txt" 2>&1); echo "$3: $(grep -E '^ *[0-9]+ (pass|fail)' "$B/outputs/green-$3.txt" | tr '\n' ' ') $(grep -E '^\(fail\)' "$B/outputs/green-$3.txt" | cut -c1-90 | sort -u | tr '\n' '|')"; }
run local-models __tests__/modelArtifactCache.test.ts cache
run local-models __tests__/ollamaModelsDirectory.test.ts models-directory
run local-models __tests__/commands.test.ts commands
run model-scheduling __tests__/podmanModelUnitMaterializer.test.ts materializer
run local-models "" local-models
run model-scheduling "" model-scheduling
cd /home/user/thyrox && bash bin/check_package_typecheck --no-rebuild local-models model-scheduling > "$B/outputs/typecheck.txt" 2>&1; echo "typecheck exit=$? $(grep -E '^  (local-models|model-scheduling):' "$B/outputs/typecheck.txt" | tr '\n' ' ')"
