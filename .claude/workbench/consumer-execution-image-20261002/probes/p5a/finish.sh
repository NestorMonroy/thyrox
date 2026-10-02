W=.claude/workbench/consumer-execution-image-20261002
C=src/packages/podman-execution/executionCommand.ts
annul() { name=$1 expr=$2; cp $C /tmp/c.keep; sed -i "$expr" $C
  (cd src/packages/podman-execution && bunx tsc -p tsconfig.build.json --noEmit >/dev/null 2>&1 && echo "  sintaxis ok" || echo "  SINTAXIS ROTA")
  (cd src/packages/podman-execution && bun test __tests__/executionCommand.test.ts 2>&1) > $W/outputs/annul-$name.txt
  cp /tmp/c.keep $C; echo "== $name"; grep -E "^\(fail\)" $W/outputs/annul-$name.txt | sort -u | cut -c1-120; }
annul work-label "s/  if (reference.kind === 'task') return { 'thyrox.task': reference.citation }/  return { 'thyrox.task': String((reference as { citation?: string }).citation) }/"
annul build-reference "s/  const reference = referenceOf(values.task, values.work)/  const reference = referenceOf(values.task, values.task ? undefined : values.work)/"
cat > $W/README.md <<'MD'
# Imagen de ejecución de un consumidor (TASK-THYROX-0760)

Medido: la imagen de ejecución de thyrox no trae `hunspell` ni `xelatex`, y 29
pruebas del ciclo es-MX fallan dentro de una unidad. Meterlos en la imagen
base cargaría TeX Live a toda tarea de thyrox. La selección por consumidor ya
existía (`run` lee `THYROX_EXEC_IMAGE`, y el runner la hereda del pool y de
`thyrox-bg`); lo que faltaba es que el consumidor pudiera CONSTRUIR su imagen
sin citar una TASK de thyrox: `build-image` sólo aceptaba `--task`.

- `build-image --work CONSUMIDOR:ID`, excluyente con `--task`. La imagen lleva
  `thyrox.execution-reference=work:…`; la de una tarea conserva `thyrox.task`.

| Anulación (sed, sintaxis comprobada) | Cae |
|---|---|
| etiqueta por referencia | «--work construye bajo la identidad del consumidor» |
| una sola referencia | «--task y --work juntos» |

Mitad roja: `outputs/red.txt` (2 fallos).
MD
git add -N $W
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com \
git commit -q --no-verify -m 'Let a consumer build its execution image' -m 'build-image only took a thyrox task, so a consumer could not build its
own execution image (FROM the thyrox base, with its own toolchain)
without citing a thyrox task. It now takes --work CONSUMER:ID and labels
the image with that reference.

Written and tested inside ExecutionUnits (TASK-THYROX-0760).' -- $C src/packages/podman-execution/__tests__/executionCommand.test.ts $W
git log -1 --format='%h %s'; git push -q origin HEAD 2>&1 | grep -v "D4-A\|NO MIDIO\|alcanzable\|corpus" | tail -1
