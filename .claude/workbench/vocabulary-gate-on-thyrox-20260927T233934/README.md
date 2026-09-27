# El gate de vocabulario de prosa, sobre el propio thyrox

`src/verify/check_vocabulario_prosa.py` medía la prosa de los consumidores y
nunca la del proveedor: corrido desde thyrox rehusaba con exit 2 porque no
había baseline aquí.

## Qué se midió

Corpus: los `.md` versionados de `.claude/rules`, `.claude/skills`,
`README.md` y `.claude/CLAUDE.md` (289 archivos, `outputs/measured-files.txt`),
contra un baseline vacío.

- `outputs/measure-before.log`: **57** hallazgos (24 inventados, 33 prohibidos).
- **7 eran del instrumento, no de la prosa.** El gate eximía sólo las citas de
  RST (` ``…`` ` y el bloque `::`), pero su corpus por defecto incluye
  `.claude/rules/**.md`, donde la cita es el bloque cercado y la comilla
  invertida simple. Las etiquetas de Mermaid (`Context\nMisión`) salían como
  «nmisión». Se añadió `markdown_spans`, sólo para `.md`: en RST la comilla
  invertida simple no es literal y la suite lo afirma.
- Corregidos en la prosa: «regla de oro» → «criterio rector» (7), los falsos
  amigos `remover`/`librería` → `retirar`/`biblioteca`, `correr` → `ejecutar`,
  «al final del día», «a grandes rasgos», erratas (`traceabilidad`,
  `supuesición`, `Prioritización`, `escalaciones`, `específicación`) y cuatro
  palabras partidas por la extracción del PDF del manual COSMIC
  (`v ersión`, `alma cenamiento`, `n ecesidades`, `en criptación`).
- Congelados en `.claude/baselines/vocabulario_prosa_baseline.txt` (17): los
  tecnicismos de dominio que el corpus no recoge (`idempotencia`,
  `postcondiciones`, `autonomación`, `sobreprocesamiento`, …) y la
  «corrida» de un diseño de experimentos y de un gráfico de corridas (*run
  chart*), que es otro sentido que el de ejecución. En `cosmic/calibration.md`
  sí era el sentido vetado y se corrigió.
- `outputs/measure-after-fixes.log`: 19 antes del baseline; 0 nuevos después.

El gate queda en `.githooks/pre-commit` sobre la prosa staged de esas raíces.

## Controles de anulación

`probes/annul-markdown.tsv`: `no-markdown` cae en los dos casos de Markdown
(`outputs/annul-markdown.out`). `no-fence` y `no-code-span` agotaron el
plazo de 120 s con tres copias cargando el léxico a la vez; se repitieron con
400 s (`outputs/annul-markdown-rerun.out`).

*Métrica:* hallazgos del gate sobre los 289 archivos.
*Ciega a:* la prosa de los comentarios del código y de los README de los
bancos, que son evidencia fechada; y a un término de dominio que el baseline
congela sin juzgar su uso línea a línea.
