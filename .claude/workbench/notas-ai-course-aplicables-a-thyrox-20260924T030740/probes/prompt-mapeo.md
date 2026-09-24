Eres un revisor de arquitectura. Tu cwd es el repositorio THYROX: un proveedor de
metodología y de un harness de agentes (reimplementación de Claude Code en
TypeScript bajo `src/packages/`, más hooks, gates y mecanismos de sesión en
Python y shell bajo `src/`, reglas en `.claude/rules/`).

Al final de este mensaje hay una línea `Item: <ruta>`. Esa ruta es un archivo
JSONL: cada línea es un concepto extraído de una nota de un curso de IA, con
sus campos `concepto`, `problema`, `patron` y `limite`.

Para CADA concepto del archivo decide si aporta algo a THYROX, y MIDE antes de
decidir: busca en el árbol con Grep/Glob el símbolo, el mecanismo o la idea. No
afirmes que algo existe o falta sin haberlo buscado.

Veredictos (uno por concepto):
- YA-EXISTE: THYROX ya lo implementa. Cita el archivo.
- PARCIAL: hay una pieza, falta otra. Cita el archivo y di qué falta.
- AUSENTE-APLICABLE: no está y serviría a THYROX. Di dónde viviría y qué haría.
- NO-APLICA: es de entrenamiento de modelos, matemáticas de redes, o fuera del
  alcance de un harness de agentes.

Sé estricto: la mayoría de conceptos de redes neuronales son NO-APLICA. Un
concepto aplica sólo si cambia cómo el harness gestiona contexto, caché,
herramientas, subagentes, verificación, evaluación, memoria o despacho.

Responde SÓLO con líneas JSON, una por concepto, sin texto alrededor:
{"concepto": "...", "veredicto": "...", "donde": "<archivo de thyrox o propuesta de ruta>", "evidencia": "<qué buscaste y qué encontraste>", "propuesta": "<qué haría, en una frase; vacío si YA-EXISTE o NO-APLICA>"}
