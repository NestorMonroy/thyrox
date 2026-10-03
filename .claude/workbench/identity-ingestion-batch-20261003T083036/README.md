# Identidad kaupamex-ai en la ingesta, implementada por el batch local

Tarea: TASK-THYROX-0918 (estampar la identidad del proyecto al ingerir).
Análisis y decisión de identidad: `identity-migration-analysis-20261003T072106/`
(secciones 9 y 10) y H-THYROX-443.

## Por qué existe este banco

El controlador no implementa producto. La implementación la hace el worker
local por la cuarta forma de `trabajo-en-segundo-plano.md`:

```bash
bash bin/thyrox-bg start identity-batch-1 --stdin <banco>/inputs/items-batch-1.txt -- \
    bin/headless-pool --prompt <banco>/inputs/item-prompt.md \
    --out <banco>/outputs/batch-1 --task-class mecanica --context-tokens 16000 \
    --isolation worktree --verify 'bash <banco>/verify/I1.sh'
bash bin/pool_integrate <banco>/outputs/batch-1
```

## Search Existing

| Capacidad | Autoridad | Decisión |
|---|---|---|
| implementar N ítems con juicio y aislamiento | `bin/headless-pool --isolation worktree` + `bin/pool_integrate` | REUSE |
| continuar un plan con dependencias | `task_continuation` (`plan.jsonl`, `dependsOn`) | descartado: su `delegate.sh` delega al API Token Plan, denegado para workers |
| elegir modelo | `bin/agent-recommend mecanica --context 16000` → qwen3-4b (`batch-worker-mecanica@1`) | REUSE |
| lanzar y recoger | `bin/thyrox-bg`, `bin/wait-jobs` | REUSE |
| identidad del proyecto en metadata | ninguna autoridad previa (sección 10 del banco de análisis) | MISSING → paquete `project-identity` |

## Ítems y dependencias

| Lote | Ítem | Archivos | Depende de |
|---|---|---|---|
| 1 | I1: paquete `src/packages/project-identity` + `projectIdentity.ts` contra `inputs/contract/projectIdentity.test.ts` | sólo el paquete nuevo | — |
| 2 | I2: `projectIdentityStamp.ts` en `semantic-search`, cableado en `ingestDocument`, refresco de metadata en `keepVersion`, parche de `corpus.postgres.test.ts` | `semantic-search/**`, `bun.lock` | I1 integrado |

El lote 2 se escribe cuando el 1 esté integrado: un worktree nace de `HEAD`.

## Entradas

- `inputs/contract/`: pruebas de contrato. El worker las copia y no las edita.
  Su capacidad de discriminar está medida (anulaciones exactas, sección 10).
- `inputs/item-prompt.md`: reglas del ítem — identificadores en inglés,
  comentarios en español técnico sin historia, TDD, Search Existing primero,
  sólo Bash, sin red, sin commit.
- `verify/I1.sh`: el `--verify` del lote 1.

## Borrador del controlador

`outputs/controller-draft-*` es lo que el controlador escribió antes de la
directiva de ir por batch. Se conserva como evidencia y como referencia de
comparación del resultado del worker; **no** se aplica al árbol.

## Estado

Bloqueado por la reparación de Podman (locks 0/21, `infrastructure_ensure`
exit 3, H-THYROX-442): Ollama no arranca, así que el worker no puede correr.
La reparación (`bin/podman_lock_recovery --confirm`) la autoriza el operador.
