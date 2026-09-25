# gawk en su momento: `gensub` e `-i inplace` con gate

Directiva del ejecutor 2026-09-25: un script o una regla conectada a un
script para que `gensub` y `-i inplace` se usen en el momento correcto.

## Medido antes de escribir (gawk 5.2.1, mawk en /usr/bin/mawk)

- `gsub(/(\w+) (\w+)/, "\\2 \\1")` sobre «hola mundo» imprime `\2 \1` y
  sale 0; `gensub` con el mismo reemplazo imprime «mundo hola».
- `mawk -i inplace` sale 2: «not an option: -i».
- `gawk -i inplace -v inplace::suffix=.bak` escribe el archivo y su copia.

## TDD

- `red.txt`: la suite antes del módulo (FileNotFoundError, exit 1).
- `green-*.txt`: 23 ok en la suite del detector, 28 en la del despachador.
- Anulación: cada una de las seis mitades de juicio, retirada, hace caer
  exactamente su gemelo inocente (sección 3 de la suite).

## Subconjunto derivado

`derived.txt` sale de
`grep -rlE "detect_gawk_opportunity|pretooluse_dispatch" --include=*.py --include=*.sh tests/`
y `derived-exits.txt` da 8 de 10 en 0. Los dos rojos
(`tests/session/test_user_wiring.py`, `tests/session/test_generate_bin.py`)
también fallan **sin** este cambio (`git stash`, `baseline-*.log`):
`THYROX_REACH_ROOTS` sin declarar y `paths` fuera de `PYTHONPATH`. No se
atribuyen a este cambio.

## Hallazgo pendiente de acuñar

Lo que no era obvio antes de medir: `gsub` con `\\1` no falla, escribe el
reemplazo literal y sale 0. Se queda aquí porque `hallazgo_ids.py acunar
THYROX` necesita la raíz `docs` (kaupamex-docs), que no está en esta sesión,
y la regla prohíbe acuñar el número a mano. Condición de cierre: acuñarlo y
registrarlo con `agent_store.py agregar-hallazgo` en una sesión que tenga
kaupamex-docs al alcance.

## Inercia declarada

Igual que sus hermanos: bajo el harness remoto no hay `PreToolUse` cableado,
así que el detector existe y no dispara aquí. La regla
(`operaciones-de-archivo-con-bash.md`) es la que gobierna.
