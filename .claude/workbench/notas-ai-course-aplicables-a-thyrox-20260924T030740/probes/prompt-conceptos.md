Lee COMPLETO el archivo de la nota que se indica al final (LaTeX en chino; usa la herramienta Read, en tramos si es largo).

Extrae los CONCEPTOS que la nota explica: definiciones, fórmulas, algoritmos, leyes empíricas, métricas, trade-offs cuantitativos y patrones de diseño. NO extraigas herramientas, productos ni consejos de uso ("usa X", "configura Y"): sólo ideas con contenido formal o estructural.

Por cada concepto emite UNA línea JSON (JSON Lines, sin texto antes ni después, sin bloque de código) con estas claves:
- "concepto": nombre corto en español, con el término técnico en inglés entre paréntesis;
- "enunciado": la definición o fórmula tal como la da la nota (copia la fórmula LaTeX literal si existe);
- "problema": qué problema resuelve, en una frase;
- "limite": su limitación o condición de validez si la nota la da, si no "";
- "patron": el patrón TRANSFERIBLE en abstracto, sin vocabulario de ML, en una frase. Ejemplo para speculative decoding: "un proponente barato genera varias propuestas y un verificador caro las juzga todas en una sola pasada, con una regla de aceptación que preserva exactamente el resultado que daría el verificador solo";
- "linea": número de línea de la nota donde se define.

Si la nota no contiene conceptos de ese tipo, no emitas nada.
