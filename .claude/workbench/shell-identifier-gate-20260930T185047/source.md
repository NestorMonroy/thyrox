# El gate de idioma de identificadores cubre shell — TASK-THYROX-0664

## El problema, medido el 2026-09-30

`src/verify/check_identifier_language.py` mide los identificadores DECLARADOS
de `.py` (AST de Python) y de `.ts` (AST del compilador,
`ts_declared_identifiers.ts`), y el pre-commit
(`.githooks/pre-commit:167-183`) sólo le pasa esas dos extensiones. Un `.sh`
no lo mide nadie. Medido con el léxico del propio gate
(`spanish_words_in`) sobre los 28 `.sh` que una sesión tocó: 34
identificadores en español en 9 archivos, entre ellos `SALIDA`, `RAIZ`,
`ESPERADO`, `FALLOS`, `rehusa`, `afirmar`, `veredicto_de`, `cwd_visto`. La
regla `.claude/rules/identificadores-en-ingles.md` los prohíbe y ningún gate
lo impide.

## Lo que se construye

1. **Extracción de identificadores declarados en shell**, en un módulo propio
   bajo `src/verify/` (nombre en inglés), con estas formas: asignación
   (`NAME=`, `local`, `export`, `readonly`, `declare`/`typeset` con sus
   banderas), definición de función (`name() {` y `function name`), variable
   de `for` y de `read`. Una asignación se toma sólo en posición de comando:
   no dentro de una cadena ni de un comentario. **El cuerpo de un heredoc no
   se ejecuta y no declara nada**: se descarta con
   `src/hooks/shell_text.py`, el módulo que ya comparten los detectores. No
   se añaden dependencias (no hay parser de bash instalado; se mide lo que
   hay).
2. **`check_identifier_language.py` lo usa** para `.sh` (y archivos sin
   extensión cuyo shebang sea bash o sh, si el gate ya recorre por raíz), con
   el mismo léxico, las mismas familias de sufijo técnico y el mismo
   baseline. Las variables de entorno declaradas en `.env.example` son un
   contrato compartido con otros lenguajes: si una está en español se reporta
   igual, no se exime.
3. **El pre-commit pasa también los `.sh` staged de `src/`, `tests/` y
   `bin/`** a `bin/check_identifier_language`.
4. **La deuda heredada se congela**, no se barre: las entradas de shell se
   añaden al baseline declarado (`IDENTIFIER_LANGUAGE_BASELINE`, hoy
   `.claude/baselines/identifier_language_baseline.txt`) sin retirar ninguna
   de Python ni de TypeScript. La traducción de los identificadores de los
   archivos tocados es un pool posterior.

## Pruebas

Un guion de prueba con `main()` (sin `pytest`), en `tests/verify/`, con casos
reales del árbol como control positivo —no fabricados—: `SALIDA` de
`tests/session/test-headless-pool.sh`, `rehusa` de
`src/session/headless-pool.sh`. Y controles de que NO se reporta: una palabra
en español dentro de un comentario, de una cadena y del cuerpo de un heredoc.
Cada rama nueva con su control de anulación: retirarla hace caer exactamente
sus casos, con los números.

Te pertenecen `src/verify/check_identifier_language.py`, el módulo nuevo de
extracción bajo `src/verify/`, `tests/verify/test_identifier_language_shell.py`,
`.githooks/pre-commit` y `.claude/baselines/identifier_language_baseline.txt`.
