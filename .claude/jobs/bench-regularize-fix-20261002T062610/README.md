# bench-regularize-fix

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0762 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; B=.claude/workbench/bench-convention-20261002T062507
git checkout -- .claude/jobs/ && sed -i "s#\"grep\", \"-l\", \"-F\", old, \"--\", \".claude/\"#\"grep\", \"-l\", \"-F\", old, \"--\", str(WORKBENCH)#" $B/probes/regularize_benches.py && grep -n "str(WORKBENCH))" $B/probes/regularize_benches.py && python3 -m py_compile $B/probes/regularize_benches.py && rm -rf $B/probes/__pycache__
cat > $B/README.md <<"EOF"
# bench-convention

## El encargo

<!-- verbatim, sin parafrasear -->

> porque no lo organizaste como se tiene en  /home/user/thyrox/.claude/workbench/?

## La premisa, si se corrigio al primer comando

Los bancos de esta sesión se crearon a mano con `mkdir` y un sufijo de sólo
fecha (`-20261002`), sin `bin/manifest scaffold`: sin la hora en el nombre, sin
`manifest.jsonl` ni declaración, y sin las secciones de la plantilla. Medido en
el árbol: 623 de 639 bancos llevan `<slug>-YYYYMMDDTHHMMSS`; 99 traen la
declaración de las cinco claves.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/regularize_benches.py` | renombra con `run_id_for` y el instante del primer commit de cada banco, crea `outputs/` y `probes/`, reestructura el README con la plantilla, escribe la declaración y reescribe las referencias dentro de `.claude/workbench/` |
| `probes/plan.json` | la declaración de cada banco (pregunta, instrumento, métrica, ceguera) y su premisa |
| `probes/encargos.json` | el encargo de cada banco, extraído verbatim del transcript de la sesión |

## Los resultados

Diez bancos de thyrox y dos de ai-course-notes quedan con nombre de run,
manifiesto declarado y README con la plantilla. El sello de cada nombre es el
del commit que creó el banco, no el de hoy: conserva la cronología.

La primera pasada reescribió también las referencias en `.claude/jobs/`. Se
revirtió: un registro de job documenta el comando que se ejecutó, con la ruta
que tenía entonces, y reescribirlo falsearía ese registro. El guion quedó
acotado a `.claude/workbench/`.

Este guion, el plan y los encargos se escribieron primero en el scratchpad de
la sesión y la unidad los copió aquí; las copias del scratchpad se borraron.

*Metrica:* bancos con nombre `<slug>-<ISO básico>`, con la declaración de cinco claves y con las cuatro secciones de la plantilla.
*Ciega a:* si el contenido de cada README es correcto: el guion lo reubica, no lo verifica.
EOF
printf "%s\n" "{\"kind\": \"declaration\", \"question\": \"¿Siguen los bancos de esta sesión la convención de bin/manifest scaffold?\", \"instrument\": \"run_id_for, el instante del primer commit, la plantilla de scaffold_workbench y REQUIRED_KEYS\", \"metric\": \"bancos con nombre de run, declaración de cinco claves y secciones de la plantilla\", \"blind_to\": \"la corrección del contenido de cada README, que sólo se reubica\", \"destination\": \"$B/outputs\"}" > $B/manifest.jsonl
git status --short .claude/jobs | head
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
