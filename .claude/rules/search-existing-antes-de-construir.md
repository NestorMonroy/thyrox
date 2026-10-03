# Ningún probe, script ni mecanismo nuevo antes de cerrar Search Existing

Antes de escribir un probe, un script, un módulo o un mecanismo, se responde
qué autoridad de thyrox **ya** posee esa responsabilidad, y se termina en una
decisión explícita:

| Decisión | Exige |
|---|---|
| `REUSE` | la autoridad, su API y la prueba de que cubre el caso |
| `EXTEND` | la prueba de que la autoridad **posee** la responsabilidad (su cabecera, sus consumidores, sus pruebas) y qué le falta |
| `MISSING` | raíz, superficies recorridas, consultas, candidatos y por qué se descartó cada uno |
| `SEARCH_INCOMPLETE` | qué falta recorrer; mientras dure, no hay mecanismo nuevo ni acción destructiva |

La búsqueda es **desde la raíz y por comportamiento**, no por el primer nombre
que aparece: sinónimos del verbo (`retire`, `prune`, `sweep`, `orphan`,
`stale`, `cleanup`, `gc`, `lifecycle`, …), en `src/`, `bin/`, `tests/`,
`.githooks/`, `.claude/rules/`, los hallazgos y tareas del store
(`bin/agent_store buscar-hallazgos|buscar-tareas`) y los ADR de gobierno. Cada
candidato registra autoridad, comportamiento, consumidores, pruebas y el
motivo de reutilizarlo o descartarlo. El registro vive en el banco.

## La única excepción

Una medición exploratoria puede adelantarse a la búsqueda si se declara así en
su cabecera:

```
EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
```

Su resultado no autoriza borrar, publicar ni implementar.

## Por qué es regla y no recomendación

El mismo defecto se repitió en una sola sesión (2026-10-03) en el censo de
imágenes, la observación de Podman, el ciclo de vida de imágenes, la
construcción declarada, la preservación OCI y la retirada de worktrees: se
escribía un probe, se medía, y después aparecía una autoridad existente. En el
último, la primera medición declaró preservado un árbol huérfano y una
búsqueda posterior encontró dos archivos únicos fuera del subdirectorio
medido; la búsqueda completa mostró además que `task_continuation` había
duplicado el ciclo de `item_worktree.sh` (H-THYROX-437,
`.claude/workbench/worktree-retirement-search-existing-20261003T031634/`).

## El gate

Todavía no existe. Su diseño es TASK-THYROX-0769
(`.claude/workbench/mechanism-registry-20261002T061646/`): el registro
`src/verify/mechanisms.tsv` con `bin/search_existing_mechanisms` (T001) y
`bin/check_mechanism_search_evidence`, que exige a cada banco la tabla de su
búsqueda (T002). Su delegación terminó en `hard_block`; hasta que se integre,
esta regla es prosa y la disciplina es de quien la lee.
