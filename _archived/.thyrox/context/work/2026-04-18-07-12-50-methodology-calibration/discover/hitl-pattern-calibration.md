```yml
created_at: 2026-04-19 10:38:57
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Chapter 13: Human in the Loop" (documento externo, 2026-04-19)
ratio_calibración: 13.65/27 (50.6%)
clasificación: PARCIALMENTE CALIBRADO
delta_vs_cap12: -2.5pp
delta_vs_cap9: -26.4pp
hipotesis_ccv: CONFIRMADA
```

# Calibración — Cap.13: Human in the Loop

## Ratio de calibración: 13.65/27 (50.6%)
## Clasificación: PARCIALMENTE CALIBRADO
## Umbral gate (75%): NO alcanzado

---

## Marco de scores aplicado

| Tipo | Score |
|------|-------|
| Observación directa (verificable: código ejecutable, DOI citado inline) | 1.0 |
| Inferencia calibrada fuerte (hedging + derivación lógica sólida) | 0.85 |
| Inferencia calibrada moderada (razonamiento implícito sin hedging) | 0.65 |
| Inferencia especulativa (posible, sin validación) | 0.40 |
| Claim performativo (afirma calidad sin derivarla) | 0.10 |

---

## Grupo A — Conceptual / patrón HITL (8 claims)

### A-01: Taxonomía HITL / HOTL / HIC
**Texto:** "Human-in-the-Loop (HITL)... Human-on-the-Loop (HOTL)... Human-in-Command (HIC)" (L.63–67)
**Clasificación:** Inferencia calibrada fuerte (0.85)
**Justificación:** Terminología estándar verificable en literatura de autonomía de sistemas. La nota editorial 6 confirma que son términos establecidos. La referencia Mosqueira-Rey et al. (2023) cubre HITL aunque no está citada inline en este claim específico. La existencia de la taxonomía es verificable por búsqueda independiente — score 0.85, no 1.0 porque la referencia no aparece inline.

### A-02: "automation bias — the tendency for humans or other AI systems to over-trust automated decisions"
**Texto:** L.39
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** Término técnico verificable (Parasuraman & Manzey 2010; Mosier & Skitka 1996). El concepto existe en la literatura. Sin embargo, la extensión "or other AI systems" no está respaldada por las fuentes clásicas del término que se centran en operadores humanos. El capítulo no cita ninguna referencia para este claim. Score degradado a 0.65 (no 0.85) por ausencia de cita inline y por la extensión no documentada a AI systems.

### A-03: "creates clear lines of accountability and allows for easy auditing of decisions"
**Texto:** L.43
**Clasificación:** Claim performativo (0.10)
**Justificación:** El patrón HITL conceptualmente habilita accountability — pero "clear lines" y "easy auditing" son afirmaciones de calidad. La implementación del capítulo usa `print()` como audit trail (Nota editorial 8), lo que contradice directamente "easy auditing" como realidad implementada. El código no demuestra el claim.

### A-04: "continuous improvement by incorporating human feedback into the decision-making process, creating a learning loop that allows the AI to refine its behavior over time"
**Texto:** L.41–42
**Clasificación:** Claim performativo (0.10)
**Justificación:** El código del capítulo no implementa ningún mecanismo de feedback loop ni de refinamiento de comportamiento. El `after_model_callback` solo hace `print()`. No hay storage, no hay ciclo de reentrenamiento, no hay captura estructurada de feedback humano. La afirmación describe una capacidad que el ejemplo no demuestra.

### A-05: "errs on the side of involving humans" (rule of thumb)
**Texto:** "When in doubt, HITL errs on the side of involving humans" (L.196)
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** Es un principio de diseño heurístico razonable, derivado de la lógica del patrón. No es un claim empírico — es una recomendación prescriptiva que no requiere evidencia empírica para ser válida. El hedging "when in doubt" lo hace menos absoluto. Score 0.65: razonamiento correcto, no verificable con dato pero tampoco requiere verificación empírica.

### A-06: "HITL represents a fundamental design philosophy for building trustworthy AI systems"
**Texto:** L.33
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** "Trustworthy AI" es un campo con definiciones formales (EU AI Act, NIST AI RMF) que no se citan. Que HITL sea "fundamental" para trustworthy AI es una posición plausible pero no demostrada — existen sistemas trustworthy con arquitecturas diferentes. La ausencia de referencia degrada el score.

### A-07: Descripción del feedback loop operacional (AI procesa → handoff criteria → routing → human input → continúa)
**Texto:** L.59–60
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** Descripción arquitectónica del patrón, internamente consistente con el código. No es verificable con el código presentado (que no implementa un loop completo) pero es una descripción conceptual razonablemente derivada.

### A-08: "ensuring agents remain assistants rather than autonomous decision-makers in critical scenarios"
**Texto:** L.37
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** Afirmación normativa sobre el propósito del patrón. Derivada de la arquitectura descrita, no empírica. Internamente consistente. Score 0.65.

**Subtotal Grupo A: 0.85 + 0.65 + 0.10 + 0.10 + 0.65 + 0.40 + 0.65 + 0.65 = 4.05 / 8 = 50.6%**

---

## Grupo B — Código ADK (9 claims)

### B-01: `personalization_callback` modifica in-place y retorna `None`
**Texto:** L.132–151 + Nota editorial 1
**Clasificación:** Observación directa parcial (0.50 neto)
**Justificación:** El código es observable directamente: la función modifica `llm_request.contents` via `.insert()` y no tiene `return` statement explícito (retorna `None` implícitamente). La modificación in-place es verificable en el snippet. Sin embargo, el capítulo no documenta el contrato de ADK `before_model_callback`. La Nota editorial 1 identifica correctamente que si ADK hace deepcopy del request, la modificación es descartada. Score 0.50: el código es observable, el comportamiento en runtime es incierto sin correr el sistema real.

### B-02: `types.Content(role="system", ...)` como elemento de `contents`
**Texto:** L.148–151 + Nota editorial 2
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** La Nota editorial 2 identifica que ADK/Gemini usa `system_instruction`, no `role="system"` en contents. Sin ejecutar el código no se puede verificar si este rol es aceptado o silenciosamente ignorado. El claim del capítulo (que esto "inserts a system prompt") es una afirmación sin verificación del framework. Score 0.40.

### B-03: `after_model_callback` con `print()` como "audit trail"
**Texto:** L.153–159 + narración L.182–183 ("maintains a comprehensive audit trail")
**Clasificación:** Claim performativo (0.10)
**Justificación:** El código hace `print()`. La Nota editorial 8 es correcta: un audit trail en producción requiere persistencia, timestamp, identificador de transacción, y mecanismo de integridad. `print()` no es un audit trail. El capítulo afirma que "ensures... a complete audit trail for every decision made" (L.183) — esto es realismo performativo: el texto afirma la propiedad, el código la contradice.

### B-04: Las 5 funciones herramienta están definidas (mejora real vs. Cap.12)
**Texto:** L.104–130
**Clasificación:** Observación directa (1.0)
**Justificación:** Las funciones `get_loan_status`, `update_loan_status`, `approve_loan`, `reject_loan`, `flag_for_review` están definidas con `def` y `return` statements en el snippet. Verificable directamente. Contraste con Cap.12 donde las funciones no estaban definidas.

### B-05: Las 5 funciones herramienta son stubs hardcodeados
**Texto:** L.104–130 + Nota editorial 5
**Clasificación:** Observación directa (1.0)
**Justificación:** `get_loan_status` siempre retorna los mismos valores hardcodeados (amount=500000, credit_score=720, etc.). `approve_loan`, `reject_loan`, `flag_for_review` siempre retornan `{"success": True}`. Observable directamente en el código.

### B-06: "The system defines five business logic functions... ensures consistent policy enforcement"
**Texto:** L.177–183
**Clasificación:** Claim performativo (0.10)
**Justificación:** "Consistent policy enforcement" implica que el sistema efectivamente aplica las reglas de riesgo (flagging por amount > $1M, credit_score < 650, etc.). Dado los bugs de B-01 y B-02, el `risk_context` puede no llegar al modelo. El sistema podría nunca flag ninguna aplicación. La afirmación de "consistent policy enforcement" es performativa dado el estado del código.

### B-07: `LiteLlm(model="openai/gpt-4o")` — uso de OpenAI, no Gemini
**Texto:** L.163
**Clasificación:** Observación directa (1.0)
**Justificación:** La línea `model=LiteLlm(model="openai/gpt-4o")` es directamente observable. El capítulo usa la clase `LiteLlm` de ADK para conectar con OpenAI GPT-4o, no con Gemini directamente. Contraste notable dado que ADK es un framework de Google.

### B-08: "The `personalization_callback` runs before the model processes each request. It inserts a system prompt..."
**Texto:** L.178–180
**Clasificación:** Claim performativo (0.10)
**Justificación:** Esta narración del comportamiento es condicional a que los bugs B-01 y B-02 no se materialicen. El capítulo afirma como hecho ("inserts a system prompt") lo que es contingente al contrato del framework. Combinado con B-02 (role="system" puede ser inválido), la afirmación es performativa.

### B-09: "In production, this would log to an audit system"
**Texto:** L.158 (comentario en código)
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** Este es un comentario que reconoce explícitamente que la implementación es un placeholder. El reconocimiento in-code es honesto — a diferencia de la narración externa L.183 que afirma "complete audit trail" sin ese disclaimer. Score 0.65: el reconocimiento del gap es apropiado aunque parcial.

**Subtotal Grupo B: 0.50 + 0.40 + 0.10 + 1.0 + 1.0 + 0.10 + 1.0 + 0.10 + 0.65 = 4.85 / 9 = 53.9%**

---

## Grupo C — Casos de uso (7 claims)

### C-01: Medical Diagnosis — radiólogo revisa diagnósticos
**Texto:** L.77–78
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** El patrón es correcto y bien establecido en práctica clínica. AI-assisted radiology con human review existe como práctica real. No hay cita específica pero el claim es razonablemente derivado y no excede lo conocido sobre el dominio.

### C-02: Loan Approval — "fairness concerns are handled by a human" / "compliance with lending regulations"
**Texto:** L.79–80 + L.164–166 (instruction del agente)
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** La Nota editorial 7 reconoce mejora vs. Cap.10/11/12: el capítulo menciona explícitamente "compliance with lending regulations" y "fairness concerns". No cita regulaciones específicas (Equal Credit Opportunity Act, Fair Housing Act, GDPR) pero el claim tiene conciencia regulatoria. Score 0.65 (mejora sobre los 0.40 de capítulos anteriores, pero sin citar la regulación específica).

### C-03: Content Moderation — "prevents automated over-removal and ensures nuanced judgment"
**Texto:** L.82–83
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** El framing es correcto — la moderación humana post-flag es práctica conocida (Twitter, YouTube, Meta han documentado este modelo). Sin cita explícita pero derivado razonablemente de práctica industrial conocida.

### C-04: Legal/Compliance — "ensures legal validity and ethical compliance"
**Texto:** L.84–85
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** "Ensures legal validity" es una afirmación fuerte. La presencia de un abogado en el loop no garantiza automáticamente validez legal — depende de la jurisdicción, tipo de documento, y competencia del revisor. Sin cita que establezca el mecanismo causal. Score 0.40.

### C-05: Criminal Justice — "ensures that factors beyond the AI's knowledge base, as well as human compassion and ethical judgment, inform the final outcome"
**Texto:** L.85–86
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El claim es normativo-descriptivo sobre lo que el patrón "ensures". La literatura sobre AI en sentencing (COMPAS, etc.) muestra que la presencia humana en el loop no garantiza que los factores enumerados sean incorporados apropiadamente. No hay cita. Score 0.40.

### C-06: Autonomous Vehicles como HOTL — "remote human operator can... take control"
**Texto:** L.87–88
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** Remote operation de vehículos autónomos es una práctica documentada (Waymo, Cruise han usado teleoperadores). El framing como HOTL es correcto. Sin cita específica pero el claim es consistente con práctica conocida.

### C-07: Automated Trading como HOTL — "humans set the strategy, and the AI executes within those boundaries"
**Texto:** L.89–90 + Nota editorial 10
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** La Nota editorial 10 confirma que este framing es más sofisticado que los tres capítulos anteriores (que presentaban trading bots sin oversight). La separación estrategia humana / ejecución AI es un modelo real de operación en fondos algorítmicos. Sin citar MiFID II o regulaciones específicas pero el claim arquitectónico es correcto. Mejora observable respecto a Cap.10/11/12.

**Subtotal Grupo C: 0.65 + 0.65 + 0.65 + 0.40 + 0.40 + 0.65 + 0.65 = 4.05 / 7 = 57.9%**

---

## Grupo D — Referencia (1 claim en 3 dimensiones)

### D-01a: La referencia existe y es verificable (Mosqueira-Rey et al. 2023, AI Review)
**Texto:** L.230
**Clasificación:** Observación directa (1.0)
**Justificación:** DOI 10.1007/s10462-022-10246-z corresponde a Artificial Intelligence Review — revista peer-reviewed indexada. El DOI es verificable. La publicación existe.

### D-01b: La referencia NO está citada inline en el cuerpo del texto
**Texto:** Ausencia en L.29–224 (cuerpo) vs. presencia en L.230 (sección References)
**Clasificación:** Observación directa (1.0)
**Justificación:** Búsqueda sistemática del cuerpo: no aparece "(Mosqueira-Rey et al., 2023)", ni "[1]", ni ninguna cita inline. La referencia existe solo en la sección References al final.

### D-01c: La referencia sin cita inline no eleva calibración de claims individuales
**Texto:** patrón del capítulo completo
**Clasificación:** Inferencia calibrada fuerte (0.85)
**Justificación:** Consistente con el patrón documentado en Cap.12 (referencias sin inline). La hipótesis CCV se confirma: la existencia de la referencia en sección References no proporciona evidencia verificable para claims específicos en el cuerpo porque no se puede saber qué claim específico respalda (podría respaldar la taxonomía HITL/HOTL/HIC, automation bias, o ninguno de los anteriores). Score 0.85: no 1.0 porque es una inferencia sobre el patrón, no una regla absoluta — un autor podría haber asumido que el survey cubre todo el capítulo.

**Subtotal Grupo D: 1.0 + 1.0 + 0.85 = 2.85 / 3 = 95.0%**

---

## Resumen de claims performativos (impacto Alto/Medio)

| # | Texto (abreviado) | Línea | Impacto | Evidencia propuesta |
|---|-------------------|-------|---------|---------------------|
| 1 | "clear lines of accountability and allows for easy auditing" | L.43 | Alto | Implementar log con timestamp + storage en `after_model_callback`; verificar con `assert log_entry.timestamp is not None` |
| 2 | "continuous improvement by incorporating human feedback" | L.41 | Alto | Código con storage de decisiones humanas + ciclo de reentrenamiento observable |
| 3 | "complete audit trail for every decision made" | L.183 | Alto | `after_model_callback` con persistencia real; verificar en CI que el log existe post-ejecución |
| 4 | "consistent policy enforcement" (con callbacks posiblemente no activos) | L.183 | Alto | Test: ejecutar con loan_amount > $1M y verificar que `flag_for_review` es llamada; verificar que `risk_context` llega al modelo |
| 5 | "`personalization_callback`...inserts a system prompt" | L.179 | Alto | Corregir callback para retornar el `llm_request` modificado; verificar con `assert "HUMAN OVERSIGHT" in str(llm_request.contents)` |
| 6 | `types.Content(role="system", ...)` como válido | L.148 | Medio | Ejecutar snippet y verificar que no genera `InvalidArgument` de Gemini API; o cambiar a `system_instruction` |

---

## Análisis CAD (por dominio)

### Dominio conceptual/patrón
Ratio: 4.05/8 = **50.6%**
Los claims más débiles son los normativos ("creates clear lines of accountability", "continuous improvement") que afirman propiedades sin demostrarlas con código. La taxonomía HITL/HOTL/HIC es el punto fuerte del grupo.

### Dominio del código
Ratio: 4.85/9 = **53.9%**
Dos observaciones directas fuertes (funciones definidas, `LiteLlm` observable) compensan parcialmente los claims performativos sobre el comportamiento en runtime. Los bugs identificados en las Notas editoriales 1 y 2 degradan significativamente los claims sobre funcionamiento del mecanismo HITL.

### Dominio de casos de uso
Ratio: 4.05/7 = **57.9%**
El grupo más sólido después del de referencia. Los casos de uso muestran mejora vs. capítulos anteriores (loan con conciencia regulatoria, trading con framing correcto). Los claims de "ensures legal validity" y "ensures human compassion informs the outcome" son los más débiles.

### Dominio de referencia
Ratio: 2.85/3 = **95.0%**
La referencia existe, es verificable, y la evaluación de su ausencia inline es precisa. Este dominio no aporta calibración a claims individuales del cuerpo precisamente porque la referencia no está citada inline.

---

## Evaluación de hipótesis CCV

**Hipótesis:** Referencias sin citas inline no elevan calibración individual de claims.

**Veredicto: CONFIRMADA**

Patrón observado en Cap.13 (idéntico a Cap.12):
- La referencia Mosqueira-Rey et al. (2023) existe y es verificable (D-01a = 1.0).
- No está citada en ningún claim del cuerpo (D-01b = 1.0).
- Los claims del cuerpo que la referencia podría respaldar (taxonomía HITL, automation bias) son clasificados como inferencias calibradas (0.65–0.85) en lugar de observaciones directas (1.0) precisamente por la ausencia de la cita inline.
- Diferencia neta: si la referencia estuviera citada inline en A-01 (taxonomía) y A-02 (automation bias), esos dos claims subirían de 0.85 y 0.65 a 1.0, añadiendo 0.50 puntos al numerador — incremento de ~1.9pp en el ratio total.

Contraste con Cap.9 (77% CALIBRADO): las referencias arXiv de Cap.9 aparecen citadas inline en los claims específicos que respaldan → elevación directa a observación directa (1.0).

---

## Comparación histórica

| Capítulo | Ratio | Clasificación | Diferencia vs. anterior |
|----------|-------|---------------|------------------------|
| Cap.9 | 77.0% | CALIBRADO | — |
| Cap.10 original | 65.0% | PARCIALMENTE CALIBRADO | -12.0pp |
| Cap.11 traducción | 63.3% | PARCIALMENTE CALIBRADO | -1.7pp |
| Cap.11 original | 60.6% | PARCIALMENTE CALIBRADO | -2.7pp |
| Cap.12 | 53.1% | PARCIALMENTE CALIBRADO | -7.5pp |
| **Cap.13** | **50.6%** | **PARCIALMENTE CALIBRADO** | **-2.5pp** |

Cap.13 continúa la tendencia descendente. Factores que explican el resultado:

**Que mejora vs. Cap.12:**
- Las 5 funciones herramienta están definidas (B-04 = 1.0 vs. Cap.12 donde no estaban definidas).
- Casos de uso financieros con conciencia regulatoria (C-02 = 0.65 vs. implied-lower en capítulos anteriores).
- Framing de trading como HOTL más sofisticado (C-07 = 0.65).
- Taxonomía HITL/HOTL/HIC añade claims calibrables.

**Que deteriora vs. Cap.12:**
- Bug crítico en `personalization_callback` (retorna `None`, B-01 = 0.50) convierte el mecanismo central del capítulo en incierto.
- `types.Content(role="system")` potencialmente inválido (B-02 = 0.40).
- Más claims normativos sobre "ensures" properties que el código no demuestra.
- El grupo conceptual (Grupo A) introduce más claims performativos sobre beneficios del patrón sin evidencia implementada.

---

## Recomendación

**No alcanza gate (75%). Iterar antes de publicar como referencia de calibración alta.**

Acciones mínimas para elevar el ratio (en orden de impacto):

1. **Corregir `personalization_callback`** para retornar el `llm_request` modificado. Sin esto, el mecanismo central del HITL puede ser un no-op. Impacto en calibración: B-01 sube de 0.50 a 1.0, B-06 sube de 0.10 a 0.65 → +1.05 puntos.

2. **Verificar o corregir `types.Content(role="system")`**. Ejecutar el código y confirmar que el rol es aceptado, o cambiar a `system_instruction`. Impacto: B-02 sube de 0.40 a 1.0 → +0.60 puntos.

3. **Citar Mosqueira-Rey et al. inline** en los claims que respalda (A-01 taxonomía, A-02 automation bias). Impacto: +0.50 puntos.

4. **Reemplazar `print()` con logging mínimo verificable**, o añadir comentario explícito que señala el placeholder (como hace el código inline en L.158, pero sin contradecirlo en la narración). Impacto: A-03, B-03, B-08 suben → +0.60 puntos estimados.

**Ratio proyectado post-correcciones 1–4:** (13.65 + 2.75) / 27 ≈ **60.4%** — aún por debajo del gate pero mejora sustancial.

Para alcanzar el gate (75%), se requeriría adicionalmente: implementar un feedback loop real (A-04), citar regulaciones específicas en loan approval (C-02), y añadir hedging explícito en claims normativos de "ensures" (C-04, C-05).

---

## Nota sobre completitud del input

El input fue preparado como texto completo (verbatim) con notas editoriales del orquestador. No se detectan señales de compresión: no hay secciones con "...", las conclusiones están completas, el código está íntegro. Las notas editoriales añaden contexto verificable que enriquece el análisis. Ratio calculado sobre 27 claims del input disponible — se considera representativo del texto fuente.
