# `fechar-documentos` no fecha un documento creado dentro de un merge (H-THYROX-271)

Trabajas en un worktree de thyrox. Identificadores en inglés; comentarios en
español. No toques `.claude/`.

## El defecto (medido)

`_last_commit_dates` (`src/agents/agent_store.py`) corre
`git log --format=@%cI --name-only -z -- <subtree>`. Sin opción de diff para
merges, git **no lista archivos en los commits de merge**. Un archivo cuyo
único commit es un merge (creado al resolver el merge) nunca aparece y queda
sin fecha. Caso real: `hallazgo-H-DOCS-492-…` en kaupamex-docs, cuyo único
commit es `d604e08b9` (merge); `git log -1 -- <ruta>` sí da
`2026-08-28T07:37:48+00:00`.

Con `--cc` git lista, en cada merge, sólo los archivos que difieren de TODOS
los padres: recupera ese caso sin re-fechar los archivos que un merge
simplemente trajo. Medido sobre `source/`: 34307 líneas sin `--cc`, 34340 con
`--cc` (33 más), y el archivo aparece.

## Qué hacer (TDD)

1. Prueba roja primero en `tests/agents/test-agent-store-fecha-documento.sh`
   (mira su forma y el caso 16 de ruta no ASCII): repo temporal con dos
   ramas; el merge crea un archivo nuevo que ninguno de los padres tiene
   (merge con `--no-commit`, añadir el archivo, commit). La aserción: ese
   archivo recibe la fecha del merge. Añade también un control: un archivo
   creado en la rama y traído por el merge SIN cambios conserva la fecha de su
   commit en la rama, no la del merge.
2. Arreglo: añade `--cc` a la invocación. Documenta en el docstring por qué
   `--cc` y no `-m`/`--first-parent` (que re-fecharían todo lo que un merge
   trae).
3. Anulación: retira `--cc`; debe caer exactamente la aserción del archivo
   creado en el merge, y el control seguir verde. Restaura.
4. Corre la suite entera de ese archivo y reporta rojo, anulación y verde.
