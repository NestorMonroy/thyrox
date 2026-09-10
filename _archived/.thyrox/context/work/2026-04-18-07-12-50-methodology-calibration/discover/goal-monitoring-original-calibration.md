```yml
created_at: 2026-04-19 10:27:32
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Chapter 11: Goal Setting and Monitoring — EPUB original en inglés" (documento externo, 2026-04-19)
ratio_calibración: 20/33 (60.6%)
clasificación: PARCIALMENTE CALIBRADO
delta_vs_traduccion: -2.7pp
delta_vs_cap9: -16.4pp
```

# Calibración epistémica — Chapter 11: Goal Setting and Monitoring (EPUB original en inglés)

## Ratio de calibración: 20/33 (60.6%)
## Clasificación: PARCIALMENTE CALIBRADO

Ratio binario estándar: (Observaciones directas + Inferencias calibradas) / Total claims
= (5 + 15) / 33 = 60.6%

Ratio ponderado (evidencia continua): estimado ~51%

Contexto de referencia:
- Cap.9 = 77% CALIBRADO
- Cap.10 original = 65% PARCIALMENTE CALIBRADO
- Cap.10 V1 = 79% CALIBRADO
- **Cap.11 traducción española = 63.3% PARCIALMENTE CALIBRADO**
- **Cap.11 original inglés (este análisis) = 60.6% PARCIALMENTE CALIBRADO**

---

## Veredicto comparativo

**El original tiene PEOR calibración que la traducción española (-2.7pp).**

La diferencia no es por degradación de los claims heredados — esos son idénticos (19/30 = 63.3% en ambas versiones). El delta proviene exclusivamente de los 3 claims nuevos que el original añade sobre la traducción:

| Claim nuevo | Tipo | Efecto en ratio |
|-------------|------|-----------------|
| C31: "eliminate code hallucinations" | Performativo | -1 calibrado |
| C33: "accountable AI systems" | Performativo | -1 calibrado |
| C34: Ejemplos 2 y 3 comentados (código observable) | Observación directa | +1 calibrado |

Neto: +1 observación directa, +2 performativos. El denominador crece 3, el numerador crece 1. Resultado: caída de 63.3% a 60.6%.

---

## Distribución por tipo de evidencia

| Tipo | Count | % del total |
|------|-------|-------------|
| Observación directa | 5 | 15.2% |
| Inferencia calibrada | 15 | 45.5% |
| Inferencia especulativa | 2 | 6.1% |
| Afirmación performativa | 11 | 33.3% |

**Cambio vs. traducción:**
- Observaciones directas: 4 → 5 (+1)
- Inferencias calibradas: 15 → 15 (sin cambio)
- Performativos: 9 → 11 (+2)
- Especulativos: 2 → 2 (sin cambio)
- Total: 30 → 33 (+3)

---

## Claims heredados de la traducción (30 claims — sin cambios)

Los 30 claims de la traducción española son idénticos en el original inglés. Su clasificación no cambia. Para el inventario completo ver `goal-monitoring-pattern-calibration.md`.

Resumen heredado:
- C01–C30 clasificados en análisis anterior
- 4 observaciones directas (C15, C16, C17, C18)
- 15 inferencias calibradas (C02–C04, C06–C08, C11, C13, C19–C23, C27 y otros)
- 2 inferencias especulativas (C09 trading, C10 robótica)
- 9 performativos (C01, C05, C12, C14, C24, C26, C28, C29, C30)

**Nota sobre C24 en el original:** "significantly improves objective evaluation" (L315) — presente en ambas versiones con la misma formulación ("significativamente" en español, "significantly" en inglés). La clasificación como performativo se mantiene: no hay benchmark comparando single-LLM vs. multi-agent review quality.

---

## Claims nuevos del original (3 claims adicionales: C31–C33)

### C31 — "Expert Code Review Approach": eliminación de hallucinations

**Texto exacto (L294):**
> "Your core mission is to eliminate code hallucinations by ensuring every suggestion is grounded in reality and best practices."

**Clasificación: Afirmación performativa (0.0–0.10)**

**Impacto: Alto**

**Análisis:**
Este es el claim con mayor problema de calibración en el original. Hay tres problemas superpuestos:

1. **Contradicción interna con las advertencias del capítulo:** La sección "Caveats and Considerations" (L288-290) afirma explícitamente: "An LLM may not fully grasp the intended meaning of a goal and might incorrectly assess its performance as successful. Even if the goal is well understood, the model may hallucinate." El original, en la misma sección de Caveats, reconoce que el modelo puede alucinar — y luego, en la misma sección Caveats, presenta un reviewer prompt que "elimina alucinaciones". El claim contradice la advertencia que lo rodea.

2. **"Eliminate" es categórico sin evidencia:** No hay benchmark que demuestre que un reviewer prompt reduce hallucinations a cero. La literatura sobre self-consistency y self-refinement (Shinn et al. 2023, arXiv:2303.11366; Madaan et al. 2023, arXiv:2303.17651) reporta mejoras marginales y en escenarios específicos, no eliminación. "Reduce" o "may reduce" sería inferencia calibrada. "Eliminate" es performativo.

3. **El mecanismo propuesto es un prompt, no un mecanismo de verificación:** "Grounded in reality" no tiene operacionalización. El reviewer LLM recibe el mismo texto como entrada — no accede a documentación oficial, no ejecuta el código, no consulta fuentes externas. La "realidad" a la que se ancla es el conocimiento paramétrico del LLM, que es precisamente la fuente de las alucinaciones.

**Evidencia que lo convertiría en calibrado:** Benchmark A/B comparando tasa de errores con y sin reviewer separado usando el mismo LLM (e.g., GPT-4o). O reformular: "may reduce code errors by providing a separate evaluation pass."

---

### C32 — "Your feedback should be direct, constructive..." (prescripción, no claim calibratable)

**Texto exacto (L303):**
> "Your feedback should be direct, constructive, and always aimed at improving the quality of the code."

**Clasificación: No contabilizado como claim calibratable**

**Impacto: N/A**

**Análisis:** Esta frase es una instrucción directiva dentro del prompt del reviewer — le dice al LLM cómo debe comportarse, no afirma un resultado observable del sistema. No es una afirmación sobre el mundo que pueda ser verdadera o falsa independientemente de la instrucción; es la instrucción misma. Excluido del denominador de calibración.

**Distinción relevante:** "El sistema produce retroalimentación directa y constructiva" sería un claim calibratable (y sería performativo sin benchmark). "Tu retroalimentación debe ser directa y constructiva" es una prescripción dentro de un prompt — es el mecanismo propuesto, no una afirmación sobre su efectividad.

---

### C33 — "accountable AI systems"

**Texto exacto (L346):**
> "Ultimately, equipping agents with the ability to formulate and oversee goals is a fundamental step toward building truly intelligent and accountable AI systems."

**Clasificación: Afirmación performativa (0.0–0.15)**

**Impacto: Medio**

**Análisis:**
"Accountable AI systems" es un término técnico con significado específico en la literatura de AI governance y AI safety. Un sistema accountable, en el sentido estándar (NIST AI RMF, EU AI Act, IEEE 7001), requiere: (1) trazabilidad de decisiones, (2) mecanismos de auditoría, (3) explicabilidad de outcomes, (4) capacidad de corrección humana. El código del capítulo no implementa ninguno de estos mecanismos:

- No hay logging de decisiones del LLM
- No hay audit trail de iteraciones (solo prints en stdout)
- No hay explicabilidad — el código guarda el archivo final sin documentar por qué el LLM declaró los objetivos cumplidos
- No hay mecanismo de override humano — el bucle corre hasta `max_iterations=5`

El claim afirma que el patrón del capítulo es "un paso fundamental hacia sistemas accountable" cuando el código ilustrativo carece de los mecanismos básicos de accountability. Es posible que el patrón *pueda contribuir a* sistemas accountable si se extiende significativamente, pero en su forma actual el claim no está derivado de los mecanismos del código.

**Contraste con C30 de la traducción:** La versión española cierra con "truly intelligent" (C30 en el análisis anterior), clasificado como performativo. El original añade "accountable" — lo cual eleva el problema porque "accountable" tiene definición técnica verificable, mientras que "truly intelligent" es más ambiguo. Peor calibrado, no mejor.

**Evidencia que lo convertiría en calibrado:** (1) Demostrar cómo el patrón del capítulo implementa al menos un componente de accountability (trazabilidad de goals, logging de iteraciones, explicación de criterios). O (2) reformular: "a step toward building more purposeful AI systems" — sin el término técnico que requiere evidencia específica.

---

### C34 — Ejemplos 2 y 3 comentados en el código

**Texto exacto (L263-273):**
```python
# Example 2 (commented out)
# use_case_input = "Write code to count the number of files..."
# ...
# Example 3 (commented out)
# use_case_input = "Write code which takes a command line input of a word doc..."
```

**Clasificación: Observación directa**

**Impacto: Bajo**

**Análisis:** La presencia de código comentado es un hecho observable en el listing Python del capítulo. Los ejemplos 2 y 3 existen como comentarios — son código muerto, no ejecutado por el flujo principal. No afectan el comportamiento del sistema pero documentan casos de uso adicionales que el autor probó o consideró.

**Relevancia para calibración:** La existencia de ejemplos comentados no genera claims performativos — son código observable, no afirmaciones sobre calidad. Su efecto en calibración es neutro excepto que confirma que el capítulo fue desarrollado iterativamente (el autor probó al menos 3 casos de uso).

**Nota:** Los ejemplos 2 y 3 no añaden nuevos claims calibratables sobre el sistema — no afirman que estos casos funcionen, se "polished output", ni nada similar. Son simplemente código comentado. Contabilizado como observación directa del estado del código, no como claim sobre calidad.

---

## Análisis del dominio "Expert Code Review Approach" (nuevo en original)

Este es el dominio más problemático añadido por el original. Concentra 2 claims performativos en un espacio textual pequeño (4 bullets y 2 párrafos).

| Dominio | Claims | Calibrados | Performativos | Ratio dominio |
|---------|--------|------------|---------------|---------------|
| Expert Code Review Approach (nuevo) | 2 | 0 | 2 (C31, C33 parcialmente) | **0%** |
| Todos los demás (heredados) | 31 | 20 | 9 | **64.5%** |

El dominio "Expert Code Review Approach" tiene el mismo ratio 0% que los dominios de "claims de calidad del código" y "framing retórico" identificados en la traducción. Este es el patrón CAD amplificado: el original añade un nuevo dominio de 0% en lugar de mejorar los dominios existentes.

**Firma epistémica del patrón:** La sección "Expert Code Review Approach" promete eliminación de un problema (hallucinations) en el mismo documento que admite explícitamente que ese problema es inherente al mecanismo. Este es el caso más claro de realismo performativo en la serie Cap.9–Cap.11: el claim no solo carece de evidencia, sino que está contradicho por evidencia en el mismo documento.

---

## Análisis CAD por dominio (original completo)

**CAD = Calibrado / Ambiguo / Deficiente**

| Dominio | Claims | Calibrados | Especulativos/Performativos | Ratio dominio |
|---------|--------|------------|----------------------------|---------------|
| Código — bugs/observaciones | 5 | 5 (obs. directas) | 0 | **100%** |
| Advertencias | 5 | 5 (inf. calibradas) | 0 | **100%** |
| Casos de uso | 6 | 4 (inf. calibradas) | 2 (especulativas) | **67%** |
| Conceptual / patrón intro | 4 | 3 (inf. calibradas) | 1 (performativo) | **75%** |
| Expert Code Review Approach (nuevo) | 2 | 0 | 2 (performativos) | **0%** |
| Claims de calidad del código | 2 | 0 | 2 (performativos) | **0%** |
| Framing / retórica de cierre | 6 | 0 | 6 (performativos) | **0%** |
| ADK / referencias | 3 | 1 (SMART) | 2 (performativos) | **33%** |

**Polarización 100%/0% — más pronunciada que en la traducción:**
- Dominios con 100%: código-bugs y advertencias (sin cambio vs. traducción)
- Dominios con 0%: claims de calidad + framing retórico + Expert Code Review Approach (nuevo) = 3 dominios vs. 2 en la traducción
- El original añade un tercer dominio de 0% en lugar de mejorar los existentes

---

## Hallazgos sobre las preguntas específicas del prompt

### "Expert Code Review Approach" — ¿agrega claims calibrados o performativos?

**Respuesta: Exclusivamente performativos.**

Los 2 claims calibratables del "Expert Code Review Approach" son performativos (C31 y parcialmente C33). La sección presenta un prompt de reviewer LLM como si fuera un mecanismo de eliminación de errores, pero:
1. No hay benchmark que respalde "eliminate hallucinations"
2. El mismo capítulo contradice el claim en las advertencias
3. El mecanismo propuesto (otro LLM sin acceso a fuentes externas) no puede "ground" suggestions en "reality" más allá del conocimiento paramétrico

La sección habría sido neutral o levemente positiva para calibración si hubiera dicho "a separate reviewer pass may reduce errors" con hedging. Al decir "eliminate" convierte una práctica razonable en un claim performativo.

### "accountable AI systems" en conclusión — ¿calibrado?

**Respuesta: Performativo con agravante.**

No calibrado. Agravante: "accountable" es un término con definición técnica formal (NIST AI RMF, EU AI Act, IEEE 7001) que requiere mecanismos específicos ausentes del código del capítulo. Es el claim performativo de mayor especificidad técnica del capítulo — más problemático que "truly intelligent" precisamente porque "accountable" tiene criterios verificables.

### Ejemplos 2 y 3 comentados — ¿afectan calibración?

**Respuesta: Efecto neutro-positivo, marginal.**

Son código observable (observación directa: +1 al numerador). No contienen claims de calidad. No afirman que los ejemplos 2 y 3 produzcan "polished output" ni ninguna otra propiedad. Su presencia como código comentado es un hecho sin impacto en la calibración de los claims del capítulo. El efecto es +1/+1 (un claim más, calibrado), lo que marginalmente reduce el ratio ponderado por ampliar el denominador con un claim trivial.

---

## Comparación directa: original vs. traducción española

| Dimensión | Traducción española | Original inglés | Delta |
|-----------|--------------------|--------------------|-------|
| Ratio binario | 19/30 (63.3%) | 20/33 (60.6%) | **-2.7pp** |
| Observaciones directas | 4 | 5 | +1 |
| Inferencias calibradas | 15 | 15 | 0 |
| Performativos | 9 | 11 | +2 |
| Especulativos | 2 | 2 | 0 |
| Total claims | 30 | 33 | +3 |
| Dominios con 0% | 2 | 3 | +1 |

**Conclusión:** El original inglés tiene peor calibración que la traducción española (-2.7pp) porque el contenido adicional (Expert Code Review Approach, conclusión extendida) añade performativos sin añadir evidencia. La única adición calibrada (ejemplos comentados como observación directa) no compensa los 2 nuevos performativos.

La traducción no degradó la calibración del original — si acaso, al omitir la sección "Expert Code Review Approach", la traducción inadvertidamente mejoró el ratio.

---

## Comparación con capítulos anteriores (serie completa)

| Capítulo | Ratio | Clasificación | Performativos % | Patrón dominante |
|----------|-------|---------------|-----------------|-----------------|
| Cap.9 | 77% | CALIBRADO | ~15% estimado | CCV — referencias arXiv |
| Cap.10 original | 65% | PARCIALMENTE CALIBRADO | ~20-25% estimado | CAD — asimetría código/advertencias |
| Cap.10 V1 (corregido) | 79% | CALIBRADO | — | — |
| Cap.10 V2 | 65.4% | PARCIALMENTE CALIBRADO | — | Efecto denominador |
| Cap.11 traducción española | 63.3% | PARCIALMENTE CALIBRADO | 30% confirmado | CAD amplificado |
| **Cap.11 original inglés** | **60.6%** | **PARCIALMENTE CALIBRADO** | **33.3% confirmado** | **CAD amplificado + contradicción interna** |

**Delta vs. Cap.9:** -16.4pp. El original tiene la mayor distancia de toda la serie respecto a Cap.9. La diferencia es estructural: Cap.9 tiene referencias arXiv que elevan múltiples claims a observación directa; Cap.11 original tiene una sola referencia (Wikipedia/SMART) y el 33% de sus claims son performativos.

**Tendencia observada:** La proporción de claims performativos aumenta capítulo a capítulo: ~15% (Cap.9) → ~20-25% (Cap.10) → 30% (Cap.11 traducción) → 33% (Cap.11 original). Esto podría indicar una tendencia en la serie, o podría ser específico de estos capítulos. Requeriría análisis de más capítulos para confirmación.

---

## Hallazgo metodológico: la contradicción interna como firma de realismo performativo

El caso C31 ("eliminate code hallucinations") representa un patrón nuevo no observado en capítulos anteriores: un claim performativo que está **contradiciéido por evidencia en el mismo documento**. Las advertencias del capítulo (C19-C23) son explícitas sobre que el LLM puede alucinar, no entender los objetivos, y tener dificultad cuando actúa como juez de su propio código. El "Expert Code Review Approach" presenta un reviewer LLM como solución que "elimina" ese problema — sin evidencia y contra la evidencia presentada en el mismo capítulo.

Esta contradicción interna es la forma más grave de realismo performativo: no es simplemente una afirmación sin evidencia, sino una afirmación que contradice la evidencia presentada en el mismo texto. Los análisis de Cap.9 y Cap.10 no encontraron este patrón. En Cap.11 original aparece una vez, con impacto Alto.

---

## Recomendación

**Clasificación: PARCIALMENTE CALIBRADO — mismo veredicto que la traducción, pero con ratio más bajo.**

Para elevar a CALIBRADO (ratio ≥75%), las acciones prioritarias del análisis de la traducción siguen vigentes, más una acción nueva de alta prioridad:

**Nueva — Alta prioridad — C31 (impacto Alto, contradicción interna):**
Reformular "eliminate code hallucinations by ensuring every suggestion is grounded in reality" → "may reduce errors by providing a separate evaluation pass." Sin benchmark, "eliminate" es indefendible. La contradicción con las advertencias del mismo capítulo hace este claim el más dañino para la credibilidad epistémica del texto.

**Heredadas del análisis de la traducción (siguen vigentes):**
1. C14 (Alto): reformular "polished, commented, and ready-to-use Python file"
2. C28 (Medio): agregar URL documentación Google ADK
3. C09, C10 (Medio): añadir disclaimer regulatorio para trading y vehículos autónomos
4. C24 (Medio): eliminar "significantly" del claim multi-agente

**Nueva — Baja prioridad — C33 (impacto Medio):**
Reformular "accountable AI systems" → "more purposeful AI systems" o "AI systems with explicit goal management." El término "accountable" requiere evidencia de mecanismos específicos de accountability ausentes del código.

Corregir C31, C14, C28, C09, C10 + ajustar C33 y C24 movería el ratio a aproximadamente 27/33 = 81.8% — sobre el umbral de CALIBRADO.
```
