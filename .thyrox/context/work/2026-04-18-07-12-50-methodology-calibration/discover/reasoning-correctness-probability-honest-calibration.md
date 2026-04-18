```yml
created_at: 2026-04-18 11:12:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
```

# Calibración de claims: Part B Honest Edition v2.1

## Ratio de calibración: 9/14 (64%)
## Clasificación: PARCIALMENTE CALIBRADO

**Baseline de comparación:**
| Versión | Ratio | Clasificación |
|---------|-------|---------------|
| Part B original | 1/12 (8%) | REALISMO PERFORMATIVO severo |
| **Part B Honest Edition v2.1** | **9/14 (64%)** | **PARCIALMENTE CALIBRADO** |

La Honest Edition mejora el ratio de 8% a 64% — mejora real y sustancial. Sin embargo, el mecanismo de mejora es **documentar las brechas, no resolverlas**. Esto tiene consecuencias importantes para la usabilidad en THYROX que se detallan en las secciones siguientes.

---

## Sección 1 — Clasificación de cada claim

### Taxonomía aplicada

| Categoría | Definición |
|-----------|------------|
| **CALIBRADO** | El nivel de confianza declarado es congruente con la evidencia citada |
| **SOBRE-DECLARADO** | El documento declara PROVEN o INFERRED pero la evidencia real es más débil |
| **BAJO-DECLARADO** | El documento declara SPECULATIVE pero hay más evidencia de la que reconoce |
| **GAP** | El claim necesita evidencia adicional antes de ser usable en decisiones THYROX |

---

### Claim 1 — Regla de cadena de entropía (Sección 4.1)

**Texto:** `H(R, A | Q) = H(R | Q) + H(A | Q) - I(R, A | Q)` — etiqueta: PROVEN

**Clasificación: CALIBRADO**

La regla de cadena de entropía es un resultado estándar de teoría de la información (Cover & Thomas, *Elements of Information Theory*, Thm. 2.2.1). Matemáticamente necesaria, no empíricamente contingente. La etiqueta PROVEN es exactamente correcta.

**Evidencia observable existente:** Resultado estándar en literatura canónica.
**Acción requerida:** Ninguna.

---

### Claim 2 — Cálculo de componentes para CAP04 (Sección 4.3)

**Texto:** `H(R|Q) = 2.09 bits, H(A|Q) = 0.88 bits, I(R,A|Q) = 0.05 bits, H(R,A|Q) = 2.92 bits` — etiqueta: PROVEN - COMPUTATION ONLY con caveat: "Probabilities estimated from outputs and hidden state patterns. Not directly measured."

**Clasificación: SOBRE-DECLARADO**

La aritmética `2.09 + 0.88 - 0.05 = 2.92` es correcta (PROVEN). Pero los inputs —las probabilidades P(Rᵢ|Q) y P(Aⱼ|Q)— son estimaciones sin protocolo operacional definido. El caveat del documento admite esto parcialmente ("estimated from outputs and hidden state patterns") pero:

1. No define la partición {R₁, R₂, ...} de los reasoning paths
2. No especifica el método de estimación desde "output patterns"
3. No cuantifica el intervalo de confianza en H dado la incertidumbre en las probabilidades

Etiquetar el resultado final como PROVEN cuando los inputs son estimaciones sin protocolo convierte la etiqueta en misleading. El cálculo es PROVEN-given-inputs, pero los inputs son INFERRED-at-best. El resultado compuesto debería ser INFERRED, no PROVEN.

**Gap resultante:** Los valores numéricos específicos (2.09, 0.88, 0.05, 2.92) no son verificables ni reproducibles sin el protocolo de estimación de probabilidades.

**Evidencia observable propuesta:** Definir la partición {Rᵢ} con criterios textuales verificables. Ejemplo: "R₁ = razonamiento que menciona al menos una fuente" → `grep -c "según\|citando\|referencia" reasoning_output.txt`. Con partición operacional, H es computable.

---

### Claim 3 — Correlación H alto con alucinación en CAP04/05 (Sección 4.2)

**Texto:** "High H(R,A|Q) correlates with hallucination in CAP04/05. Generalization untested." — etiqueta: INFERRED from 2 Examples

**Clasificación: CALIBRADO**

Esta es la instancia de mayor honestidad del documento. El claim declara exactamente lo que tiene: correlación observada en N=2, sin pretensión de causalidad ni generalización. La etiqueta INFERRED es apropiada. El calificador "from 2 Examples" es el dato correcto.

**Acción requerida:** Ninguna en este claim. Para uso en THYROX, marcar como [HIPÓTESIS OPERATIVA] hasta Stage 9 PILOT.

---

### Claim 4 — Forma funcional de la fórmula (Sección 5.1)

**Texto:** `P(correct) = P₀ × exp(-λ₁ d_basin - λ₂ H(R,A|Q) - λ₃ Δu_t - λ₄ Π - λ₅ τ)` — etiqueta: INFERRED FROM 2 EXAMPLES, "proposed functional form, NOT derived from first principles. Alternative forms would fit same data equally well."

**Clasificación: CALIBRADO** (el claim está correctamente etiquetado)

La Honest Edition declara explícitamente que la forma funcional es propuesta, no derivada, y que alternativas serían igualmente ajustables. Esta es la declaración epistémica correcta para lo que el documento tiene.

Sin embargo, el nivel de confianza INFERRED es problemático en un sentido más profundo: con N=2 y 6 parámetros, incluso INFERRED sobreestima la fuerza de la evidencia. SPECULATIVE sería más honesto. No es un error grave dado que el documento admite la alternativa, pero se señala.

**Acción requerida para THYROX:** La fórmula completa sigue siendo inutilizable en gates, aunque ahora la prohibición es por decisión epistémica documentada (no por confusión sobre su estatus). Ver Sección 3.

---

### Claim 5 — Calibración de parámetros λ₁…λ₅ (Sección 5.2)

**Texto:** `λ₁=5.0, λ₂=0.8, λ₃=3.0, λ₄=2.0, λ₅=0.02. Fitted on CAP04 and CAP05 — "perfect fit" (error=0 on both). 6 parameters, 2 examples → overfitting admitted.`

**Clasificación: CALIBRADO** (el claim está correctamente etiquetado como INFERRED - Post-Hoc Fitted)

El documento admite explícitamente: (a) ajuste post-hoc, (b) error=0 en los datos de calibración = señal de overfitting, (c) ratio 3:1 parámetros-a-datos. Esta es la descripción correcta de lo que ocurrió.

**Gap residual (no resuelto por la etiqueta):** Los λᵢ individuales siguen sin tener interpretación causal o mecanismo de actualización. Admitir overfitting documenta el problema pero no lo resuelve para uso futuro. Los valores específicos (5.0, 0.8, 3.0, 2.0, 0.02) no son más confiables por tener la etiqueta correcta.

**Evidencia propuesta para resolver el gap:** Para que los λᵢ sean usables, requieren: (a) muestra de calibración de N≥30 cases con etiqueta ground-truth de corrección, (b) ajuste por máxima verosimilitud o bayesiano, (c) intervalos de confianza de los parámetros, (d) validación en muestra held-out separada.

---

### Claim 6 — Datos del experimento natural CAP04→CAP05 (Sección 6.1)

**Texto:** `d_basin: 0.10→0.06, H: 2.92→0.80, Confidence gap: 0.95→0.55, Δu_t: 0.35→0.05, Π: 0.87→0.23, User detection: 87%→18%` — etiqueta: PROVEN

**Clasificación: SOBRE-DECLARADO**

La etiqueta PROVEN para los datos es problemática en el mismo sentido que el Claim 2. Los valores de d_basin, H, Δu_t y Π heredan los problemas de medición de sus definiciones operacionales:

- `d_basin: 0.10→0.06` — d_basin nunca fue "actually measured in actual Claude runs" (admitido en Secciones 8-10). La etiqueta PROVEN para un dato que el propio documento admite no haber medido es contradictoria.
- `H: 2.92→0.80` — heredado del Claim 2: computable-si-se-tienen-las-probabilidades, pero las probabilidades son estimadas sin protocolo.
- `Confidence gap: 0.95→0.55` — este dato podría ser PROVEN si proviene de outputs directos del modelo (la probabilidad de token o logit del modelo). No se especifica la fuente.
- `Δu_t: 0.35→0.05` — cambio en estado de creencia interno del modelo: inaccesible por definición para un observador externo.
- `Π: 0.87→0.23` — índice sin definición operacional (señalado también en el análisis del Part B original).
- `User detection: 87%→18%` — este podría ser PROVEN si es observación directa de comportamiento de usuario. No se especifica la fuente.

De los 6 valores por timestep (12 total), como máximo 2 (Confidence gap y User detection) podrían ser observaciones directas. Los otros 4 son estimaciones no verificables presentadas como PROVEN.

**Evidencia propuesta:** Documentar la fuente de medición de cada variable. Para d_basin específicamente: la Honest Edition admite que nunca fue medido → los datos de d_basin no deberían existir en la tabla con etiqueta PROVEN.

---

### Claim 7 — Interpretación causal del experimento natural (Sección 6.2)

**Texto:** "Cannot distinguish Causal Chain vs Common Cause vs Selection Artifact. None of the 3 distinguishing tests done." — etiqueta: SPECULATIVE

**Clasificación: CALIBRADO**

Esta es la segunda instancia de mayor honestidad del documento. Declara explícitamente las tres hipótesis alternativas, nombra los tests no realizados, y etiqueta el claim como SPECULATIVE. Correcto.

**Acción para THYROX:** El patrón de perturbación CAP04→CAP05 puede usarse como [HIPÓTESIS OPERATIVA] en Stage 9 PILOT sin asumir ninguna de las tres causas. La hipótesis a validar: "reformular el contexto (perturbación equivalente) es más efectivo que pedir revisión directa".

---

### Claim 8 — Validación contra CHI 2026 (Sección 7)

**Texto:** "Validation = looked at CHI data and observed consistency. Not blind prediction. Not held-out test. Kimi K2 (23.3% accuracy, 95.7% confidence) — explanation proposed but d_basin and H never actually measured for Kimi K2."

**Clasificación: CALIBRADO** (el claim está correctamente etiquetado como INFERRED - RETRODICTION)

La distinción entre retrodiction y prediction es exacta y es el reconocimiento correcto de por qué esto no constituye validación estadística. El documento es honesto sobre lo que hizo: buscar consistencia ex-post, no hacer predicción ciega.

**Gap residual:** El Kimi K2 datapoint (23.3% accuracy, 95.7% confidence) — si proviene de un paper CHI peer-reviewed — es una observación directa válida sobre ese modelo. Pero la explicación vía d_basin y H, admitidamente sin medir esas cantidades para Kimi K2, es especulación post-hoc. El claim distingue correctamente entre el datapoint (PROVEN si el paper existe) y la explicación (no tiene etiqueta, debería ser SPECULATIVE).

---

### Claims 9-14 — Limitaciones explícitas (Secciones 8-10)

**Texto:** "No held-out test set / No causal proof / No generalization evidence / No alternative model comparison / Mechanism unverified (d_basin never measured in actual Claude runs) / 6 parameters, 2 examples — parameter stability unknown / Confirmation bias, post-hoc rationalization, narrative bias, publication bias admitted"

**Clasificación: CALIBRADO** (6 claims — todos son observaciones directas sobre el estado del trabajo)

Estas son afirmaciones auto-referentes sobre las limitaciones del propio documento. No requieren validación externa — son verificables leyendo el documento mismo. El hecho de listar estas limitaciones es la contribución epistémica central de la Honest Edition.

**Nota de impacto:** Estos 6 claims son CALIBRADOS pero tienen un carácter diferente al resto: no son claims sobre el mundo, son claims sobre el documento. Documentar una limitación no la resuelve (ver Sección 2).

---

### Conteo por clasificación

| Clasificación | Claims | #Claim |
|---------------|--------|--------|
| CALIBRADO | 9 | 1, 3, 4, 5, 7, 8, 9-14 |
| SOBRE-DECLARADO | 2 | 2, 6 |
| BAJO-DECLARADO | 0 | — |
| GAP (evidencia insuficiente para uso en gates) | 3 | 5-gap, 2-gap, 6-gap |

**Ratio = 9/14 (64%)** — Umbral para artefacto de análisis (≥50%): **ALCANZADO**.

---

## Sección 2 — ¿Las admisiones resuelven los gaps o solo los documentan?

Esta es la pregunta central sobre la Honest Edition.

### Veredicto: DOCUMENTAN, NO RESUELVEN

La Honest Edition introduce una distinción epistémica crítica: la diferencia entre **reconocer una brecha** y **cerrarla**. El documento hace lo primero sistemáticamente y lo segundo en ningún caso.

| Gap del Part B original | ¿Resuelto en Honest Edition? | Mecanismo |
|-------------------------|------------------------------|-----------|
| λᵢ sin calibración empírica independiente | No resuelto | Etiquetado como INFERRED-Post-Hoc-Fitted. El problema permanece: los valores no son más confiables. |
| N=2 insuficiente para validación | No resuelto | Etiquetado como "overfitting admitted". Los N=2 siguen siendo N=2. |
| d_basin nunca medido en Claude real | No resuelto | Admitido en Secciones 8-10. Los datos de d_basin en Sección 6.1 siguen sin fuente operacional. |
| Retrodiction ≠ validación | No resuelto | Explícitamente admitido. La confusión original desaparece, pero la falta de validación ciega persiste. |
| P(correct) = 0.34% con 4 cifras significativas | No resuelto | El número no aparece en la Honest Edition — fue eliminado silenciosamente. Esto es una corrección real. |
| Π_inconsist sin definición operacional | No resuelto | Nombre mantiene en la fórmula sin definición operacional nueva. |
| Circularidad calibración/validación | No resuelto | Admitida como "confirmation bias, post-hoc rationalization". La estructura circular permanece. |

**La P(correct) = 0.34% fue eliminada silenciosamente** — esta es la única corrección que *resuelve* un problema (eliminar el claim más grave del Part B original). Las demás admisiones dejan los problemas intactos pero visibles.

### Consecuencia epistémica

Un documento que documenta sus brechas sin resolverlas es más honesto que uno que las oculta, pero **no más usable** para decisiones de gate. La Honest Edition es preferible para razonamiento colaborativo (permite al lector saber qué no está probado) pero no eleva el nivel de evidencia subyacente.

Analogía: un mapa que marca "aquí no tenemos datos" es mejor que uno que inventa contornos, pero ninguno de los dos permite navegar la zona sin datos.

---

## Sección 3 — Usabilidad para THYROX: gates vs Stage 9 PILOT

### Usable directamente en diseño de gates

| Concepto | Base de evidencia | Aplicación en gates THYROX |
|----------|------------------|---------------------------|
| **Distinción PROVEN/INFERRED/SPECULATIVE** como taxonomía de claims | Conceptualmente sólido; no requiere evidencia empírica | Taxonomía base del sistema de calibración THYROX. Ya implementada en este WP. |
| **H(R,A|Q) como métrica de diversidad** con partición propia | Matemáticamente probado (Claim 1) | Gate de artefacto: calcular distribución de tipos de claim. H alto → más revisión. Implementable con `grep -c` por tipo. |
| **Π_inconsist como principio de diseño de prompts** | Conceptualmente derivable de literatura de cognitive bias; no depende de los N=2 | Regla de gate: reformular prompts para evaluar opciones vs. justificar decisión previa. |
| **Retrodiction ≠ validación** como criterio de calidad | Observación directa sobre metodología | Invariante de gates: las exit conditions de Stage N no pueden validarse con los mismos datos que informaron Stage N. |
| **Parámetro-a-dato ratio como señal de alarma** | Principio estadístico estándar | Heurística de revisión: si un artefacto tiene más parámetros libres que observaciones de calibración, marcarlo para Stage 9 PILOT antes de standardizar. |

### Requiere Stage 9 PILOT antes de uso

| Concepto | Razón | Hipótesis a validar |
|----------|-------|---------------------|
| **Umbrales de H** (alto/medio/bajo alineación) | Los valores de Part B (0.5/1.5/2.0 bits) son estimaciones post-hoc sobre N=2. THYROX necesita calibrar con historial propio. | [HIPÓTESIS] H > 1.5 bits en distribución de tipos de claim predice artefactos que requieren revisión en Stage siguiente. Validar midiendo H en artefactos de ÉPICAs 38-41 y correlacionando con retrabajo observado. |
| **Correlación H-alucinación** como predictor operativo | Inferred from 2 examples. No demostrada en dominio THYROX. | [HIPÓTESIS] Artefactos con distribución uniforme entre tipos (H máximo) tienen mayor tasa de retrabajo que artefactos convergentes (H bajo). |
| **Perturbación CAP04→CAP05** como técnica de gates | Mecanismo causal no identificado (Claim 7: causal/common-cause/selection). Útil como hipótesis pero no como regla. | [HIPÓTESIS] Reformular el contexto del claim en lugar de pedir revisión directa produce mayor tasa de corrección en gates Stage N→N+1. |

### Excluido permanentemente

| Concepto | Razón |
|----------|-------|
| **P(correct) = P₀ × exp(-Σλᵢxᵢ) completa** | 6 parámetros, N=2, calibración circular sobre mismos datos de validación. La Honest Edition confirma la prohibición — no la resuelve. |
| **λ₁…λ₅ como valores numéricos** | Post-hoc fitted, overfitting admitido. Sin muestra de calibración independiente. |
| **d_basin como variable medible en THYROX** | Requiere acceso a representaciones internas del modelo. Inaccesible por definición para agente externo. El propio documento admite "never actually measured in actual Claude runs". |
| **Δu_t (cambio en estado de creencia interno)** | Sin definición operacional. Inaccesible. |

---

## Sección 4 — Análisis de la mejora metodológica: qué hizo la Honest Edition

### Mecanismos de mejora identificados

1. **Introdujo taxonomía epistémica explícita** (PROVEN/INFERRED/SPECULATIVE) — mejora real. Permite al lector distinguir niveles de evidencia sin reconstruir la cadena desde cero.

2. **Eliminó el claim más grave** — P(correct|CAP04) = 0.34% desaparece silenciosamente. Sin este claim, la composición de incertidumbres no llega al absurdo de 4 cifras significativas sobre 5 parámetros mal calibrados.

3. **Explicitó los 3 mecanismos causales alternativos** (Sección 6.2) — convierte una afirmación causal implícita en 3 hipótesis falsificables.

4. **Separó retrodiction de validación** (Sección 7) — elimina la confusión semántica del Part B original donde "validates" significaba "es consistente con".

5. **Admitió sesgos por nombre** (confirmation bias, post-hoc rationalization, narrative bias, publication bias) — nombrar los sesgos no los elimina, pero permite al lector ponderar el documento con ese conocimiento.

### Lo que la Honest Edition NO hizo

1. **No consiguió datos adicionales** — el ratio N=2 es el mismo.
2. **No definió protocolos operacionales** para d_basin, Δu_t, Π_inconsist.
3. **No realizó validación ciega** — sigue siendo retrodiction.
4. **No comparó modelos alternativos** de la forma funcional.
5. **No resolvió la circularidad** de calibración/validación.

### Patrón identificado: "honestidad como sustituto de evidencia"

La Honest Edition ejemplifica un patrón epistémico relevante para THYROX: un documento puede mejorar su *honestidad sobre sus brechas* sin mejorar su *nivel de evidencia subyacente*. Este patrón es mejor que realismo performativo, pero no alcanza para gates de decisión.

**Nombre propuesto para el patrón:** Honestidad sin resolución (HsR). Características:
- Ratio de calibración ≥50% (cumple umbral nominal)
- Las admisiones de limitación son CALIBRADAS (documentan el estado real)
- La evidencia subyacente de los claims principales no mejora
- Usable para razonamiento colaborativo; no suficiente para gates sin Stage 9 PILOT

---

## Sección 5 — Ratio de calibración y brecha residual

### Cómo interpretar el 64% vs el umbral de 50%

El ratio 64% supera el umbral de artefactos de análisis (≥50%). Sin embargo, 6 de los 9 claims CALIBRADOS son las admisiones de limitación de Secciones 8-10. Si se excluyen los auto-reportes de limitaciones (que son trivialmente CALIBRADOS por ser auto-referenciales):

| Subconjunto | Calibrados | Total | Ratio |
|-------------|------------|-------|-------|
| Solo claims sustantivos (1-8) | 6 | 8 | 75% |
| Solo claims sustantivos excluyendo "correctamente etiquetados pero evidencia débil" | 3 | 8 | 38% |
| Claims de Secciones 8-10 (admisiones) | 6 | 6 | 100% |

El 64% global es el número correcto según la taxonomía del agente. El desglose muestra que la mejora proviene principalmente de las admisiones, no de nueva evidencia.

### Brecha residual para uso en THYROX

| Tipo de brecha | Claims afectados | Severidad |
|----------------|-----------------|-----------|
| SOBRE-DECLARADO (etiqueta más fuerte que evidencia) | 2, 6 | Media — los claims no son falsos, solo mal categorizados |
| GAP por datos inaccesibles (d_basin, Δu_t) | 5-gap, 6-gap | Alta — no resoluble sin acceso a internals del modelo |
| GAP por N insuficiente para generalización | 4-gap | Alta — resoluble con datos adicionales |

---

## Resumen ejecutivo

**Ratio: 9/14 (64%) — PARCIALMENTE CALIBRADO.**

La Honest Edition v2.1 representa un avance metodológico real sobre el Part B original (8% → 64%). El avance proviene de introducir taxonomía epistémica explícita, eliminar el claim más grave (P=0.34%), y documentar sistemáticamente las limitaciones.

**Lo que resuelve:** la *visibilidad* de las brechas.
**Lo que no resuelve:** las brechas mismas.

### Para diseño de gates THYROX — usable ahora:

1. Taxonomía PROVEN/INFERRED/SPECULATIVE como complemento (o alternativa) a la taxonomía THYROX actual
2. H(R,A|Q) como métrica de diversidad de tipos de claim — con partición propia de THYROX
3. Principio anti-Π: diseño de prompts que evitan racionalización post-hoc
4. Invariante "retrodiction ≠ validación" para exit conditions de Stage N
5. Heurística "parámetros > observaciones → requiere PILOT"

### Para Stage 9 PILOT — hipótesis a validar:

1. Correlación H-retrabajo en artefactos THYROX (N≥30 artefactos de ÉPICAs previas)
2. Efectividad de perturbación de contexto vs. revisión directa en gates
3. Umbral de H específico para dominio THYROX (vs. los 0.5/1.5/2.0 de Part B)

### Permanentemente excluido:

Fórmula `P(correct) = P₀ × exp(-Σλᵢxᵢ)` con sus parámetros — la Honest Edition confirma la prohibición documentando sus propias limitaciones; no las resuelve.

**Patrón epistémico identificado:** Honestidad sin resolución (HsR) — más valioso que realismo performativo para razonamiento colaborativo; insuficiente para gates sin Stage 9 PILOT.
