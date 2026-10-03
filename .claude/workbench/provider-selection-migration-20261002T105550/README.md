# provider-selection-migration

## El encargo

<!-- verbatim, sin parafrasear -->
> El selector no debe tener conocimiento especial de Claude. La regla debe ser:
> `eligible providers allowed by policy -> ordered policy selection -> selected provider or blocked`
> [...] The batch MUST be executable without claude-cli.
> — el ejecutor, 2026-10-02.
>
> todos los que selecionen un modelo se tiene que ejecutar como lo anterior, hasta claude
> — el ejecutor, 2026-10-02.

## La premisa, si se corrigio al primer comando

- La primera versión de esta sesión codificaba `local → API → claude-cli → blocked` como etapas fijas:
  claude-cli seguía siendo una etapa conocida por el selector. Se descartó sin commitear.
- Puntos de selección medidos fuera del camino genérico: `bin/agent-recommend` (`recommend.ts`,
  consumido por `headless-pool.sh` y `tsc_cycle.py`, que además exige el prefijo `claude-`), y
  `choose_candidate` de `task_continuation.py` sobre una lista fija por ítem del plan.
- No existía registro de proveedores: el destino Token Plan sólo vivía en los `delegate.sh` de los bancos.
- El primer intento de T001 salió 127 en 3.8 s: faltaba `probes/delegate.sh` en este banco.

## Las piezas

| archivo | que hace |
|---|---|
| `plan.jsonl` | los ítems del plan; T001 sobre candidatos no-Claude (Token Plan) |
| `tasks/T001.md` | fuentes de candidatos: catálogo local, de API y rankeado → `ProviderCandidate` |
| `tasks/T002.md` | registro de proveedores y la entrada única `select-provider` |
| `item-T001-prompt.md` | lo que recibe el trabajador de T001 |
| `verify/T001.sh` | aceptación de T001: pruebas, alcance y RED contra la base |
| `probes/delegate.sh`, `probes/unit_identity.sh` | copiados sin cambios de `mechanism-registry-20261002T061646` |

## Los resultados

Previos al plan, ya commiteados: `selectProvider` genérico (258ca8791), `qualifiedModels` sobre
cualquier candidato con nombre (9fb538ca7), catálogo de API de Model Studio (95b0729cf).

*Metrica:* ítems aceptados por su verify y puntos de selección migrados al camino genérico.
*Ciega a:* la calidad fuera de lo que cada verify prueba; la elegibilidad de un remoto con cualificaciones de pocos casos.
