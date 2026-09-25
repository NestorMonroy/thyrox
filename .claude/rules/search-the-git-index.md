# ¿Está el texto? Se elige el instrumento por su universo, y nunca `git log -S`

Una pregunta de **presencia** («¿este símbolo existe en el repo?») tiene tres
formas correctas, y **ninguna** es `git log -S`. Se elige por **qué conjunto
de archivos** tiene que cubrir la respuesta, no por costumbre:

| Universo que la respuesta debe cubrir | Forma | Segundos (n=3) |
|---|---|---|
| lo no ignorado por `.gitignore` (salta ocultos) | `rg -l '<patrón>' <ruta>` | **0.080** |
| exactamente lo **versionado** | `git grep -l '<patrón>' -- <ruta>` | 0.182 |
| lo versionado **más** lo no versionado | `git grep -l --untracked '<patrón>' -- <ruta>` | — |
| todo lo que hay en disco, ignorado incluido | `grep -rl '<patrón>' <ruta>` | 0.447 |
| lo versionado en un commit concreto | `git grep -l '<patrón>' <rev> -- <ruta>` | 0.543 |

Y la forma que **no** responde esta pregunta:

| Forma | Segundos | Por qué no |
|---|---|---|
| `git log --all -S '<patrón>'` | **15.30** (n=1) | calcula un diff por cada commit alcanzable (5880 en la medición): responde *cuándo* apareció el texto, no *si está* |

Medido el 2026-09-25 sobre `kaupamex-docs/.claude` (15 556 archivos en disco,
15 550 versionados), mismo patrón, caché de páginas caliente:
`.claude/workbench/git-grep-vs-grep-r-20260925T194542/`.

## Lo que la medición corrigió

1. **La causa del segundo plano fue el pickaxe, no el `grep -r`.** `git log
   --all -S` tardó 85× lo que `git grep`; el `grep -r` sólo 2.6×. El primer
   diagnóstico atribuía el coste a los dos por igual.
2. **`git grep` no es la forma más rápida:** `rg` lo es, 2.3× sobre el
   índice. `git grep` se elige cuando la respuesta tiene que ser
   **exactamente lo versionado** —la pregunta de «¿existe en el repo?»—, no
   por velocidad.
3. **«Sobre el índice» no es un detalle:** `git grep <rev>` lee los objetos
   del árbol de ese commit y tarda más que el índice.

## Cuándo `git log -S` sí es la forma

Cuando la pregunta es **cuándo** apareció o desapareció el texto. Aun así,
con un rango que lo acote (`origin/develop..HEAD`), no con `--all`: el coste
es lineal en los commits del rango.

*Métrica:* reloj de pared de cada forma, mismo repositorio y mismo patrón.
*Ciega a:* el arranque en frío (primera lectura del disco) y a que los
universos no son iguales: un cero de `rg` sobre un archivo oculto o ignorado
no prueba ausencia, y uno de `git grep` sin `--untracked` tampoco sobre un
archivo nuevo. La diferencia entre formas es de **respuesta**, no sólo de
tiempo.

## El gate

`src/hooks/detect_git_grep_opportunity.py`, detector de
`pretooluse_dispatch.py`. Momentos que reconoce, cada uno con su forma
alternativa en el aviso:

1. `grep -r`/`-R` sobre una ruta dentro de un work tree de git → `rg` o
   `git grep`, según el universo;
2. `git log -S`/`-G` sobre un rango ancho (`--all`, o sin rango `a..b`) →
   `git grep` si la pregunta es de presencia; un rango acotado si es de
   historia.

No avisa sobre el texto de un heredoc: su cuerpo no se ejecuta. Su primer
disparo real en sesión avisó sobre la prosa de esta misma regla, escrita con
`cat > … <<'EOF'`; el cuerpo se pela con el instrumento de
`detect_stdin_reading_interpreter`, no con una copia.

Avisa, no bloquea: no distingue la intención, y un `git log --all -S` puede
querer de verdad la historia entera.

Sus tres mitades de juicio se probaron por anulación, y cada una tumba
exactamente su gemelo: `REQUIRE_GIT_TREE` (el `grep -r` fuera de git),
`SKIP_BOUNDED_RANGE` (el pickaxe con rango acotado) y el pelado de heredocs
(sus dos casos). La primera corrida de la segunda anulación tumbó el caso
equivocado: era el `.pyc` del paso anterior (mismo segundo, mismo tamaño),
no el código; se repitió con `PYTHONDONTWRITEBYTECODE=1`.

```bash
python3 tests/hooks/test_detect_git_grep_opportunity.py
```
