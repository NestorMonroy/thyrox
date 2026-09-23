# annulment_control: el control de anulación deja su evidencia en el banco

Episodio que lo origina (2026-09-23): cada anulación se hizo a mano
(`cp archivo .claude/cache/x.orig`, editar, correr, `cp` de vuelta), y:
1. las copias de partida vivían fuera del banco y se borraron al limpiar,
   presentándolo como regla («el repo prohíbe archivos de respaldo»). Esa
   regla no existe en thyrox: es I-002 de `kaupamex-docs`, y prohíbe
   versiones paralelas de un artefacto, no la evidencia de un control;
2. el parche de cada anulación no quedó escrito: los bancos lo describían en
   prosa;
3. «nada se perdió» se afirmó sin medirlo (ya no había con qué comparar).

`src/verify/annulment_control.py` convierte cada punto en un paso medido:
el parche se aplica con `git apply` y se copia al banco; la restauración es
`git apply -R` y se verifica comparando `git hash-object` antes y después;
si el sujeto no está commiteado, su estado de partida se guarda aquí porque
git no lo tiene.

Anulaciones de la propia herramienta, ejecutadas CON ella:

| Pieza anulada | Cae |
|---|---|
| `annulled-precheck.*` — sin `git apply --check` | sólo «rehúsa con ValueError» |
| `annulled-before-copy.*` — sin copia del estado sin commitear | sólo «el estado de partida sin commitear queda en el banco» |

`attempt1-*`: el primer intento. En los dos casos la suite ABORTABA
(`CalledProcessError`, `FileNotFoundError`) en vez de fallar una aserción, así
que no decía qué dependía de la pieza. Se conserva como evidencia del defecto
del control, no se borra.

Métrica: aserciones de la suite por pieza anulada; blob del sujeto antes y
después (`annulment.jsonl`).
Ciega a: archivos que la suite escriba fuera del sujeto; la herramienta sólo
garantiza que el sujeto vuelve a su blob de partida.

## Segunda versión: la sustitución vive DENTRO de la herramienta

Episodio, el mismo día: al regenerar las anulaciones de `removeUnusedImports`,
el parche se componía FUERA (una sustitución en Python y luego `diff -u`). Una
sustitución no casó, el archivo «anulado» quedó vacío, y `diff` produjo un
parche que borraba el módulo entero. La herramienta lo aplicó y la suite
«cayó», por el motivo equivocado. La corrida se conserva en ese banco como
`*-INVALID-head-text-compare.*`.

`--replace VIEJO NUEVO` (`run_substitution`) compone el parche aquí y rehúsa si
VIEJO no casa exactamente una vez. El manifiesto guarda la sustitución.

| Pieza anulada (v2, 23 casos) | Cae |
|---|---|
| `annulled-exactly-once.*` — sin la guarda de «exactamente una vez» | sólo «una sustitución ambigua rehúsa» |
| `annulled-v2-precheck.*` — sin `git apply --check` | sólo «rehúsa con ValueError» |
| `annulled-v2-before-copy.*` — sin copia del estado sin commitear | sólo «el estado de partida sin commitear queda en el banco» |

«Una sustitución que no casa rehúsa» sobrevive a la primera anulación, y es lo
esperado: el parche vacío que resulta lo rechaza igualmente `git apply
--check`. Son dos defensas independientes, y cada anulación mide la suya.

## Tercera versión: el bytecode en caché escondía la anulación (2026-09-23)

Anular `open("a")` → `open("w")` en `batch_verification.py` dejó su suite en
verde. No es que el caso no discriminara: la anulación no llegó a ejecutarse.
Python valida el `.pyc` por mtime y tamaño, y un cambio del mismo tamaño dentro
del mismo segundo que la compilación anterior reutiliza el bytecode viejo. La
corrida se conserva como `STALE-PYC-ledger-append` en el banco `tsc-schedule-*`.

Ahora cada corrida de la suite usa un `PYTHONPYCACHEPREFIX` nuevo y siempre
compila desde el fuente. Caso rojo: «una anulación del mismo tamaño SÍ se
ejecuta». Anulación `pycache-prefix` (sin el prefijo): cae «y al restaurar
vuelve a verde». Qué aserción del par cae depende de en qué segundo coincide
cada corrida con el caché; las dos miden el mismo fenómeno.

Las anulaciones en Python anteriores de esta sesión tumbaron algún caso, lo que
prueba que se ejecutaron; el riesgo existía sólo cuando no caía nada.
