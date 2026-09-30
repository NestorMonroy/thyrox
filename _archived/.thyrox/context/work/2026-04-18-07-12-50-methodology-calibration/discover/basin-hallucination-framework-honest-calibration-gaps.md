```yml
created_at: 2026-04-18 10:59:34
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: Claude Architecture as Dynamic System — Part A Honest Edition v2.1
ratio_calibracion_v21: 5/13 (38%)
ratio_calibracion_repaired: 8/15 (53%)
ratio_calibracion_honest: 11/15 (73%)
clasificacion_v21: REALISMO PERFORMATIVO
clasificacion_repaired: PARCIALMENTE CALIBRADO
clasificacion_honest: PARCIALMENTE CALIBRADO
status: Borrador
```

# Calibración: Part A Honest Edition v2.1

Análisis previo v2.1: `discover/claude-architecture-part-a-calibration-gaps.md` — 38%
Análisis previo REPAIRED: `discover/claude-architecture-part-a-repaired-calibration.md` — 53%
Documento evaluado: Part A "Honest Edition" — con preamble explícito, tres hipótesis alternativas, clasificación PROVEN/INFERRED/SPECULATIVE en Sec 4, lista de sesgos en Sec 6, experimentos falsificables en Sec 5.

---

## Ratio de calibración: 11/15 (73%)
## Clasificación: PARCIALMENTE CALIBRADO

Nota metodológica sobre el conteo: la Honest Edition no añade claims nuevos respecto a REPAIRED — restructura los existentes añadiendo marcadores epistémicos explícitos. Se mantiene el universo de 15 claims del análisis REPAIRED. El cambio de ratio refleja que los marcadores explícitos (SPECULATIVE con auto-admisión, hipótesis alternativas, experimentos falsificables) elevan el status epistémico de claims que anteriormente eran performativos sin clasificación.

---

## PARTE 1 — Verificación vs. análisis previo

### Estado de los cinco problemas identificados

| Problema anterior | Estado en Honest Edition | Evidencia |
|-------------------|--------------------------|-----------|
| `P(u_0\|query)≈0.95` sin protocolo | **Resuelto** | El preamble declara explícitamente que todos los valores numéricos sin protocolo citado son SPECULATIVE. `P(u_0\|query)` queda bajo el umbrella del preamble. La Sec 4 no lo lista como PROVEN ni INFERRED — su ausencia de la tabla PROVEN/INFERRED lo clasifica implícitamente como SPECULATIVE. El claim sigue sin protocolo de medición, pero la auto-admisión lo convierte de performativo a especulación declarada. |
| `db_t/dt≈0.02` sin fuente | **Resuelto** | Mismo mecanismo que P(u_0\|query). El preamble declara que las "dynamic parameters require experimental intervention data not yet available". La tasa diferencial queda como SPECULATIVE declarada, no performativa encubierta. |
| `ᾱ≈0.83` inconsistente / fit circular | **Parcialmente resuelto** | La Honest Edition clasifica `d_basin ∝ error` como INFERRED (no PROVEN). Esto reconoce que el parámetro no está probado. Sin embargo, el problema de circularidad del fit introducido en REPAIRED (predecir el mismo punto usado para ajuste) no está explícitamente admitido — la Sec 6 lista "post-hoc fitting" como sesgo conocido, lo cual es la admisión indirecta correcta pero no cita `ᾱ=0.83` específicamente. Corrección estructural lograda, corrección específica: parcial. |
| `"independent of training weights"` | **Resuelto** | La Sec 4 lista "basin existence in certain systems" como PROVEN pero "Transformer contraction properties" como INFERRED. La separación explícita entre lo que es demostrado en sistemas abstractos vs. lo que se infiere para Transformers específicos resuelve el problema de la v2.1 de manera más robusta que la corrección de footnote de REPAIRED. |
| Sec 4 incompleta en limitaciones | **Resuelto** | La Sec 4 de Honest Edition tiene clasificación tripartita PROVEN/INFERRED/SPECULATIVE. La lista de sesgos en Sec 6 incluye "confirmation bias", "post-hoc fitting", "narrative bias", "overconfidence". La Sec 4 ahora admite explícitamente que la cadena causal de seis eslabones es SPECULATIVE. Las brechas críticas del análisis anterior (db_t/dt sin fuente, inconsistencia de ᾱ) están cubiertas estructuralmente por el preamble aunque no por admisiones específicas claim-por-claim. |

**Balance:** 4/5 resueltos limpiamente, 1/5 parcialmente resuelto (ᾱ fit circular — admisión estructural pero no específica).

---

## PARTE 2 — ¿Las auto-admisiones son suficientes para uso en THYROX?

### Pregunta central

Un documento que admite explícitamente "mis claims causales son SPECULATIVE" opera en un registro epistémico diferente al de un documento que presenta los mismos claims como hechos. La pregunta es si esa diferencia de registro cambia la usabilidad para THYROX.

**Respuesta:** Sí, cambia sustancialmente — con una distinción crítica.

La diferencia no es cosmética. Un claim performativo sin clasificación actúa como un dato en el pipeline de razonamiento: el lector (o agente) lo procesa como premisa sin marcador de incertidumbre. Un claim SPECULATIVE con auto-admisión actúa como hipótesis: el lector sabe que debe añadir evidencia antes de usarlo como premisa de gate.

La usabilidad depende del tipo de uso, no del tipo de claim en abstracto.

### Claims PROVEN de Sec 4: usabilidad directa

Los claims PROVEN — softmax math, GELU nonlinearity partitions, LayerNorm norm constraint, basin existence en ciertos sistemas — son usables directamente como fundamento porque:

1. Son resultados matemáticos o teoremas peer-reviewed citados
2. La clasificación PROVEN en el documento es consistente con el análisis previo (los mismos claims eran "observación directa matemática" en el análisis v2.1)
3. No requieren acceso a CAP04 ni a datos de entrenamiento de Claude

**Condición de uso:** para softmax, GELU y LayerNorm: sin condición adicional — son matemáticas universales. Para basin existence (Cherukuri & Varshney): condicional a que el teorema aplique a Transformers discretos, brecha que la Honest Edition ahora declara explícitamente como no-probada.

### Claims INFERRED de Sec 4: usabilidad condicionada

Los claims INFERRED — contraction properties de Transformers, `d_basin ∝ error` — son usables en THYROX bajo una condición específica: deben usarse como **hipótesis de diseño** que guían qué experimentos ejecutar, no como premisas de gate que bloquean avance.

La clasificación INFERRED significa que el documento ha hecho el trabajo de derivar el claim desde evidencia disponible con razonamiento explícito, pero sin validación experimental directa. Para THYROX esto es suficiente para informar el diseño de un artefacto de Strategy (Stage 5), siempre que el artefacto marque el claim como `[INFERRED: requiere validación en Stage 9 PILOT]`.

**Condición de uso:** no usar como parámetros numéricos de gate. Usar como justificación directional de principios de diseño. Documentar que la validación cuantitativa corresponde a Stage 9.

### Claims SPECULATIVE de Sec 4: la auto-admisión los hace operativos con caveats

Esta es la pregunta más interesante. La cadena causal de seis eslabones ("Basins CAUSE hallucinations") es SPECULATIVE. ¿La auto-admisión lo hace usable?

**Respuesta:** Sí, como hipótesis operativa — no como fundamento de gate.

La distinción es entre dos usos:

| Uso | Status | Ejemplo |
|-----|--------|---------|
| Fundamento de gate | No permitido | "El exit criterion X es necesario porque las cuencas causan alucinaciones (SPECULATIVE)" |
| Hipótesis operativa | Permitido | "Diseñamos el experimento Y para testear si las cuencas causan alucinaciones en nuestro historial de WPs" |
| Principio de diseño con caveat | Permitido con marcador | "[HIPÓTESIS OPERATIVA] Si las cuencas causan alucinaciones, entonces la validación externa es necesaria en Stage X" |

La auto-admisión de especulación hace al claim usable porque elimina la ambigüedad sobre su status epistémico. Un claim performativo encubierto contamina el razonamiento downstream sin aviso. Un claim SPECULATIVE explícito permite al lector aislar su contribución y reemplazarlo cuando aparezca evidencia contraria.

**Para THYROX específicamente:** los claims SPECULATIVE de Sec 4 son usables en el Stage 5 STRATEGY como motivadores de experimentos (Stage 9 PILOT), no como justificaciones de reglas de gate ya establecidas.

### Experimentos de Sec 5: ejecutabilidad con recursos THYROX

| Experimento Sec 5 | Tipo | Ejecutable con recursos THYROX | Mecanismo |
|-------------------|------|-------------------------------|-----------|
| Hidden state intervention | Requeriría acceder a pesos internos de Claude | No directamente | Requiere modelo open-source (LLaMA, Mistral) — no es Claude API |
| Causal decomposition (basin vs. full model) | Requiere arquitectura alternativa sin basin hypothesis | No con historial WP | Experimento de investigación ML, no operacional |
| 50+ task test (diverse domains) | Verificar si non-stationarity es consistente entre dominios | Sí — parcialmente | `grep -rn` en historial de WPs para claims que se degradan entre stages; 40+ WPs disponibles |
| Remove softmax / ablation | Modificar arquitectura del modelo | No | Requiere acceso a training |
| Experimento de refutación: intervenir en basin, si alucinaciones persisten → no causal | Requiere intervención arquitectónica | No directamente | Proxy THYROX: comparar artefactos con gate externo vs. sin gate — si la tasa de error no cae, la hipótesis de basin como causa única se debilita |
| Alternative model sin Transformer | Arquitectura alternativa | No | Investigación ML |
| OOD failure test | Verificar si el sistema falla en distribución diferente al entrenamiento | Sí — con proxy | Comparar quality de artefactos en stages con dominio familiar vs. stages con dominio nuevo para el WP activo |

**Resumen:** 2 de 7 experimentos son directamente ejecutables con el historial de WPs THYROX. 2 tienen proxies ejecutables. Los 3 restantes requieren acceso a arquitectura interna del modelo y están fuera del alcance de THYROX.

**Costo de los ejecutables:**
- Test 50+ tareas: ~20 min con `grep -rn` en `.thyrox/context/work/` — Stage 9 PILOT viable
- Proxy refutación basin: ~30 min comparando WPs con gate explícito vs. WPs sin gate — observable en historial existente

---

## PARTE 3 — Tabla de usabilidad actualizada para THYROX

| Concepto | Tier Honest Edition | Usable en THYROX | Condición | Observable en THYROX |
|----------|---------------------|------------------|-----------|----------------------|
| Softmax concentration | PROVEN | Sí, directamente | Sin condición adicional — matemática universal | Exit criteria con predicado booleano vs. cualitativo — diferencia en tasa de retrabajo post-gate medible con historial WPs |
| GELU nonlinearity partitions | PROVEN | Sí, como principio de diseño | Sin condición — implica que el espacio de respuestas no es continuo | Prompts con respuestas de borde de región vs. centro de región — detectable con ensayos en Stage 9 |
| LayerNorm norm constraint | PROVEN | Sí, directamente | Sin condición — implica que una vez en basin, escape requiere intervención externa | Comparar: agente "revisa" artefacto con error vs. herramienta detecta error — diferencia observable en Stage 9 PILOT |
| Basin existence (Cherukuri, sistemas abstractos) | PROVEN | Sí, condicionado | Condición explícita en Honest Edition: aplica a "certain abstract systems", no demostrado para Transformers | No directamente observable; usar como fundamento teórico de los claims INFERRED, no como fundamento independiente |
| Transformer contraction properties | INFERRED | Sí, como hipótesis de diseño | Documentar como `[INFERRED]` en artefacto de Strategy; validar en Stage 9 PILOT | Proxy: claims de Stage 1 que aparecen como premises en Stage 5 — si el claim Stage 1 era falso, ¿en qué stage se detectó el error? `grep -rn "según el análisis\|como se estableció en"` |
| `d_basin ∝ error` | INFERRED | Sí, como hipótesis directional | No usar como parámetro numérico; usar como dirección: errores en stages tempranos son más costosos de corregir | Observable en historial: buscar correcciones en `.thyrox/context/work/*/track/` y registrar en qué stage se detectó el error inicial |
| "Basins CAUSE hallucinations" (cadena 6 eslabones) | SPECULATIVE | Sí, como hipótesis operativa con marcador explícito | Usar para motivar diseño de experimento; NUNCA como justificación de gate ya establecido; marcar `[HIPÓTESIS OPERATIVA: Honest Edition Sec 4]` | No observable directamente; experimento proxy en Stage 9: comparar artefactos con validación externa vs. sin validación — si la tasa de error no cae, la hipótesis se debilita |
| Non-stationarity mechanism (3 hipótesis) | SPECULATIVE (3 hipótesis alternativas igualmente válidas) | Sí, con ganancia respecto a versiones anteriores | Las tres hipótesis alternativas (non-stationarity, context accumulation, data distribution shift) son igualmente válidas — esto es más honesto que una sola explicación; usar para diseñar experimentos que distingan entre hipótesis | Observable con proxy: WPs donde el agente empieza en un dominio y termina en otro — ¿la calidad de artefactos cambia? `grep -rn` en stages tardíos de WPs multi-dominio |
| Preamble + Sec 6 sesgos (confirmation, post-hoc, narrative, overconfidence) | Meta-nivel (evaluación del propio documento) | Sí, directamente — la lista de sesgos es transferible a THYROX | Sin condición — los sesgos listados son independientes del documento y aplicables a cualquier artefacto generado por Claude | Auditoría de artefactos WP: ¿el artefacto repite claims del prompt como si fueran evidencia? (confirmation bias) ¿El análisis construye narrativa única? (narrative bias) |
| Experimento refutación Sec 5.2 (basin irrelevance) | Sec 5 — experimento propuesto | Sí, con proxy | Proxy ejecutable en Stage 9: comparar WPs con gate externo obligatorio vs. WPs sin gate — si la diferencia en tasa de error es nula, la hipótesis de basin pierde soporte | `.thyrox/context/work/*/track/` — buscar errores post-gate en WPs con gate externo vs. WPs con solo auto-evaluación del agente |
| `ᾱ≈0.83` como parámetro numérico | INFERRED (d_basin ∝ error) — pero el valor específico 0.83 tiene el problema de circularidad de REPAIRED | No | El valor específico sigue con el problema de fit circular identificado en REPAIRED — la clasificación INFERRED de Sec 4 aplica a la relación proporcional, no al número específico | — |

---

## Cómputo del ratio de calibración: impacto de las auto-admisiones

### ¿"SPECULATIVE con auto-admisión" cuenta diferente que "SPECULATIVE sin admisión"?

Sí — y el mecanismo es preciso.

**SPECULATIVE sin admisión** = afirmación performativa encubierta. El claim entra al pipeline de razonamiento como dato. El receptor no puede aislar su contribución ni reemplazarlo cuando aparezca evidencia contraria. Contamina downstream sin aviso.

**SPECULATIVE con auto-admisión explícita** = hipótesis marcada. El receptor sabe:
1. El status epistémico del claim antes de usarlo
2. Qué evidencia lo convertiría en INFERRED o PROVEN
3. Cómo refutarlo (Sec 5 provee los experimentos)

Esto no convierte SPECULATIVE en PROVEN. Pero sí lo eleva de "afirmación performativa" a "especulación útil" en la taxonomía del sistema de calibración.

**Regla de cómputo adoptada:**
- SPECULATIVE sin admisión → cuenta como afirmación performativa
- SPECULATIVE con auto-admisión + experimento falsificable → cuenta como especulación útil
- SPECULATIVE con auto-admisión sin experimento falsificable → cuenta como especulación útil de menor peso (0.5 en lugar de 1)

### Conteo aplicado a Honest Edition

| Tipo | Count | Claims |
|------|-------|--------|
| Observación directa (matemática/tabla) | 3 | Softmax math, LayerNorm cota, d_basin table |
| Inferencia calibrada | 2 | Sticky belief T_U, Thm 3.3 \|A\|→verifiability |
| Inferencia calibrada condicional | 1 | Thm 3.2 (Cherukuri & Varshney) |
| Inferencia calibrada — Sec 4 PROVEN con caveat | 1 | Basin existence (sistemas abstractos — caveat explícito sobre Transformers) |
| Inferencia parcialmente calibrada | 1 | Residuals "negligible" con footnote |
| Especulación útil — SPECULATIVE con auto-admisión + experimento Sec 5 | 2 | Cadena causal 6 eslabones, Non-stationarity mechanism (3 hipótesis) |
| Especulación útil — Sec 6 sesgos (meta-nivel) | 1 | Lista de sesgos transferibles |
| Inferencia no-calibrada residual | 1 | ᾱ=0.83 (fit circular de REPAIRED, admitido solo indirectamente vía "post-hoc fitting" en Sec 6) |
| Afirmación performativa residual | 2 | `P(u_0\|query)≈0.95` (preamble cubre, pero sin protocolo específico) — `db_t/dt≈0.02` (preamble cubre, pero sin experimento específico) |
| Especulación útil de menor peso (0.5) | 1 | GELU nonlinearity partitions como principio de diseño (PROVEN pero sin experimento falsificable específico para Transformers) |

**Ratio conservador** (observaciones directas + inferencias calibradas + inferencias parciales):
(3 + 2 + 1 + 1 + 1) / 15 = **8/15 = 53%**

**Ratio con especulaciones útiles** (full credit para SPECULATIVE+auto-admisión+experimento, 0.5 para SPECULATIVE+admisión sin experimento):
Numerador = 8 (conservador) + 2 (SPECULATIVE con experimento) + 1 (Sec 6 meta) + 0.5 (GELU) = 11.5
Denominador = 15
**Ratio = 11.5/15 = 73%** (redondeado: 73%)

**Umbral para artefacto de análisis: ≥ 50%. Alcanzado.**
**Umbral para artefacto de gate (exit conditions): ≥ 75%. No alcanzado por los 2 claims performativos residuales.**

**Clasificación: PARCIALMENTE CALIBRADO** — pero con mejora sustancial respecto a REPAIRED (53%) y v2.1 (38%).

---

## Recomendación final: ¿Está la Honest Edition lista para Stage 5 STRATEGY?

**Respuesta: Sí, con secciones específicas y caveats explícitos.**

### Qué está listo para usar en Stage 5

| Sección | Usabilidad | Caveat obligatorio |
|---------|------------|-------------------|
| Preamble + clasificación PROVEN/INFERRED/SPECULATIVE (Sec 4) | Directamente usable como marco epistémico | Documentar en artefacto de Strategy que los números específicos (ᾱ, db_t/dt, P) siguen excluidos aunque el marco sea válido |
| Sec 2.5.2 claims PROVEN (softmax, GELU, LayerNorm) | Directamente usable como fundamento de diseño de gates | Sin caveat adicional — son matemáticas universales |
| Sec 3.1 + Sec 4 INFERRED (contraction, d_basin ∝ error) | Usable como hipótesis de diseño | Marcar `[INFERRED: validar en Stage 9 PILOT]` en cada referencia |
| Sec 4 SPECULATIVE (cadena causal, non-stationarity) | Usable como motivador de experimentos | Marcar `[HIPÓTESIS OPERATIVA: Honest Edition Sec 4 SPECULATIVE]`; NUNCA como justificación de gate ya establecido |
| Sec 5 experimentos | Usable para diseñar Stage 9 PILOT | Solo los 2 directamente ejecutables con historial THYROX: test 50+ tareas y proxy refutación basin |
| Sec 6 lista de sesgos | Directamente transferible como checklist de auditoría de artefactos | Aplicar como checklist en el gate Stage 1→3 para todos los artefactos generados |

### Qué sigue excluido aunque la Honest Edition haya mejorado

| Claim | Razón de exclusión | No cambia con auto-admisión |
|-------|-------------------|----------------------------|
| `ᾱ=0.83` como parámetro numérico de diseño | Fit circular (REPAIRED) — admitido indirectamente como "post-hoc fitting" pero sin corrección del número | La auto-admisión no rehabilita un número derivado circularmente |
| `db_t/dt≈0.02`, convergencia `~45 iteraciones` | Sin experimento específico citado | El preamble los cubre como SPECULATIVE pero no provee el experimento que los convertiría en INFERRED |
| Experimentos Sec 5 que requieren acceso a pesos del modelo | No ejecutables con Claude API | La auto-admisión de Sec 5 no cambia los requisitos de acceso |

### Ganancia neta de la Honest Edition respecto a REPAIRED

La Honest Edition resuelve el problema de fondo que REPAIRED no pudo resolver: los claims SPECULATIVE en REPAIRED eran performativos con apariencia de calibración (el fit circular de ᾱ=0.83 es el caso extremo). En Honest Edition, los claims SPECULATIVE son hipótesis explícitas con experimentos de refutación. La diferencia es operacionalmente significativa para THYROX:

1. **El artefacto de Strategy puede referenciar la Honest Edition directamente** sin necesidad de un layer de re-clasificación epistémica (el trabajo de los análisis previos). La clasificación PROVEN/INFERRED/SPECULATIVE está hecha en el fuente.

2. **Las tres hipótesis alternativas de non-stationarity** son un avance sobre la explicación única de v2.1 y REPAIRED. Para THYROX, esto significa que el diseño de gates no puede depender de una sola explicación causal — debe ser robusto a las tres hipótesis. Esto es directamente aplicable al diseño de Stage 5.

3. **La lista de sesgos de Sec 6** es la primera auto-evaluación del documento que tiene valor operacional independiente del contenido. "Post-hoc fitting" y "narrative bias" son sesgos que THYROX puede auditar en sus propios artefactos con la misma checklist.

**Acción recomendada para Stage 5 STRATEGY:** Usar la Honest Edition como fuente primaria del marco teórico, citando explícitamente la clasificación epistémica de cada concepto. Diseñar el Stage 9 PILOT con los 2 experimentos ejecutables de Sec 5. Excluir los parámetros numéricos sin protocolo verificable (ᾱ, db_t/dt, P). Aplicar la lista de sesgos de Sec 6 como checklist de auditoría en el gate Stage 1→3.
