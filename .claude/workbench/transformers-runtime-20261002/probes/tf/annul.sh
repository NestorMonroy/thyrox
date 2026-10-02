W=.claude/workbench/transformers-runtime-20261002/outputs
annul() { name=$1 file=$2 expr=$3 cmd=$4; cp $file /tmp/keep; sed -i "$expr" $file
  if cmp -s $file /tmp/keep; then echo "== $name: ANCLA NO ENCONTRADA"; return; fi
  bash -c "$cmd" > $W/annul-$name.txt 2>&1; cp /tmp/keep $file
  echo "== $name"; grep -E "^\(fail\)|FAIL:|^ERROR:|Unhandled" $W/annul-$name.txt | sort -u | cut -c1-130; }
MS=src/packages/model-scheduling; LM=src/packages/local-models
annul artifact-mount $MS/podmanModelUnitMaterializer.ts 's/    mounts: artifactMounts(spec),/    mounts: [],/' "cd $MS && bun test __tests__/podmanModelUnitMaterializer.test.ts"
annul runtime-by-format $LM/hostCoordinatorComposition.ts "s/  safetensors: 'transformers',/  safetensors: 'ollama',/" "cd $LM && bun test __tests__/hostCoordinatorComposition.test.ts"
annul known-runtime $MS/podmanModelUnitMaterializer.ts "s/= \['ollama', 'llama.cpp', 'transformers'\]/= ['ollama', 'llama.cpp']/" "cd $MS && bun test __tests__/podmanModelUnitMaterializer.test.ts"
annul server-digest-check $LM/transformers-runtime/transformers_runtime_server.py 's/        if observed != artifact_id:/        if False:/' "python3 tests/local_models/test_transformers_runtime_server.py"
annul server-needs-residency $LM/transformers-runtime/transformers_runtime_server.py 's/            if self._backend is None or self._identity is None:/            if False:/' "python3 tests/local_models/test_transformers_runtime_server.py"
annul adapter-generation $LM/runtimeMutation.ts 's/  if (current !== binding.generation) return/  if (false) return/' "cd $LM && bun test __tests__/transformersRuntimeAdapter.test.ts"
annul adapter-prepare-match $LM/transformersRuntimeAdapter.ts 's/      if (!verification.matches) {/      if (false) {/' "cd $LM && bun test __tests__/transformersRuntimeAdapter.test.ts"
annul router-no-fallback $MS/runtimeAdapterRouter.ts 's/    const adapter = this.adapters\[grant.runtime\]$/    const adapter = this.adapters[grant.runtime] ?? Object.values(this.adapters)[0]/' "cd $MS && bun test __tests__/runtimeAdapterRouter.test.ts"
git status --short | grep -v "^??" | head
