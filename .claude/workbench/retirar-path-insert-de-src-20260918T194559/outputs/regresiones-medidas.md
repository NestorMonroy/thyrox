# Regresiones del barrido — medidas, no supuestas (2026-09-18T20:10:08)

## Clase 1 — insert cuyo destino esta FUERA de $THYROX_ROOT/src  (1 caso)

`src/agents/drain_spool.py:86` insertaba `<consumidor>/.claude/hooks`, que
`PYTHONPATH=src` NO cubre. El clasificador lo puso en el cubo `otro` y el
transformador lo retiro igual. RESTAURADO con su razon declarada en comentario.

Rojo que lo delato: `tests/agents/test-carrete-store.sh`.

De las 34 filas del cubo `otro`, es la UNICA cuyo destino no esta bajo
`$THYROX_ROOT/src`; las otras 33 apuntan a `src/` o a un subdirectorio suyo.

## Clase 2 — el modulo invocado COMO GUION con un env sin PYTHONPATH  (>=4 casos)

Los tests construyen `env={...}` desde cero para probar el rehuse del gate:

    subprocess.run([sys.executable, str(MODULE)],
                   env={"PATH": "/usr/bin:/bin", "THYROX_REACH_ROOT": ...})

Antes, el modulo se auto-arrancaba con `sys.path.insert` y llegaba a rehusar
con **exit 2**. Sin el insert y sin PYTHONPATH, el import de `paths.reach`
revienta y Python sale con **exit 1** — el gate no rehusa: no arranca.

Suites afectadas (medido corriendo cada una):

| suite | asercion que cae |
|---|---|
| tests/verify/test_script_deprecated.py      | rehuse esperado 2, real 1 |
| tests/verify/test_path_arithmetic.py        | 16 de 17 |
| tests/verify/test_identifier_language_corpus.py | 20 ok, 3 fallos |
| tests/verify/test_manifest_language.py      | 26 ok, 1 fallo |

**Y NO es solo de tests.** Reglas siempre-cargadas del consumidor mandan
invocar por ruta al fuente, sin envoltorio:

    python3 "$T/src/verify/check_hallazgo_submodulo.py"      (hallazgos-documentacion-obligatoria.md)
    bash    "$T/src/verify/check-hallazgo-sucesor.sh"        (hallazgo-abierto-genera-sucesor.md)
    python3 "$T/src/hallazgo/census_findings.py"             (hallazgos-documentacion-obligatoria.md)

Esa es la superficie de contrato que el barrido rompe si no se decide algo.

## Los 8 inserts DENTRO de una funcion (la poblacion que verify_one.sh NO ve)

Metrica: el modulo llega a importarse.
Ciega a: un insert dentro de una funcion — solo falla al LLAMARLA.

    src/agents/drain_spool.py:86           <- clase 1, restaurado
    src/docs/initiative_placement.py:264   import ya cualificado -> OK
    src/paths/reach_roots.py:95            idem
    src/session/instruction_floor.py:143   idem
    src/verify/check_gitattributes.py:88   idem
    src/verify/check_hook_script_token.py:88  idem
    src/verify/check_mutante_en_staging.py:39 idem
    src/verify/check_script_deprecated.py:80  idem
