# Siguiente grupo del Pool lifecycle

## Qué se lanza

Cuatro ítems de implementación, disjuntos por archivo y sin decisión pendiente
del ejecutor, con `headless-pool --isolation worktree` (`launch.sh`):

| # | Tarea | Archivos |
|---|---|---|
| 1 | TASK-THYROX-0621 — tomar la propiedad al recuperar (0601c) | `src/session/recovery_controller.py`, `tests/session/test_snapshot_recovery.py` |
| 2 | TASK-THYROX-0625 — `finding index` rellena las columnas declaradas | `src/packages/finding/{index.ts,bin/finding.ts,__tests__/finding.test.ts}` |
| 3 | TASK-THYROX-0563 — `fechar-documentos` rehúsa en clon superficial | `src/agents/agent_store.py`, `tests/agents/test-agent-store-fecha-documento.sh` |
| 4 | TASK-THYROX-0271 R5c — refresh de tokens del proxy con lease compartido | `src/packages/provider/src/proxy/{startServer.ts,connectionRefresh.ts}`, su prueba |

## Por qué estas y no otras

- **Fuera por decisión pendiente:** TASK-THYROX-0630 (evento de cierre limpio),
  TASK-THYROX-0627 (D4-B, discovery).
- **Fuera por escribir en kaupamex-docs:** TASK-THYROX-0628 (relleno de los 78),
  R5d (ADR-THYROX-006). El pool trabaja en worktrees de thyrox.
- **Fuera por solaparse con un ítem del grupo:** TASK-THYROX-0622 (snapshots
  periódicos) toca el mismo ciclo de vida que 0621 y lo presupone; va en el
  grupo siguiente.
- **Fuera por tocar el propio pool:** TASK-THYROX-0549 (el verify escribe en la
  caché del árbol principal) modifica `headless-pool`, que es el instrumento con
  el que corre este grupo.

## Lo que corrige respecto del pool D4-A

El `--verify` anterior pasaba por `pytest` toda prueba Python tocada y rechazó
un ítem sano (`d4a-three-way-merge-*/README.md`, «Resultado»). Ahora
`probes/verify-item.sh` ejecuta cada prueba según su forma: Python como guion,
shell con bash, TypeScript con `bun test` desde su paquete. La plantilla lo
declara y prohíbe importar `pytest`.
