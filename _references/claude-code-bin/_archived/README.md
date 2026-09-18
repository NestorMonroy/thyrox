# Corpus de builds archivado

Las versiones que `list_corpus_builds` ya no lista viven aqui como un `.7z`
solido por version. **Los `.7z` NO estan versionados** — `.gitignore` lleva un
`*.7z` global, y eso es deliberado: archivar no debe anadir peso al historial.

Son una copia de CONVENIENCIA, tan durable como el contenedor. La copia durable
es el historial de git.

## Como se recupera una build archivada

La columna `head` de `MANIFEST.tsv` es la clave: el archivado corre ANTES del
commit que retira el crudo, asi que ese arbol todavia lo contiene.

```bash
HEAD_ARCHIVADO=$(awk 'NR==2 {print $6}' MANIFEST.tsv)
git ls-tree -r --name-only "$HEAD_ARCHIVADO" -- _references/claude-code-bin/<version>/
git show "$HEAD_ARCHIVADO:_references/claude-code-bin/<version>/claude_strings.txt" > /tmp/salida
```

Y si el `.7z` sigue en disco, sale mas barato:

```bash
7z t _references/claude-code-bin/_archived/<version>.7z    # integridad primero
7z x _references/claude-code-bin/_archived/<version>.7z -o_references/claude-code-bin/
```

Las dos vias dan el mismo arbol. El `sha256` del manifiesto es del `.7z`, no del
crudo: verifica el archivo, no lo que contiene.

## Lo que este README NO resuelve

Si un consumidor del arbol cita la ruta cruda de una build archivada, esa cita
no resuelve. Es un rojo real y tiene su tarea: **TASK-THYROX-0163**.

Generado por `src/corpus/archive_build_corpus.py` — no se edita a mano.
