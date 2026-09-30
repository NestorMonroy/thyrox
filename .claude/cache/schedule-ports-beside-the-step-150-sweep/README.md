# Schedule the ports beside the step 150 sweep

Qué archivos cubre el barrido de la memoria del paso 150 (gate 4 de la
v2.2.0, dentro de la ruta 3 del plan v3.0.0), y cuáles de los portes en curso
quedan fuera de él. Es la medición con la que se decidió lanzar los pasos 151
(`claudemd.ts`) y 152 (`attachments.ts`) **en paralelo** con el barrido: el
pipeline exporta al árbol principal, así que dos escritores sobre el mismo
archivo se pisarían.

- **Episodio:** corrida `run-20260924T175031`, paso 150 (84 patrones sobre 34
  archivos), 2026-09-25.
- **Decisión:** `hooks.ts` y `messages.ts` están en el barrido y esperan a que
  termine; `attachments.ts` y `claudemd.ts` están libres y se portaron a la vez.

| archivo | qué es |
|---|---|
| `sweep-150-files.txt` | los 34 archivos que tocan los ítems del barrido |
| `port-overlap.tsv` | `free` / `in-sweep` por porte en curso |

**Cómo se regenera** (desde la raíz de thyrox):

```bash
R=.claude/workbench/tsc-zero-loop/run-20260924T175031
gawk '{for(i=3;i<=NF;i++) print $i}' $R/step-150/items.txt | sort -u > sweep-150-files.txt
```

*Métrica:* rutas listadas en los ítems del barrido (columnas 3 en adelante).
*Ciega a:* un archivo que el agente del barrido edite sin que el ítem lo nombre
—`pattern-sweep.md` le prohíbe hacerlo— y a los consumidores que el
verificador mide sin que se editen.
