# Diagnóstico — hueco `usage_source IS NULL` en `agent_sessions`

Medido 2026-09-10T06:06:16Z sobre el store vivo compartido
(`agent-results/agent_store.sqlite3`, 1356 filas).

## Premisa del encargo, re-medida (no asumida)

```
usage_source = 'no_medido'   867
usage_source = 'transcript'  468
usage_source IS NULL          21   (19 completed/hook + 2 running)
```

La premisa original citaba 1352/867/468/17 — el store es compartido y vivo;
las cifras se movieron por escrituras concurrentes durante esta sesión. Ver
`outputs/antes-usage-source-null.txt` para la cita completa con su comando.

## Escritores de `usage_source` — localizados

- `src/agents/agent_store.py:_migrate_agent_sessions_usage_columns` (rellena
  hacia arriba: NULL → `'transcript'` SOLO si hay tokens; nunca escribe
  `'no_medido'` a propósito — no mira el filesystem).
- `src/agents/reconcile_store.py:_declarar_no_medido` (única escritora de
  `'no_medido'`; SÍ mira el filesystem vía `_transcripts()`).

## Diagnóstico de las 19 filas `completed`/`source='hook'` en NULL

Las tres condiciones de `_declarar_no_medido` (terminal · las 4 columnas de
uso en NULL · sin transcript en disco) se comprobaron una por una contra el
store vivo:

```
transcripts en disco (rglob /root/.claude/projects/**/subagents/agent-*.jsonl): 137
NULL completed en store: 19
SIN transcript en disco (candidatos a no_medido): 19
CON transcript en disco (todavía medibles): 0
```

Las 19 CUMPLEN las tres condiciones exactamente. Las 2 `running` restantes
(`a0bddf5aa3ee6b89d`, `aab42ba08f7848d25`) correctamente NO son candidatas —
`aab42ba08f7848d25` es el agente hermano en ejecución en esta misma sesión.

## Veredicto: NO hay bug en el camino de código

Revisado símbolo por símbolo (no de memoria):

- `_declarar_no_medido` (`reconcile_store.py:568-611`) — las tres condiciones
  SQL/set-membership son correctas y completas.
- `_transcripts` (`reconcile_store.py:506-518`) — usa `rglob` (no `glob`), así
  que barre el árbol completo de `/root/.claude/projects`, no un subconjunto.
- `main()` (`reconcile_store.py:933-1021`) — el orden es correcto: repara
  ANTES de declarar no_medido, declara no_medido ANTES de nivelar. `on_disk`
  se computa sin filtrar y se pasa completo a `_declarar_no_medido`.
- `store_db()` (`reconcile_store.py:98-113`) y `resolve_store_dir()`
  (`agent_store.py:400-431`) resuelven AMBOS por defecto vía
  `agents_paths.agent_store_path() → reach.agent_store_path()` — no hay
  divergencia de ruta entre el escritor de `'transcript'` y el de
  `'no_medido'` que explique que uno vea el store y el otro no.
- Cobertura de test YA existente para este escenario exacto:
  `tests/agents/test-agent-store-usage-source.sh` (caso 3: terminal + sin
  tokens + sin transcript → `no_medido`; caso 6: control de anulación —sin
  el discriminador el censo deja de separar los cubos) y
  `tests/agents/test_retention_backfill.py` (caso D: `usage_source` NULL NO
  se toca; control de anulación documentado en el docstring del módulo).

**Causa real:** operacional, no de código. Precedente idéntico ya en el
historial de este mismo repo — commit `5420f7e7` ("Reconcile the store from
disk"): *"El llenado de hoy es este barrido, no los hooks: bajo el harness
remoto los del repo están inertes (H-DOCS-1010)"*. Ninguna sesión con los
hooks `SessionStart`/`Stop` cableados (sólo `kaupamex-docs/.claude/settings.json`
los invoca) ha corrido recientemente contra el store unificado; esta propia
sesión de `thyrox` no tiene `settings.json` que dispare la cadena de
mantenimiento. El escritor está correcto y probado — lo que faltó fue
INVOCARLO.

## Acción tomada

`python3 src/agents/reconcile_store.py` (sin `--dry-run`) contra el store
vivo, seguido de `python3 src/agents/agent_store.py censo-medicion`. Salidas
en `outputs/despues-*.txt`. Sin cambio de código: el camino ya era correcto.
