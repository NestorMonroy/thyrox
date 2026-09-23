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
