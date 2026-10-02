W=.claude/workbench/executor-qwen-20261002
uv run --locked pytest -q -rf tests/test_translation_loop.py > $W/outputs/green-final.txt 2>&1
grep -E "^FAILED" $W/outputs/green-final.txt | gawk '{print $2}' | sort > /tmp/after
grep -E "^FAILED" $W/outputs/baseline-unit.txt | gawk '{print $2}' | sort > /tmp/before
echo "línea base $(wc -l < /tmp/before) · final $(wc -l < /tmp/after) · sólo en el final: $(comm -13 /tmp/before /tmp/after | wc -l)"
python3 /scratch/annul-sh.py $W/outputs 'uv run --locked pytest -q tests/test_translation_loop.py -k "consumer_policy or readable_policy" 2>&1 | sed "s/^FAILED/  FALLA/"'   "loop-execution-unit=tools/scripts/translation_loop.py::           \"--execution\", \"unit\", \"--work-reference\"::           \"--work-reference\""   "loop-policy-readable=tools/scripts/translation_loop.py::    if not Path(args.model_policy).is_file():::    if False:"
cat > $W/README.md <<'MD'
# El traductor es-MX pasa al ejecutor de THYROX con Qwen (trabajo del consumidor)

Identidad: `ai-course-notes:es-mx/executor-qwen` (referencia de trabajo del
consumidor, TASK-THYROX-0756); no es una TASK de THYROX. Sólo cambia el punto
de ejecución de `ES_MX_TRANSLATION_PLAN.md`; glosario, memoria, prompt,
marcadores, V0–V7, triage, sweep, retranslate y measure no se tocan.

- `translate`/`advance`/`cycle` y `translate_wave.sh` dejan de aceptar
  `--model`. `translate` pide a `headless-pool`: `--execution unit`,
  `--work-reference ai-course-notes:es-mx/<lote>/translate/<sello>`,
  `--model-policy tools/lang/es-mx/model-policy.json` y `--task-class analisis`.
- `tools/lang/es-mx/model-policy.json`: sólo `Qwen/Qwen2.5-7B-Instruct-GGUF`
  Q4_K_M, `fallback.enabled: false`. Sin la política, `translate` sale 2.
- Plan §3 (fila Agente), §6 (orden de la ola) y §11.1 (modelo): actualizados.

Medición en ExecutionUnit: la imagen de ejecución no trae `hunspell` ni
`xelatex`, así que 29 pruebas del ciclo fallan igual antes y después
(`outputs/baseline-unit.txt`, `outputs/green-final.txt`; la comparación de
conjuntos está en la salida del commit). Las nuevas y la de la ola: verdes.

| Anulación | Cae |
|---|---|
| `--execution unit` | «asks the pool for units under the consumer policy» |
| política legible obligatoria | «refuses without a readable policy» |

Mitad roja: `outputs/red.txt` (46 fallos: `--model` obligatorio).
MD
git add -N $W tools/lang/es-mx/model-policy.json
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com git commit -q -m 'Translate through thyrox units with the Qwen policy' -m 'Only the execution point of the es-MX plan changes. The loop no longer
names a model: each fragment runs as a thyrox -p in an execution unit
authorized by this project work reference, and the model comes from the
recommender within tools/lang/es-mx/model-policy.json, which allows only
the official Qwen 2.5 7B Q4_K_M and forbids the provider fallback.

Work reference: ai-course-notes:es-mx/executor-qwen.' --   tools/scripts/translation_loop.py tools/scripts/translate_wave.sh tests/test_translation_loop.py   tools/lang/es-mx/model-policy.json docs/ES_MX_TRANSLATION_PLAN.md $W
git log -1 --format='%h %an / %cn %s'
git push -q origin HEAD 2>&1 | tail -1; echo push=$?
git status --short | head -3
