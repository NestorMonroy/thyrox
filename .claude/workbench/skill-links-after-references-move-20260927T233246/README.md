# Enlaces de las skills tras la mudanza a `_references/`

La mudanza de `.claude/references/` a `_references/` dejó rotos los enlaces de
las skills que apuntaban a `../../references/…`, y ningún gate lo veía: los dos
de `.md` que había (`detect-missing-md-links.sh`, `validate-missing-md-links.sh`)
miden una mención en código que debería ser enlace, no un enlace que no
resuelve.

## Qué queda

- `src/verify/check_md_relative_links.py` y su suite
  `tests/verify/test_check_md_relative_links.py`, cableado en
  `.githooks/pre-commit` sobre `.claude/skills` y `.claude/rules`.
- Medido al abrir: **63** enlaces rotos en 277 archivos. Tres clases:
  1. `references/X.md` → `_references/X.md` (44): todos los destinos existen.
  2. plantillas del consumidor (`source/normativa/estandares/plantillas/…`,
     15): viven en el árbol del consumidor, no en thyrox; pasan a tramo de
     código con «(del consumidor)», sin fabricarles una ruta aquí.
  3. nombres destrozados por una sustitución global anterior
     (`categorization-plan.md` → `categorization-source/normativa/…`): se
     restauran desde `_archived/` y se apuntan a la plantilla que existe
     (`assets/legacy/analysis-phase.md.template`,
     `workflow-implement/assets/execution-log.md.template`). La misma
     sustitución dejó tres nombres en texto, no en enlace, que el gate no ve;
     se corrigieron con `git grep "[a-z]-source/normativa"`.
- Al cerrar: 0 rotos, 417 enlaces relativos en 277 archivos; `.claude/rules`
  no lleva ninguno.

## Controles de anulación

`probes/annul-links.tsv`, salida en `outputs/annul-links.out`: las 7 variantes
caen (código en bloque, tramo de código, esquema, ancla sola, marcador,
fragmento y el rehúse con exit 2).

*Métrica:* destinos `](ruta)` relativos de los `.md`, resueltos contra el
directorio del archivo.
*Ciega a:* enlaces de referencia (`[x][id]`), a si el fragmento nombra una
sección que exista, y a un nombre destrozado fuera de un enlace.
