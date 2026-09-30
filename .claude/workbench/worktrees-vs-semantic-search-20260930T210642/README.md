# ¿El contenido de `.claude/worktrees/` tiene que vivir en PostgreSQL + pgvector?

Pregunta del ejecutor, contestada dos veces: antes y después de integrar
`feature/complete-orm-root` en kaupamex-docs (merge 8044825b0, que trae
ADR-010 y la corrección de ADR-008).

## Respuesta: no

1. **ADR-010, P2** clasifica los worktrees como estado de ejecución que no
   viaja con el artefacto ni se incrusta: «Nunca: datos de PostgreSQL o
   Redis, imágenes de contenedor, estado de ejecución, **worktrees**, salidas
   de bancos» (`adr-010-empaquetado-instalacion-infraestructura-y-servicios.rst:401-405`).
2. **ADR-007** los trata como coste de disco efímero de un pool: «cada ítem de
   `headless-pool` con `--isolation worktree` ocupa entre 1.9 y 2.6 GB»
   (`adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst:337-338`).
3. **ADR-008** define PostgreSQL + pgvector como persistencia durable y
   compartida de **embeddings con su metadata**, no de archivos
   (`adr-008-...:199-206`; superficie `upsertEmbedding`/`getEmbedding`,
   `:141-144`). Lo que se guarda es el vector de un fragmento y el puntero a
   él; el texto sigue en Git.
4. **Qué se vectoriza no está decidido**: ADR-008 «Qué no decide» (`:254`)
   deja modelo, dimensiones y corpus en D5 ([203]); los consumidores
   previstos (D6/D7, [204]) son errores parecidos y buscar-hallazgos.

## Por qué los worktrees serían mala fuente aunque D5 lo quisiera

Los tres de `.claude/worktrees/` son checkouts del mismo repo sobre la base
`9dbaba5d` (su `.git` apunta a `thyrox/.git/worktrees/<id>`; 0 archivos
versionados bajo esa ruta, nunca). Vectorizarlos indexaría copias
desfasadas de archivos que ya están en `feature/thyrox-l6`. Si su trabajo
interesa, la fuente es lo versionado: las ramas `archive/worktree-agent-*`
publicadas (72b4b12f, 575ff17c, 483d401b).

*Métrica:* texto de ADR-007, ADR-008 y ADR-010 en `feature/kaupamex-l11`
tras 8044825b0; `git ls-files` y `git log --all` sobre `.claude/worktrees`.
*Ciega a:* una decisión de D5 que aún no existe y que podría añadir
fuentes; lo que se afirma es lo que los ADR vigentes dicen hoy.
