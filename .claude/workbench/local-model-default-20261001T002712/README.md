# local-model-default

Directiva del ejecutor 2026-10-01: thyrox usa por defecto sus modelos locales;
si ninguno cumple la clase, cae a claude-cli declarándolo. Tres ítems de pool
(TASK-THYROX-0705, 0706, 0707) sobre los contratos de `model-artifacts`
(`modelQualification.ts`, `localModelHome.ts`). Fuente: `source.md`.

## Primera cualificación real (`outputs/qualifications/`)

`local-models-qualify thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf mecanica`
→ `tool-calling@1` 6/6, contexto 8192, 0,3 tokens/s (medido con un pool al
lado: no es la cifra en reposo).

Lo que esta aprobación **no** dice:

- *Métrica:* la llamada a herramienta bien formada en seis casos deterministas.
- *Ciega a:* si el modelo resuelve la tarea. El mismo modelo, servido por
  `thyrox -p`, respondió «3» a «2+2». Aprobar `tool-calling@1` es condición
  necesaria para un ítem `mecanica`, no suficiente: falta una suite de tarea
  (un ítem real con su verify) antes de que la cualificación signifique que el
  modelo puede hacer el trabajo. Sucesor: TASK-THYROX-0710.
- El contexto medido (8192) queda por debajo del piso de un ítem del pool
  (~24 000 tokens sólo de reglas), así que el recomendador no lo elige: es la
  conducta correcta.
