#!/usr/bin/env bash
# Cierra el barrido de identificadores: las tres claves de dict que no cruzan
# contrato, los cinco nombres de archivo sin envoltorio en bin/, y el congelado
# de lo que NO se renombra — con su razon por sitio.
#
# Se corre UNA vez, con la suite parada: reescribe el arbol.
#
# NO invoca el aplicador. El barrido ya convergio: medido en seco, lo unico que
# `rename_identifiers.py` sigue planeando son EXACTAMENTE los nombres que los
# pasos 2 y 3 tratan a mano y los que el paso 4 congela con razon. Dejar el
# paso de aplicar aqui deshacia lo que el de congelar declara — una tension que
# nadie habia medido hasta correr el modo seco.
set -euo pipefail
cd "$(dirname "$0")/../../../.."

# --- 1. las tres claves de dict que NO cruzan contrato ---------------------
# `equiv_desv`/`cache_desv` se construyen y se leen en el MISMO archivo de
# prueba; `filas_en_el_origen` tiene dos sitios vivos en el arbol —su
# productor y su test— mas una cita en un hallazgo del consumidor, que es
# evidencia fechada y NO se reescribe.
sed -i 's/equiv_desv/equiv_std/g; s/cache_desv/cache_std/g' \
    tests/agents/test_usage_census_deviation.py
sed -i 's/filas_en_el_origen/rows_in_source/g' \
    src/agents/merge_stores.py tests/agents/test_merge_stores.py
echo "claves de dict renombradas: 3"

# --- 2. los cinco nombres de archivo sin envoltorio en bin/ ----------------
git mv tests/session/test-bg-nombre-bandera.sh            tests/session/test-bg-name-flag.sh
git mv tests/session/test-run-task-pool-aislamiento.sh    tests/session/test-run-task-pool-isolation.sh
git mv tests/session/test-run-task-pool-alcance.sh        tests/session/test-run-task-pool-scope.sh
git mv tests/session/test-wait-jobs-dependencia.sh        tests/session/test-wait-jobs-dependency.sh
git mv tests/session/test-write-env-repara-clon-desplazado.sh \
       tests/session/test-write-env-repairs-moved-clone.sh

# --- 3. reapuntar las citas a los cinco nombres viejos ---------------------
# Incluye las auto-citas de cada guion (su cabecera y su linea de uso), la de
# `src/session/write-env.sh`, la de `test-process-group.sh` y la de la regla
# `trabajo-en-segundo-plano.md`. Sin esto el renombre deja referencias
# apuntando a un archivo que ya no existe.
mapfile -t CITATIONS < <(grep -rl \
    -e 'test-bg-nombre-bandera' -e 'test-run-task-pool-aislamiento' \
    -e 'test-run-task-pool-alcance' -e 'test-wait-jobs-dependencia' \
    -e 'test-write-env-repara-clon-desplazado' \
    src tests .claude/rules 2>/dev/null || true)
if ((${#CITATIONS[@]})); then
    sed -i \
        -e 's/test-bg-nombre-bandera/test-bg-name-flag/g' \
        -e 's/test-run-task-pool-aislamiento/test-run-task-pool-isolation/g' \
        -e 's/test-run-task-pool-alcance/test-run-task-pool-scope/g' \
        -e 's/test-wait-jobs-dependencia/test-wait-jobs-dependency/g' \
        -e 's/test-write-env-repara-clon-desplazado/test-write-env-repairs-moved-clone/g' \
        "${CITATIONS[@]}"
    printf 'citas reapuntadas: %d archivo(s)\n' "${#CITATIONS[@]}"
fi

# --- 4. congelar lo que NO se renombra, con su razon -----------------------
# No es deuda heredada: es lo que un renombre romperia, declarado por sitio.
B=.claude/baselines/identifier_language_baseline_claude.txt
{
  printf '\n# --- %s: lo que el barrido NO renombra, y por que ---\n' "$(date -u +%Y-%m-%d)"
  printf '# Nombres de ARTEFACTO del consumidor: la clave nombra el .rst que se\n'
  printf '# emite y cuyo nombre fija `metadata-standards.md` —`alcance-<slug>.rst`,\n'
  printf '# `tareas-<slug>.rst`—. Traducir la clave y dejar el valor en español\n'
  printf '# rompe la correspondencia que hace legible la tabla.\n'
  printf 'src/docs/scaffold_initiative.py::alcance\n'
  printf 'src/docs/scaffold_initiative.py::tareas\n'
  printf '# FALSO AMIGO del lexico: `subnormal` es el termino IEEE 754, en ingles.\n'
  printf '# El identificador YA esta en ingles; el gate lo marca por su lexico\n'
  printf '# probabilistico. Sucesor del eje: TASK-THYROX-0309.\n'
  printf 'src/measurement/normalizer_magnitude.py::FLOAT_64_MIN_SUBNORMAL\n'
  printf '# FREEZE de generate_bin.py: la directiva prohibe tocar el generador ni\n'
  printf '# bin/ hasta que TypeScript, Python y shell esten en verde. No es deuda\n'
  printf '# heredada: es un bloqueo nombrado que se destapa cuando el freeze caiga.\n'
  # Se lee la salida CRUDA del gate y NO `ri.gate_violations()`: esa funcion
  # filtra `FROZEN` desde que el aplicador toco los dos archivos, asi que
  # pedirle justo los congelados devolveria vacio — el instrumento seria ciego
  # al unico fenomeno que se le pregunta.
  bash bin/check_script_naming --identifiers . 2>/dev/null \
      | awk '$1 ~ /generate_bin\.py:[0-9]+$/ {sub(/:[0-9]+$/, "", $1); print $1 "::" $2}'
} >> "$B"
echo "identificadores congelados con razon: 3 + los de generate_bin"

# --- 5. el eje del NOMBRE: los tres que el freeze de bin/ bloquea ----------
# La familia `hallazgo` -> `finding` es UN renombre coherente, no tres sueltos:
# `src/hallazgo/hallazgo_ids.py` tiene envoltorio en `bin/hallazgo_ids`, y
# `check_hallazgo_submodulo` tambien. Renombrar el fuente sin regenerar `bin/`
# deja el envoltorio apuntando a un archivo inexistente — y regenerar `bin/`
# esta bloqueado por directiva. El destino cuando se desbloquee ya lo declara
# el arbol: `finding`, que es como se llama `bin/check_finding_id_unique`.
N=.claude/baselines/script_naming_language_baseline.txt
{
  printf '\n# --- %s: bloqueado por el freeze de bin/, no deuda heredada ---\n' \
      "$(date -u +%Y-%m-%d)"
  printf '# La familia hallazgo -> finding se renombra ENTERA o no se renombra:\n'
  printf '# dos de sus fuentes tienen envoltorio en bin/, y regenerar bin/ esta\n'
  printf '# bloqueado por directiva. Destino declarado: `finding`.\n'
  printf 'src/hallazgo/hallazgo_ids.py\n'
  printf 'tests/hallazgo/test_hallazgo_ids.py\n'
  printf 'tests/verify/test-hallazgo-submodulo-baseline.sh\n'
} >> "$N"
echo "nombres congelados con razon: 3"

# --- 6. veredicto -----------------------------------------------------------
echo "=== gate, los dos ejes ==="
bash bin/check_script_naming --idioma      . 2>&1 | tail -2
bash bin/check_script_naming --identifiers . 2>&1 | tail -3
