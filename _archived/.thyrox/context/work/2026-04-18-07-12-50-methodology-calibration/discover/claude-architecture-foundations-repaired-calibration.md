```yml
created_at: 2026-04-18 10:40:34
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: Claude Architecture as Dynamic System — Part A v2.1 REPAIRED
ratio_calibracion_v21: 5/13 (38%)
ratio_calibracion_repaired: 8/15 (53%)
clasificacion_v21: REALISMO PERFORMATIVO
clasificacion_repaired: PARCIALMENTE CALIBRADO
status: Borrador
```

# Calibración de seguimiento: Part A v2.1 REPAIRED

Análisis previo: `discover/claude-architecture-part-a-calibration-gaps.md`
Ratio v2.1: 5/13 (38%) — REALISMO PERFORMATIVO
Ratio REPAIRED: 8/15 (53%) — PARCIALMENTE CALIBRADO

---

## PARTE 1 — Verificación de correcciones del análisis anterior

| Problema original | Resuelto | Evidencia de resolución o persistencia |
|-------------------|----------|----------------------------------------|
| P(u_0\|query)≈0.95 sin protocolo | No | No aparece en los fragmentos REPAIRED. El claim no recibió footnote ni corrección visible. Sigue sin protocolo de medición, definición de "query", ni tamaño de muestra. |
| db_t/dt≈0.02 sin fuente | Parcial | Footnote [^1] admite que `||u_t||` requiere acceso a representaciones internas. Sin embargo, `b_t` sigue sin definición de unidades y la tasa diferencial `db_t/dt` no tiene experimento citado. El footnote cubre la norma vectorial, no la tasa de cambio del belief. Corrección incompleta. |
| ᾱ≈0.83 inconsistente con tabla | Empeorado | REPAIRED introduce "fit quality: predicted d_basin^(20) ≈ 0.0089 vs observed 0.008 (<1% error)" con protocolo [^7]. Esto convierte una inconsistencia detectable en una circularidad de segundo orden: ᾱ=0.83 ajustado sobre L5, L8, L15, L20 "predice" d_basin^(20) = 0.008 sobre los mismos datos de ajuste. El <1% de error es el resultado esperado de un fit, no validación independiente. El problema empeora porque ahora tiene apariencia de evidencia. |
| Thm 2.5.1 circular / "independent of weights" | Sí | Formulación corregida: `P_ℓ(hall | h^(ℓ)) = P(h^(ℓ) ∈ B^(ℓ) | architecture, weights)`. Añade "weights" como condicionante. Footnote [^6] lo marca como "directional and theoretically motivated" con disclaimer sobre asunciones adicionales. El error crítico está resuelto; el teorema sigue siendo operacional más que demostrado, lo cual es ahora declarado. |
| Sec 4 incompleta en admitir limitaciones | Marginal | Se añade referencia "softmax concentration (Gao et al. 2021)" en Sec 4.1. Los silencios principales persisten: db_t/dt sin fuente no admitido, inconsistencia de ᾱ no mencionada, brecha de traducción Thm 5.9 (sistemas continuos → transformers discretos) no extendida. |

**Balance de correcciones:** 1/5 resueltos limpiamente (Thm 2.5.1), 1/5 mejorado marginalmente (Sec 4), 1/5 parcial (db_t/dt), 2/5 sin corrección o empeorados (P(u_0|query), ᾱ).

---

## PARTE 2 — Nuevos problemas residuales en la versión REPAIRED

### Problema nuevo A: Circularidad del fit de ᾱ=0.83

**Texto:** Sec 2.5.5 — *"Fit quality: predicted d_basin^(20) ≈ 0.0089 vs observed 0.008 (< 1% error)"*

**Análisis:** El parámetro ᾱ=0.83 se deriva de la serie de datos CAP04: d_basin en L5=0.150, L8=0.099, L15=0.027, L20=0.008, L32<0.001. Un modelo exponencial `d_basin^(ℓ) = d_0 · ᾱ^ℓ` ajustado sobre esos puntos predecirá d_basin^(20) ≈ 0.008 por construcción — ese punto está en los datos de ajuste. El <1% de error no es validación cruzada: es fit-on-training-data presentado como evidencia de un parámetro real.

**Impacto:** Alto. Este es un problema nuevo más difícil de detectar que la inconsistencia original. Un lector que no calcule la circularidad tomará ᾱ=0.83 como confirmado cuando su status epistémico no cambió.

**Clasificación:** Afirmación performativa con apariencia de evidencia (C14).

### Problema nuevo B: Protocolo de "backward pass to hidden states" no ejecutable en Claude

**Texto:** Footnote [^7] — *"h^(ℓ) vectors extracted via backward pass to hidden states. μ^(ℓ) = E[h^(ℓ) | x ∈ {empty, single-token, generic prompts}]"*

**Análisis:** Extraer hidden states de un transformer via backward pass requiere acceso a los pesos y activaciones intermedias del modelo. Este acceso existe en modelos open-source (LLaMA, Mistral, GPT-2) y en entornos de investigación con acceso privilegiado. Claude (Anthropic) no expone hidden states via API pública. El documento no especifica sobre qué modelo se ejecutó el protocolo; si CAP04 es un sistema Claude, el protocolo descrito no es replicable por ningún usuario externo. Si fue ejecutado en un proxy open-source, no hay garantía de transferibilidad a Claude. El footnote describe una metodología real del campo pero introduce un claim de procedencia no verificable.

**Impacto:** Medio-Alto. Afecta la credibilidad del protocolo que sustenta ᾱ=0.83 y μ^(ℓ).

**Clasificación:** Afirmación performativa nueva (C15) — protocolo legítimo en abstracto, no verificable en el contexto específico del documento.

### Problema nuevo C: "Residual term becomes negligible" sin cuantificación

**Texto:** Sec 2.5.1 — *"the residual term, which itself becomes negligible relative to the averaged embeddings. Thus residuals reduce but do not eliminate hallucination risk."*

**Análisis:** La dirección del claim (residuals ayudan, no eliminan) es correcta conceptualmente y concordante con la literatura. Sin embargo, "becomes negligible" es cuantitativo sin derivación: no se especifica bajo qué condición de uniformidad de softmax el residual se vuelve negligible, ni en qué magnitud relativa. Footnote [^2] admite correctamente que el análisis completo requeriría análisis espectral del Jacobiano. La admisión de la limitación convierte este claim de performativo a inferencia parcialmente calibrada: la dirección está bien, la cuantificación es hipotética y declarada como tal.

**Impacto:** Bajo (el footnote mitiga suficientemente para uso en diseño de principios).

**Clasificación:** Inferencia parcialmente calibrada — aceptable con caveat.

### Evaluación de Thm 5.9 (Cherukuri & Varshney) como "PROVEN (Peer-Reviewed)"

**Texto:** Sec 4.1 — Thm 5.9 listado como "PROVEN (Peer-Reviewed)" sin modificación.

**Análisis:** El análisis anterior clasificó esto como inferencia calibrada condicional. La versión REPAIRED no modifica el claim. La referencia Cherukuri & Varshney aparece en literatura de sistemas de control y redes neuronales; sin verificación del status de publicación (journal peer-reviewed vs arXiv preprint) el claim "Peer-Reviewed" no puede confirmarse. El problema más estructural — la brecha de traducción entre sistemas dinámicos continuos y transformers discretos con pesos finitos — tampoco fue corregido en REPAIRED. El status del claim no cambia respecto a v2.1.

---

## PARTE 3 — Tabla de usabilidad para THYROX

| Concepto | Estado v2.1 | Estado REPAIRED | Usable en THYROX | Condición de uso |
|----------|-------------|-----------------|------------------|-----------------|
| Non-stationarity T_U (sticky belief) | Inferencia calibrada | Sin cambio visible | Sí | Usar solo la dirección: separar generador de evaluador en gates. No usar magnitudes (0.02, 45 iteraciones). |
| Basin geometry (arch + weights) | Performativo ("independent of weights") | Parcialmente corregido: footnote [^5] + Thm 2.5.1 corregido para incluir weights | Sí, con caveat | Usable como principio arquitectónico: basin depende de arquitectura + pesos. Marcar como principio de diseño, no teorema demostrado. |
| Thm 3.2 exponential contraction | Inferencia calibrada condicional | Sin cambio | Sí | Mismo caveat: condicional a aplicabilidad de Thm 5.9 (Cherukuri & Varshney) a transformers discretos. Usar como dirección, no como parámetro cuantitativo. |
| Thm 3.3 \|A\|→verifiability | Inferencia calibrada | Sin cambio | Sí | AUROC 0.91 válido solo para CAP04. Usar la dirección (predicados booleanos > predicados abiertos); no usar el número. |
| Softmax concentration | Observación directa matemática | Mejorado: referencia "Gao et al. 2021" añadida en Sec 4.1 | Sí | Ahora con respaldo externo citado. Más sólido que en v2.1. El mecanismo matemático es universal. |
| Residual connections | No cubierto en v2.1 | Sec 2.5.1 con footnote [^2] | Sí, limitado | Usar dirección: residuals reducen pero no eliminan riesgo. Marcar "becomes negligible" como hipótesis no cuantificada. No usar como fundamento cuantitativo. |
| ᾱ=0.83 como parámetro numérico | Incierto (inconsistente con tabla) | Empeorado: fit circular presentado como validación | No | El fit circular hace al número más peligroso como referencia de diseño. Excluir de cualquier gate THYROX. |
| P(u_0\|query)≈0.95 | Performativo | Sin corrección | No | Sin protocolo, sin definición de "query", sin muestra. Excluir. |
| db_t/dt≈0.02 | Performativo | Corrección parcial insuficiente | No | La tasa diferencial sigue sin fuente. El footnote [^1] cubre ||u_t||, no la tasa de cambio del belief. Excluir. |

---

## Ratio de calibración REPAIRED

**Claims originales (13) + claims nuevos REPAIRED (2 = C14 circularidad, C15 protocolo):**

| Tipo | Count | Claims |
|------|-------|--------|
| Observación directa (matemática / tabla) | 3 | d_basin table, softmax math, LayerNorm cota |
| Inferencia calibrada | 2 | T_U sticky belief, Thm 3.3 |A\|→verifiability |
| Inferencia calibrada condicional | 1 | Thm 3.2 (Cherukuri & Varshney) |
| Inferencia parcialmente calibrada | 2 | ||u_1-u_0||≈0.35 con disclaimer, residuals "negligible" con [^2] |
| Inferencia no-calibrada | 1 | ᾱ=0.83 (inconsistencia original + circularidad nueva) |
| Afirmación performativa | 5 | P(u_0|query)≈0.95, db_t/dt≈0.02, convergencia ~45 it., fit circular C14, protocolo hidden states C15 |
| Especulación útil | 1 | Sec 4 admisiones parciales |

**Ratio conservador** (observaciones directas + inferencias calibradas): 6/15 = **40%**
**Ratio con inferencias parciales**: 8/15 = **53%**

Umbral para artefacto de exploración: ≥ 50%.
El ratio con inferencias parciales alcanza el umbral (53%). El ratio conservador no (40%).

**Clasificación:** PARCIALMENTE CALIBRADO — con restricciones de uso definidas abajo.

---

## Recomendación final: ¿Listo para Stage 5 STRATEGY?

**Respuesta:** Condicionalmente sí, con el mismo conjunto de conceptos del análisis anterior más un concepto añadido (basin geometry corregido).

El documento REPAIRED no está listo para usarse como fundamento cuantitativo de THYROX. Los números específicos (ᾱ, db_t/dt, P(u_0|query)) siguen sin respaldo verificable, y la corrección de ᾱ introduce circularidad nueva. Sin embargo, los conceptos estructurales — que son los que THYROX necesita para diseñar gates — tienen validez suficiente.

**Conceptos usables para Stage 5 STRATEGY (cinco, uno añadido respecto a análisis anterior):**

| # | Concepto | Aplicación en THYROX | Forma operacional |
|---|----------|---------------------|-------------------|
| 1 | Sticky belief (T_U) | Separar generador de evaluador en gates Stage 1→3 y Stage 3→5 | Checklist externa o herramienta; no auto-evaluación del agente |
| 2 | Softmax concentration | Exit criteria como predicados booleanos | `bash/grep` verificable, no "análisis suficientemente completo" |
| 3 | Contracción temprana (Thm 3.2) | Validar claims en el stage donde se producen, no diferir | Gate explícito Stage 1→3 con evidencia de fuente |
| 4 | Basin escape imposible sin intervención (LayerNorm) | Revisión interna de artefacto no es suficiente | Todo gate requiere al menos un observable de herramienta o human review |
| 5 | Basin geometry depende de arquitectura + pesos | El agente no puede "ver" sus propios basins de error desde dentro | Principio de diseño: los artefactos con coherencia interna alta requieren validación externa, no más refinamiento interno |

**Conceptos excluidos de Stage 5 (sin cambio respecto a análisis anterior + nuevos):**

| Concepto | Razón de exclusión |
|----------|-------------------|
| ᾱ=0.83 | Fit circular — número más peligroso en REPAIRED que en v2.1 |
| db_t/dt≈0.02, convergencia ~45 it. | Sin fuente primaria — propagar a gates sería propagar performatividad |
| P(u_0\|query)≈0.95 | Sin protocolo de medición |
| Protocolo "backward pass to hidden states" para Claude | No ejecutable en Claude API pública |

**Acción recomendada:** Avanzar a Stage 5 STRATEGY usando los cinco conceptos estructurales. Documentar explícitamente en el artefacto de estrategia que los parámetros numéricos del documento fuente (ᾱ, db_t/dt, ||u||, P) están excluidos y que la evidencia empírica de calibración se obtendrá en Stage 9 PILOT mediante auditoría del historial de WPs (Claims A-C del análisis anterior).
