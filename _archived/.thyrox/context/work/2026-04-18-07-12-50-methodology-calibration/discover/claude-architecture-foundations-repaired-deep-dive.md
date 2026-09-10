```yml
created_at: 2026-04-18 10:38:57
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM: FORMAL ANALYSIS — PART A v2.1 REPAIRED (2026-04-18)"
veredicto_síntesis: PARCIALMENTE VÁLIDO — dos problemas críticos resueltos (CONTRADICCIÓN-2, CONTRADICCIÓN-5); tres problemas críticos nuevos introducidos por las correcciones mismas; nueve problemas anteriores persisten; reclamación "AUDITED & CORRECTED - Ready for PART B" no respaldada
saltos_lógicos: 6 (4 persistentes + 2 nuevos)
contradicciones: 7 (3 persistentes sin cambio + 2 parcialmente modificadas + 2 nuevas)
engaños_estructurales: 7 (5 persistentes/transformados + 2 nuevos)
capas_adicionales: 3 (Probabilística Thm 2.5.1 + Comparativa v2.1→REPAIRED + Verificación de reclamaciones de corrección)
referencia_análisis_previo: discover/claude-architecture-part-a-deep-dive.md
```

# Deep-Dive (9 capas): Claude Architecture Part A v2.1 REPAIRED

> Análisis adversarial de la versión corregida. 6 capas obligatorias + 3 adicionales:
> (7) Thm 2.5.1 — evaluación de corrección; (8) Comparativa v2.1 → REPAIRED;
> (9) Verificación de reclamaciones de corrección ("AUDITED & CORRECTED - Ready for PART B").
> Lee en conjunto con `claude-architecture-part-a-deep-dive.md` (análisis de v2.1 original).

---

## CAPA 1: LECTURA INICIAL — Qué dice el documento REPAIRED

El documento v2.1 REPAIRED mantiene la misma estructura que v2.1 con cuatro tipos de cambios
identificables:

1. **Footnote [^7] añadido** (Sec 2.5.5): intenta proveer protocolo de medición para d_basin,
   H_attn, ν_dead — "h^(ℓ) vectors extracted via backward pass to hidden states."
2. **Footnote [^2] añadido** (Sec 2.5.1): admite que el análisis completo de residuals +
   basin geometry requeriría "Jacobian spectral analysis" que está "beyond PART A scope."
3. **Thm 2.5.1 tiene nueva "Operational Definition" [^6]**: reformula la probabilidad de
   alucinación como insensibilidad del output al input; [^6] admite que el teorema es
   "directional and theoretically motivated."
4. **Footnote [^5] añadido** (Sec 2.5.5): admite que "Training determines basin location
   μ^(ℓ), basin radius r, and contraction rate α_ℓ" — corrigiendo la afirmación anterior
   de que training solo mueve μ^(ℓ).

La tesis estructural no cambia: transformer architecture → basin attractors → hallucination
inevitable → cuantificado por Thm 2.5.1 → evidenciado en tabla layer-by-layer.

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

| Framework | Validez en su dominio | Estado en REPAIRED |
|-----------|----------------------|--------------------|
| Transformer mechanics (Sec 2.5.1) | Correcto — estándar | Sin cambio, correcto |
| Softmax concentración (Prop 1, [^3]) | Correcto | Sin cambio, correcto |
| GELU nonlinearity (Prop 2, [^4]) | Correcto | Sin cambio, correcto |
| LayerNorm acota norma (Prop 3) | Correcto pero incompleto | Sin cambio — SALTO-3 persiste |
| Cherukuri & Varshney Thm 5.9 (Sec 3.2) | Preprint arXiv, no peer-reviewed | Sin cambio — mislabeling persiste |
| Residual connections (Sec 2.5.1) | Descripción correcta | NUEVO — introduce SALTO-NUEVO-1 |

### Sub-capa B: Aplicaciones concretas

| Aplicación | Tipo | Estado en REPAIRED |
|-----------|------|--------------------|
| h^(ℓ) accesibles via "backward pass" [^7] | NUEVA | Introduce CONTRADICCIÓN-NUEVA-1 |
| Residuals "reduce but do not eliminate" [^2] | NUEVA | Plausible pero no derivada — SALTO-NUEVO-1 |
| "Operational Definition" hallucination probability [^6] | NUEVA | Parcialmente útil — Capa 7 |
| ᾱ ≈ 0.83 como promedio CAP04 | Sin cambio | SALTO-1 persiste + "fit quality" empeora |

### Sub-capa C: Números específicos

| Valor | Presentado como | Estado en REPAIRED |
|-------|----------------|--------------------|
| d_basin^(ℓ) tabla Sec 2.5.5 | "Empirical" via [^7] | Protocolo añadido — inaplicable a Claude |
| "predicted ≈ 0.0089 vs observed 0.008 (<1% error)" | "Fit quality" | NUEVO — circularidad de validación |
| db_t/dt ≈ 0.02 (Sec 2.3) | "Quantitative Evidence" | SIN CAMBIO — sin fuente |
| \|\|u_1 - u_0\|\|_2 ≈ 0.35 (Sec 2.3) | "Belief drift" | SIN CAMBIO — sin protocolo |
| t_convergence ≈ 45 (Sec 2.3) | "Time to convergence" | SIN CAMBIO |

### Sub-capa D: Afirmaciones de garantía

| Garantía | Estado en REPAIRED |
|---------|-------------------|
| "Hallucination is inevitable" (Sec 2.5.3) | SIN CAMBIO — persiste |
| "Residuals reduce but do not eliminate hallucination risk" [^2] | NUEVA — no derivada formalmente |
| "fit quality: <1% error" (Sec 2.5.5) | NUEVA — circularidad, no validación |
| "Architecture ensures basin existence" (Sec 2.5.3/[^5]) | NUEVA TENSIÓN con "training determines α_ℓ" |

---

## CAPA 3: SALTOS LÓGICOS

### SALTO-1 (PERSISTE + EMPEORADO): ᾱ = 0.83 → "fit quality" circular como corrección

**Ubicación:** Sec 2.5.5, mecanismo + nota de fit quality
**Corrección intentada:** "Fit quality: predicted d_basin^(20) ≈ 0.0089 vs observed 0.008
(< 1% error)."
**Por qué NO resuelve el problema:** El "fit quality" compara una predicción del modelo
(d_0 × ᾱ^(20-5)) contra los "datos observados" de la tabla. Pero ᾱ = 0.83 fue calibrado
usando los datos de esa misma tabla. Validar contra los datos de calibración no es
validación — es bondad del ajuste. El <1% error no mide generalización.
**Además:** ᾱ sigue sin restricción de dominio — no se especifica que aplica solo a
tareas de element counting tipo CAP04.
**Estado: NO RESUELTO — empeorado.** La nota de "fit quality" agrega apariencia de
validación sin validación real.
**Tamaño:** CRÍTICO.

### SALTO-2 (PERSISTE): GELU dead neurons → larger basin volume

**Ubicación:** Sec 2.5.2, Property 2
**Estado:** Idéntico a v2.1. No hay derivación de la relación ν_dead → radio del basin.
Persiste como heurística sin formalización.
**Tamaño:** MEDIO.

### SALTO-3 (PERSISTE): LayerNorm acota ‖h‖₂ → "prevents escape" del basin

**Ubicación:** Sec 2.5.2, Property 3
**Estado:** Texto idéntico a v2.1. La confusión entre acotar ‖h^(ℓ+1)‖₂ y acotar
‖h^(ℓ+1) - μ^(ℓ+1)‖₂ persiste. El footnote [^2] admite que el análisis Jacobiano
está fuera del scope, pero no retracta "LayerNorm prevents escape."
LayerNorm acota la norma del vector completo. Si μ^(ℓ+1) está lejos del origen,
un h con norma acotada puede estar lejos del centroid. Son métricas distintas en ℝ^d.
**Tamaño:** CRÍTICO.

### SALTO-4 (PERSISTE): Los 3 mecanismos "jointly create" basin structure

**Ubicación:** Sec 2.5.3
**Estado:** Sin cambio. La conjunción no está derivada. Que tres mecanismos contribuyan
al fenómeno no demuestra que su conjunción garantiza basin en el sentido formal de
Thm 5.9 (contractividad radial con α_ℓ < 1 uniforme sobre el basin).
**Tamaño:** CRÍTICO.

### SALTO-NUEVO-1: Residuals "reduce but do not eliminate" hallucination risk

**Ubicación:** Sec 2.5.1, footnote [^2]
**Premisa:** El párrafo argumenta que residuals preservan la señal de input y offset
la concentración atencional. Concluye: "residuals dampen but do not eliminate
hallucinatory collapse."
**Problema:** El mismo footnote [^2] admite que "complete analysis would require
Jacobian spectral analysis of the residual + attention composition, which is beyond
PART A scope." El documento afirma el resultado que admite no haber derivado.
La conclusión es plausible cualitativamente pero se presenta como resultado establecido.
**Tipo de salto:** Afirmación cuantitativa ("reduce") sin derivación — el footnote
descarga la derivación a trabajo fuera de scope.
**Tamaño:** MEDIO.

### SALTO-NUEVO-2: "fit quality: <1% error" como validación del modelo de contracción

**Ubicación:** Sec 2.5.5, mecanismo
**Premisa:** El modelo exponencial d_0 × ᾱ^(ℓ-ℓ_0) "predice" d_basin^(20) ≈ 0.0089
cuando el observado es 0.008 (<1% error).
**Conclusión implícita:** El modelo de contracción es válido para Claude.
**Problema:** Sin especificar si la capa 20 fue parte del conjunto de calibración de ᾱ
o del conjunto de validación, el error <1% no dice nada sobre generalización. Si ᾱ = 0.83
fue ajustado incluyendo el punto de capa 20, la comparación es trivialmente buena.
Para que "<1% error" sea evidencia de validez, el documento debería especificar
leave-one-out o validación cruzada explícita.
**Tipo de salto:** Circularidad de validación presentada como evidencia.
**Tamaño:** CRÍTICO.

---

## CAPA 4: CONTRADICCIONES

### CONTRADICCIÓN-1 (PARCIALMENTE CORREGIDA → NUEVA FORMA): h^(ℓ) y [^7] vs Sec 4.2

**Estado en v2.1:** Datos de d_basin como "empirical" sin método; Sec 4.2 admite h^(ℓ)
inobservable.
**Corrección en REPAIRED:** [^7] provee protocolo: "h^(ℓ) vectors extracted via backward
pass to hidden states."
**Problema que persiste:** "Backward pass to hidden states" requiere acceso al grafo
computacional interno del modelo. Para Claude (API pública), Sec 4.2 admite "Only logits
visible." El protocolo de [^7] es válido para modelos open-weights; no aplica a Claude.
La corrección reemplaza "datos sin método" por "datos con método imposible para el
caso de estudio."
**Estado: PARCIALMENTE CORREGIDA en forma — NO RESUELTA en sustancia.**

### CONTRADICCIÓN-2 (RESUELTA): "independent of training weights"

**Estado en v2.1:** Thm 2.5.1 decía "This probability is deterministic given architecture,
independent of training weights."
**Corrección en REPAIRED:** La frase fue eliminada. Reemplazada por Operational
Definition [^6] que reformula la probabilidad como insensibilidad del output. [^6] admite
que el teorema es "directional and theoretically motivated."
**Estado: RESUELTA — el claim específico fue eliminado. Persiste pseudomatemática
estructural en forma atenuada (ver CAPA 7).**

### CONTRADICCIÓN-3 (NO CORREGIDA): arXiv como "Peer-Reviewed"

**Ubicación:** Sec 4.1, "✓ PROVEN: Thm 5.9..."
**Estado:** Sin cambio en REPAIRED. Los papers de Cherukuri & Varshney siguen bajo
la etiqueta de "PROVEN" junto con papers peer-reviewed, cuando arXiv es un servidor
de preprints — no peer-review.

### CONTRADICCIÓN-4 (NO CORREGIDA): "Inevitable" vs "if near basin centroid"

**Afirmación A (Sec 2.5.3 título):** "Why Hallucination is Inevitable (Not Accidental)"
**Afirmación B (Sec 2.5.2, Prop 1):** "if near basin centroid → hallucination begins"
**Estado:** Sin cambio. "Inevitable" es incondicional. El mecanismo es condicional.
La contradicción no fue corregida.

### CONTRADICCIÓN-5 (CORREGIDA → INTRODUCE NUEVA TENSIÓN)

**Estado en v2.1:** "Different training only shifts μ^(ℓ) location; basin geometry is
determined by the architecture."
**Corrección en REPAIRED:** Footnote [^5] ahora dice "Training determines basin location
μ^(ℓ), basin radius r, and contraction rate α_ℓ." Esto es más correcto.
**Nueva tensión introducida:** Si training determina α_ℓ, entonces la garantía de
"basin existence" (que requiere α_ℓ < 1) también depende del training. Pero Sec 2.5.3
dice "Architecture (Attn ∘ FFN ∘ LayerNorm) ensures basin existence" — esto ya no
puede ser solo de la arquitectura si α_ℓ depende del training.
**Estado: CORREGIDA la afirmación específica. INTRODUCE CONTRADICCIÓN-NUEVA-2.**

### CONTRADICCIÓN-NUEVA-1: [^7] "backward pass" vs Sec 4.2 "Only logits visible"

**Afirmación A ([^7], Sec 2.5.5):**
> "h^(ℓ) vectors extracted via backward pass to hidden states."

**Afirmación B (Sec 4.2):**
> "Hidden State Access: Only logits visible"

**Por qué chocan:** "Backward pass to hidden states" requiere acceso al grafo
computacional del modelo — exactamente lo que Sec 4.2 admite no tener para Claude.
Esta contradicción no existía en v2.1 — fue introducida por la corrección misma.
**Cuál prevalece:** Sec 4.2 es correcto para Claude API. [^7] describe un protocolo
válido para modelos open-weights pero no para el caso de estudio del documento.
**Severidad: CRÍTICA.**

### CONTRADICCIÓN-NUEVA-2: "Architecture ensures basin existence" vs "Training determines α_ℓ"

**Afirmación A (Sec 2.5.3 + [^5]):**
> "Architecture (Attn ∘ FFN ∘ LayerNorm) ensures basin existence and rough exponential
> contraction structure."

**Afirmación B ([^5], Sec 2.5.5):**
> "Training determines basin location μ^(ℓ), basin radius r, and contraction rate α_ℓ."

**Por qué chocan:** La garantía de "basin existence" en el sentido formal de Thm 5.9
requiere α_ℓ < 1. Si α_ℓ es determinado por training, entonces la existencia del basin
no está garantizada por la arquitectura sola — depende de que el training produzca
α_ℓ < 1, lo cual puede o no ocurrir.
**Cuál prevalece:** [^5] es más preciso. La afirmación de Sec 2.5.3 debería decir
"Architecture creates the structural conditions for basin formation" — no que lo garantiza.
**Severidad: MEDIA.**

---

## CAPA 5: ENGAÑOS ESTRUCTURALES

### E-1 (PERSISTE): Credibilidad prestada — conjunción de 3 mecanismos sin derivación

Sin cambio. Softmax + GELU + LayerNorm individualmente correctos; conjunción → basin
presentada sin derivación formal. El lector verifica las partes y asume que el todo
está derivado.

### E-2 (ATENUADO): Pseudomatemática de Thm 2.5.1

**Cambio:** Operational Definition [^6] y admisión "directional and theoretically motivated"
atenúan el engaño. Ya no se afirma "deterministic, independent of training weights."
Sin embargo, el número de teorema, la notación formal (P_ℓ(hall | h^(ℓ)) = ...), y la
ausencia de proof permanecen. El lector que no lee [^6] verá "Theorem 2.5.1" sin proof.
**Estado: ATENUADO — no eliminado.**

### E-3 (TRANSFORMADO): "Datos sin método" → "datos con método inaplicable"

**Antes (v2.1):** Tabla de h^(ℓ) presentada como "empirical" sin protocolo de medición;
limitación enterrada en Sec 4.2.
**Ahora (REPAIRED):** [^7] provee protocolo "backward pass to hidden states" — pero ese
protocolo requiere acceso imposible para Claude. La corrección transforma el engaño:
el lector que no verifica la viabilidad del protocolo cree que los datos son reales.
El efecto epistémico es similar o peor: antes el lector escéptico podía preguntar "¿cómo
se midió?"; ahora el documento responde con un método aparentemente técnico.

### E-4 (PERSISTE): "Inevitable" como encuadre retórico

Sin cambio. Título de Sec 2.5.3 sigue siendo "Why Hallucination is Inevitable
(Not Accidental)." El encuadre como "inevitable" reduce el umbral de evidencia del lector
antes de que los mecanismos se presenten.

### E-5 (INTENSIFICADO): Tabla con formato experimental → ahora con protocolo formal

El footnote [^7] agrega estructura metodológica a la tabla. Esto intensifica el engaño
estructural: la tabla ya tenía formato de datos experimentales; ahora además tiene
metodología descrita con términos técnicos ("backward pass", "gradient-based access",
"GELU output below threshold"). El lector sin conocimiento de que Claude no provee
acceso a estados internos creerá que el protocolo fue ejecutado.

### E-6 (PERSISTE): Sec 4 como auditoría epistémica incompleta

Sec 4 sigue sin identificar:
- La circularidad de validación de ᾱ (la nota "fit quality" la oscurece más que la revela)
- La CONTRADICCIÓN-NUEVA-1 ([^7] vs Sec 4.2)
- La tensión entre "architecture ensures basin existence" y "training determines α_ℓ"
- El problema de pseudomatemática residual en Thm 2.5.1

### E-NUEVO-1: "Fit quality" como validación performativa

**Patrón:** Presentar la bondad del ajuste de un modelo sobre sus datos de calibración
como evidencia de validez del modelo.
**Ubicación:** Sec 2.5.5: "Fit quality: predicted d_basin^(20) ≈ 0.0089 vs observed
0.008 (< 1% error)."
**Cómo opera:** El número "<1% error" activa la heurística cognitiva de validación
experimental. Sin especificar si el punto de validación fue parte del conjunto de
calibración de ᾱ, la comparación no dice nada sobre generalización. Este engaño
es nuevo en REPAIRED.

### E-NUEVO-2: "AUDITED & CORRECTED - Ready for PART B" sin auditoría completa

**Patrón:** El sello "AUDITED & CORRECTED" implica que un proceso de auditoría exhaustivo
fue completado y todas las correcciones necesarias aplicadas.
**Cómo opera:** Un lector que confíe en el sello leerá PART A como base válida sin
revisar los problemas persistentes. El sello crea una licencia de confianza que no
está respaldada por el estado real del documento.
**Evidencia:** 9 de 12 problemas identificados en el análisis de v2.1 persisten
sin corrección. 6 nuevos problemas fueron introducidos por las correcciones.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO (sin cambio respecto a análisis anterior)

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| Arquitectura transformer correctamente descrita (Sec 2.5.1) | Descripción estándar | Vaswani et al. 2017 |
| Softmax → distribución uniforme con inputs genéricos | Propiedad matemática del softmax | Definición de softmax |
| GELU tiene zonas donde GELU(x) ≈ 0 | Análisis estándar de GELU(x) = x·Φ(x) | Hendrycks & Gimpel (2016) |
| LayerNorm acota ‖h‖₂ | Consecuencia de normalización | Ba et al. 2016 |
| Residuals preservan la señal de input (Sec 2.5.1) | He et al. 2016 | Arquitectura ResNet estándar |
| Contractividad radial del Thm 5.9 es consistente si precondiciones se cumplen | Cherukuri & Varshney (preprint) | Matemáticamente coherente |

### FALSO (como presentado) — actualizado para REPAIRED

| Claim | Por qué es falso | Evidencia |
|-------|-----------------|-----------|
| Tabla 2.5.5 como "empirical" de d_basin para Claude | [^7] describe "backward pass" imposible para Claude API | CONTRADICCIÓN-NUEVA-1 + Sec 4.2 |
| "Fit quality: <1% error" como validación del modelo | Es bondad del ajuste sobre datos de calibración | SALTO-NUEVO-2 — circularidad |
| LayerNorm "prevents escape" del basin (Prop 3) | ‖h‖₂ acotada ≠ ‖h - μ‖₂ acotada — métricas distintas | SALTO-3 — persiste |
| arXiv papers "PROVEN (Peer-Reviewed)" | arXiv es servidor de preprints | CONTRADICCIÓN-3 — persiste |
| "Hallucination is inevitable" (sin condiciones) | Los propios mecanismos incluyen "if near basin centroid" | CONTRADICCIÓN-4 — persiste |
| Residuals "dampen" hallucination (cuantitativamente afirmado) | [^2] admite que requiere Jacobian spectral analysis no realizado | SALTO-NUEVO-1 |
| \|\|u_1 - u_0\|\|_2 ≈ 0.35 como "belief drift" medido | u_t no es observable; sin protocolo | SALTO-8 de v2.1 — persiste |
| "AUDITED & CORRECTED - Ready for PART B" | 9/12 problemas anteriores persisten; 6 nuevos introducidos | E-NUEVO-2 |

### INCIERTO — actualizado para REPAIRED

| Claim | Por qué no es verificable | Qué necesitaría para resolverse |
|-------|--------------------------|--------------------------------|
| α_ℓ valores de la tabla | Derivados de d_basin inaccesible para Claude | Acceso a weights open-source + protocolo de inferencia |
| ᾱ ≈ 0.83 representativo para Claude en general | Calibrado en UNA tarea; fit quality circular | ≥10 dominios con validación cruzada real |
| "Architecture ensures basin existence" | Depende de α_ℓ < 1, que [^5] admite determina el training | Derivar condiciones bajo las cuales training produce α_ℓ < 1 |
| Residuals reducen riesgo de hallucination | [^2] admite que requiere Jacobian spectral analysis | Análisis Jacobiano o ablation study |
| db_t/dt ≈ 0.02 | Sin fuente ni protocolo | Experimento controlado con protocolo publicado |

### Patrón dominante en REPAIRED

**Corrección cosmética que transforma problemas sin eliminarlos.**

Las correcciones intentan satisfacer formalmente las críticas —agregar protocolo de
medición, reformular Thm 2.5.1, agregar "fit quality"— pero cada corrección introduce
una nueva contradicción o transforma un problema existente en uno de diferente naturaleza.

- "Datos sin método" → "datos con método inaplicable al caso de estudio"
- "Parámetro sin validación" → "parámetro con validación circular"
- "Deterministic, independent of weights" → "directional and theoretically motivated"
  (con el número de teorema intacto y sin proof)

El resultado neto es más problemas de los que se resuelven.

---

## CAPA 7: ANÁLISIS DE THM 2.5.1 REPAIRED — ¿Resuelve CONTRADICCIÓN-2?

### Qué cambió en Thm 2.5.1

**v2.1:** "Key Point: This probability is deterministic given architecture, independent
of training weights."

**REPAIRED:** "Operational Definition [^6]: Hallucination probability is the probability
that the model's output is insensitive to input token identity."
"[^6]: Theorem 2.5.1 is directional and theoretically motivated. Precise operational
form requires additional assumptions about basin radius r and insensitivity threshold ε."

### Evaluación de la corrección

**Lo que resuelve:** La afirmación "deterministic, independent of training weights" fue
eliminada. CONTRADICCIÓN-2 del análisis anterior está resuelta en su forma específica.

**Problema A (persiste):** El Operational Definition reformula la probabilidad como
"output insensitivity to input token identity" — útil conceptualmente, pero sigue sin
ser un teorema. [^6] admite que "precise operational form requires additional assumptions"
— es decir, el teorema no tiene forma operacional precisa. La notación "Theorem 2.5.1"
sigue siendo inapropiada.

**Problema B (persiste):** La Operational Definition no es computable sin un umbral ε
de insensibilidad y una distribución de referencia sobre inputs. El footnote [^6] admite
esto pero no resuelve la necesidad operacional.

**Problema C (nuevo):** La Operational Definition cambia la semántica de "hallucination."
En el resto del documento, hallucination refiere a outputs incorrectos respecto a hechos.
La nueva definición refiere a insensibilidad al input — que es condición suficiente para
alucinación en ciertos contextos, pero no equivalente: un modelo podría ser insensible
al input y aun así producir el output correcto (si el basin coincide con la respuesta
correcta). Este cambio semántico no anunciado crea inconsistencia con el resto del documento.

---

## CAPA 8: COMPARATIVA V2.1 → REPAIRED

### Tabla completa de estado por problema

| Problema identificado en análisis de v2.1 | Estado en REPAIRED | Evaluación |
|------------------------------------------|-------------------|------------|
| CONTRADICCIÓN-2: "independent of training weights" | Eliminado del cuerpo | RESUELTO — pseudomatemática estructural persiste atenuada |
| CONTRADICCIÓN-5: "training only shifts μ^(ℓ)" | Corregido en [^5]: training determina r y α_ℓ | RESUELTO — introduce CONTRADICCIÓN-NUEVA-2 |
| SALTO-3: LayerNorm bounds ‖h‖₂ ≠ bounds ‖h−μ‖₂ | Sin cambio | NO RESUELTO |
| SALTO-1: ᾱ = 0.83 como constante universal | "Fit quality" añadido pero circular | NO RESUELTO — empeorado |
| CONTRADICCIÓN-1: h^(ℓ) inaccesible vs tabla | [^7] añadido con protocolo imposible para Claude | PARCIALMENTE RESUELTO en forma, NO en sustancia |
| E-2: Pseudomatemática Thm 2.5.1 | Atenuado por [^6] y "directional" | ATENUADO — no eliminado |
| E-3: Limitación enterrada | [^7] provee protocolo inaplicable | TRANSFORMADO en nuevo engaño |
| CONTRADICCIÓN-3: arXiv = peer-reviewed | Sin cambio | NO RESUELTO |
| CONTRADICCIÓN-4: "inevitable" vs "if" condicional | Sin cambio | NO RESUELTO |
| db_t/dt ≈ 0.02 sin fuente (Sec 2.3) | Sin cambio | NO RESUELTO |
| \|\|u_1 - u_0\|\|_2 ≈ 0.35 sin protocolo (Sec 2.3) | Sin cambio | NO RESUELTO |
| t_convergence ≈ 45 sin fuente (Sec 2.3) | Sin cambio | NO RESUELTO |

### Problemas nuevos introducidos por REPAIRED

| Problema nuevo | Origen | Severidad |
|----------------|--------|-----------|
| CONTRADICCIÓN-NUEVA-1: [^7] "backward pass" vs Sec 4.2 "only logits" | Corrección de CONTRADICCIÓN-1 | CRÍTICA |
| CONTRADICCIÓN-NUEVA-2: "architecture ensures basin" vs "training determines α_ℓ" | Corrección de CONTRADICCIÓN-5 | MEDIA |
| SALTO-NUEVO-1: Residuals "dampen" — afirmado sin derivación | Nuevo contenido en Sec 2.5.1 | MEDIO |
| SALTO-NUEVO-2: "Fit quality <1% error" circular | Corrección de SALTO-1 | CRÍTICO |
| E-NUEVO-1: "Fit quality" como validación performativa | Ídem | CRÍTICO |
| E-NUEVO-2: "AUDITED & CORRECTED" sin auditoría completa | Sello del documento | CRÍTICO |
| Cambio semántico en Operational Definition (insensitivity ≠ hallucination) | Corrección de Thm 2.5.1 | MEDIO |

### Ratio de mejora vs. regresión

- Problemas resueltos o atenuados: 3 de 12 (CONTRADICCIÓN-2 resuelta, CONTRADICCIÓN-5
  corregida con nueva tensión, E-2 atenuado)
- Problemas NO resueltos: 9 de 12 persistentes
- Problemas nuevos introducidos: 7 nuevos

**Net result:** El documento REPAIRED resuelve 2 problemas críticos identificados en v2.1
a cambio de introducir 3 nuevos problemas críticos y 4 problemas medios. No es una
mejora neta respecto a v2.1.

---

## CAPA 9: VERIFICACIÓN DE RECLAMACIONES DE CORRECCIÓN

El documento lleva el sello "AUDITED & CORRECTED - Ready for PART B".

### ¿Qué fue auditado?

La evidencia visible del proceso de auditoría son los footnotes añadidos ([^2], [^5],
[^6], [^7]) y la eliminación de "independent of training weights." La auditoría se
focalizó en:
- Thm 2.5.1 (→ [^6])
- Training y basin geometry (→ [^5])
- Protocolo de medición de la tabla (→ [^7])
- Análisis de residuals (→ [^2])

### ¿Qué NO fue auditado?

- ᾱ = 0.83 como universal (solo se añadió "fit quality" circular)
- LayerNorm bounds confusión (SALTO-3 — sin cambio)
- Conjunción de 3 mecanismos sin derivación (SALTO-4 — sin cambio)
- Encuadre "inevitable" (CONTRADICCIÓN-4 — sin cambio)
- arXiv = peer-reviewed (CONTRADICCIÓN-3 — sin cambio)
- Todos los números de Sec 2.3 (sin cambio)
- Pseudomatemática estructural de Thm 2.5.1

### ¿Está "Ready for PART B"?

El documento tiene problemas críticos no resueltos que afectarán cualquier análisis
que PART B construya sobre él:

1. **Tabla de Sec 2.5.5:** Los valores d_basin, α_ℓ, H_attn, ν_dead no son datos de
   Claude — el protocolo de [^7] no aplica a la API de Claude. Si PART B usa esos valores
   como parámetros del sistema, construirá sobre datos que no son de Claude.

2. **ᾱ = 0.83:** La validación circular del "fit quality" no resuelve el problema de
   generalización. Si PART B usa ᾱ como parámetro, hereda la falta de evidencia de
   generalización más la apariencia de validación.

3. **Thm 2.5.1:** Sigue sin ser un teorema — si PART B lo cita como fundamento formal,
   hereda la pseudomatemática.

4. **CONTRADICCIÓN-NUEVA-1:** El protocolo de medición ([^7]) que REPAIRED introdujo
   para justificar los datos de la tabla contradice las propias limitaciones del documento.
   PART B que cite "datos del análisis de PART A" hereda una base de datos cuyo protocolo
   es autocontradictorio.

**Conclusión:** "AUDITED & CORRECTED" es inexacto. La auditoría fue parcial y focalizó
en 4 de los 12 problemas identificables. "Ready for PART B" es prematuro para cualquier
análisis que use la tabla de Sec 2.5.5, ᾱ = 0.83, o Thm 2.5.1 como fundamentos.

---

## Resumen ejecutivo para uso en THYROX

### Qué resolvió REPAIRED (y puede usarse con la nueva restricción)

1. **CONTRADICCIÓN-2 resuelta:** Ya no se afirma que la probabilidad de hallucination es
   "deterministic given architecture, independent of training weights." La reformulación
   como "directional and theoretically motivated" es apropiada y más honesta.

2. **CONTRADICCIÓN-5 corregida:** [^5] ahora admite que training determina r y α_ℓ, no
   solo μ^(ℓ). Esto es una corrección real y aprovechable como principio: el entrenamiento
   afecta la geometría completa del basin, no solo su centro.

3. **Descripción de residuals (Sec 2.5.1):** El texto sobre cómo los residuals preservan
   la señal de input es correcto y útil — con la aclaración de que "dampen but do not
   eliminate" es una hipótesis plausible, no un resultado derivado.

### Qué persiste como prohibido en THYROX

Los mismos items prohibidos del análisis de v2.1 siguen vigentes, con nota de que
algunos ahora tienen presentación diferente:

- ❌ ᾱ ≈ 0.83 como parámetro universal — la nota "fit quality" no lo valida
- ❌ d_basin, α_ℓ, H_attn, ν_dead de la tabla 2.5.5 como datos de Claude — el
  protocolo de [^7] no aplica a la API de Claude
- ❌ "fit quality: <1% error" como evidencia de validez del modelo de contracción
- ❌ Thm 2.5.1 como teorema — sigue siendo definición conceptual sin proof
- ❌ "Hallucination is inevitable" como claim incondicional
- ❌ "Architecture ensures basin existence" sin calificar que α_ℓ < 1 depende del training
- ❌ Cherukuri & Varshney como "peer-reviewed" — siguen siendo preprints arXiv
- ❌ db_t/dt ≈ 0.02, ||u_1 - u_0||_2 ≈ 0.35, t_convergence ≈ 45 — sin fuente

### Principios cualitativos aprovechables (sin cambio respecto a análisis anterior)

> **Principio 1:** Los modelos de lenguaje muestran resistencia a actualizar su comprensión
> implícita de la tarea bajo feedback incremental.
>
> **Principio 2:** Tareas con espacio de respuesta más pequeño son más verificables.
>
> **Principio 3:** El mismo agente que genera no puede auto-validar.
>
> **Principio 4 (nuevo — de REPAIRED):** El entrenamiento afecta la geometría completa del
> basin (radio, coeficiente de contracción) — no solo la ubicación del centroid. Por tanto,
> modelos con diferente entrenamiento pueden tener geometrías de basin distintas, no solo
> basins desplazados.

Estos cuatro principios tienen respaldo independiente del documento y pueden usarse en
THYROX sin las restricciones numéricas del documento.
