# W1 — Qwen como workers de batch: BLOQUEADO antes de medir

1. `local-models-qualify` (0.5B y Coder 1.5B, suite `batch-worker-mecanica@1`, cualificaciones
   al archivo del banco): exit 2 en los dos, `el coordinador falló la admisión en prepare:
   ENOENT … open`. Causa: la caché de artefactos del coordinador
   (`.thyrox/models/artifacts/`) está vacía; el adaptador de Ollama sube el blob desde ahí.
2. El 0.5B tiene ubicación publicada (`artifact-locations.json`: docker.io
   th3rox/thyrox-quantization-lab-artifacts, por digest). `local-models-ensure` es la vía
   declarada para materializarlo: rehusó en 1.67 s porque `infrastructure_ensure` mide locks de
   Podman desfasados (asignados 0, referenciados 14) — precondiciones de H-THYROX-308.
3. NO se ejecutó `bin/podman_lock_recovery --confirm`. Su plan retira /run/libpod/alive para que
   Podman refresque la asignación; con thyrox-postgres, thyrox-ollama y thyrox-redis `Up` según
   `podman ps`, un refresh puede dar por detenidos contenedores vivos (riesgo de pérdida de
   datos). Además el diagnóstico dice «vivos: ninguno» y `podman ps` dice tres: desacuerdo de
   instrumentos sin resolver (TASK de #99, medir la recuperación de locks).
4. El Coder 1.5B no tiene ubicación publicada: su única copia está en
   `/home/user/.thyrox-lab/quantize-scratch/model-Q4_K_M.gguf` (986 048 672 B, el tamaño del
   catálogo). No es reclamable hasta publicarlo.
5. `/home/user/.thyrox-lab/import-scratch/qwen2.5-coder-7b-instruct-q4_k_m.gguf`
   (4 683 073 536 B = tamaño del catálogo; declarado desde HF con revisión y sha256 exactos) es
   candidato «owned + reproducible + reclaimable»: liberaría el pico que U1b necesita. Falta
   verificar su sha256 contra el catálogo y declarar su dueño antes de reclamarlo.
