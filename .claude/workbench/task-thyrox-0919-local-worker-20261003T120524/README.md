# task-thyrox-0919-local-worker

## El encargo

<!-- verbatim, sin parafrasear -->
> En cuanto A6 pase, empieza inmediatamente la autoimplementación [...] Selecciona automáticamente una TASK
> real pequeña y compatible con task:mecanica, qwen3-4b, context <= qualification aprobada. [...]
> Prioridad sugerida: 1. mecanismos necesarios para Search Existing permanente [...] El controlador NO
> implementa el código de producto una vez que Qwen pueda hacerlo.
> — el ejecutor, 2026-10-03.

## La premisa, si se corrigio al primer comando

- TASK-THYROX-0769 (registro de mecanismos) es real y pendiente, pero T001 entero —registro, consulta,
  verificador de deriva y gate— excede a un modelo de 4B. Se acota a su consulta:
  `src/verify/search_existing_mechanisms.py` (reglas 1–4, FOUND/RELATED/NONE). Cita propia: TASK-THYROX-0919.
- `headless-pool` rehusaba `--execution unit` con `--isolation worktree`: EXTEND en `bb88cf8a4`.
- Independiente de la cualificación (`batch-worker-mecanica@1`): ningún caso de esa suite es esta tarea.

## Las piezas

| archivo | que hace |
|---|---|
| `tests/verify/test_search_existing_mechanisms.py` | la mitad RED, escrita por el controlador: el contrato del verifier (6 de 8 caen sin implementación; las 2 que pasan se anulan contra la implementación) |
| `prompt.md` | lo que recibe el worker: Search Existing obligatorio con su bloque, contrato, prueba |
| `outputs/` | salida del pool por ítem (`<n>.patch`, `<n>.files`, `<n>.verdict`) e integración |

## Los resultados

*Metrica:* veredicto del verifier por ítem, aserciones de la prueba, modelo y contexto del grant.
*Ciega a:* calidad del código más allá de la prueba.
