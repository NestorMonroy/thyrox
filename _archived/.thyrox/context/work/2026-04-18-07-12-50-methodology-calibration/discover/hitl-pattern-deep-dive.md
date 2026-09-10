```yml
created_at: 2026-04-19 10:38:37
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "Chapter 13: Human in the Loop" (documento externo, 2026-04-19)
veredicto: PARCIALMENTE VÁLIDO
bugs_críticos: 4
contradicciones: 4
patron_dominante: "El mecanismo que da nombre al patrón (human blocking loop) no está implementado — el código demuestra un agente con herramientas opcionales de escalada, no un sistema HITL real"
```

# Deep-Dive Adversarial — Chapter 13: Human in the Loop

---

## CAPA 1: Lectura inicial

### Estructura y tesis del capítulo

El capítulo presenta HITL como filosofía de diseño fundamental para AI en dominios de alto riesgo. Estructura observable:

- **Introducción** → justificación del problema (automation bias, accountability, continuous improvement)
- **Pattern Overview** → taxonomía HITL/HOTL/HIC + componentes arquitectónicos
- **Practical Applications** → 7 casos de uso en dominios regulados
- **Código ADK** → loan approval agent con 5 herramientas + 2 callbacks
- **At a Glance / Key Takeaways / Conclusion** → síntesis de garantías del patrón

**Tesis central declarada:** Los callbacks ADK (`before_model_callback` = `personalization_callback`, `after_model_callback`) implementan oversight sistemático: el primero inserta reglas de riesgo antes de cada llamada al modelo; el segundo mantiene un audit trail completo de cada decisión.

**Mecanismo de soporte:**
```
Input usuario → personalization_callback (inserta risk_context) → LLM →
LLM decide si llama flag_for_review / approve_loan / reject_loan →
after_model_callback (loguea decisión) → output
```

### Lo que el capítulo presenta como garantías

1. "complete audit trail for every decision made" (Sec. Code description)
2. "ensures consistent policy enforcement" (Sec. Code description)
3. "there's always a human who can explain and justify the final outcomes" (Sec. Intro)
4. "continuous improvement by incorporating human feedback" (Sec. Intro)
5. "HITL errs on the side of involving humans" (Sec. At a Glance)
6. "compliance with lending regulations" (Sec. Code, system instruction del agente)

### Mejoras respecto a capítulos anteriores (contexto comparativo)

- A diferencia de Cap.12, las 5 funciones herramienta están definidas con `return` statements
- El framing de "Automated Trading" separa correctamente estrategia humana de ejecución AI (más maduro que Cap.10/11/12)
- Mención explícita de "fairness and compliance with lending regulations" — conciencia regulatoria ausente en los tres capítulos anteriores
- Una referencia peer-reviewed real (Mosqueira-Rey et al., 2023, Artificial Intelligence Review)

---

## CAPA 2: Aislamiento de capas

### Sub-capa 1: Frameworks teóricos

| Framework | Ubicación | Estado |
|-----------|-----------|--------|
| Taxonomía HITL/HOTL/HIC | Sec. Pattern Overview | VERDADERO — terminología estándar en literatura de autonomía de sistemas, verificable en Mosqueira-Rey (2023) y literatura de HRI |
| "automation bias" — concepto | Sec. Intro | VERDADERO como concepto (Parasuraman & Manzey, 2010; Mosier & Skitka, 1996) — pero sin cita inline en el capítulo |
| ADK `before_model_callback` / `after_model_callback` | Sec. Código | INCIERTO — el capítulo no documenta el contrato de retorno de ADK; la implementación viola ese contrato |

### Sub-capa 2: Aplicaciones concretas

| Aplicación | Ubicación | Estado |
|-----------|-----------|--------|
| Medical diagnosis → radiologist review | Sec. Use Cases | VERDADERO como patrón arquitectónico real; analógico, no derivado del código |
| Loan approval → loan officer review | Sec. Use Cases + Código | INCIERTO — el código no implementa bloqueo real antes del human review |
| Autonomous vehicles como HOTL | Sec. Use Cases | VERDADERO como categorización conceptual; no tiene código de soporte |
| Automated trading como HOTL | Sec. Use Cases | VERDADERO como framing arquitectónico — mejora real vs. Cap.10/11/12 |

### Sub-capa 3: Números específicos

| Valor | Ubicación | Estado |
|-------|-----------|--------|
| "loan amounts > $1M: ALWAYS flag" | risk_context en personalization_callback | SIN DERIVACIÓN — no cita ECOA, Reg B, Fair Housing Act, ni ninguna fuente regulatoria |
| "credit scores < 650: ALWAYS flag" | risk_context en personalization_callback | SIN DERIVACIÓN — el umbral estándar de FICO para "subprime" varía por institución y regulación; 650 no tiene base normativa citada |
| "debt-to-income > 0.43: ALWAYS flag" | risk_context en personalization_callback | PARCIALMENTE DERIVABLE — 0.43 (43%) es el umbral de DTI para "qualified mortgage" bajo Dodd-Frank (12 CFR §1026.43), pero el capítulo no lo cita |
| "business loans > $500K: Recommend review" | risk_context | SIN DERIVACIÓN — umbral inventado sin fuente regulatoria |

### Sub-capa 4: Afirmaciones de garantía

| Garantía declarada | Evidencia en código | Veredicto |
|-------------------|---------------------|-----------|
| "complete audit trail" | `print(f"Decision logged...")` | FALSO — print no es audit trail |
| "consistent policy enforcement" | `personalization_callback` retorna `None` | INCIERTO/PROBABLEMENTE FALSO |
| "humans always can explain final outcomes" | No hay bloqueo de workflow | FALSO como implementación |
| "continuous improvement via human feedback" | Sin mecanismo de captura de feedback | FALSO como implementación |
| "compliance with lending regulations" | System prompt mention, sin reglas específicas | INCIERTO — no cita regulación específica |

---

## CAPA 3: Saltos lógicos

```
SALTO-1: callback instalado → oversight activo
Premisa: personalization_callback está registrado en before_model_callback
Conclusión: "ensures consistent policy enforcement" (Sec. Code description)
Tipo de salto: extrapolación sin verificar contrato de retorno de ADK
Tamaño: CRÍTICO
Justificación que debería existir: documentar que ADK modifica el objeto por referencia
  Y que return None preserva las modificaciones in-place; OR cambiar el código para
  retornar el objeto modificado explícitamente.
```

```
SALTO-2: types.Content(role="system") insertado → modelo recibe risk_context
Premisa: llm_request.contents.insert(0, types.Content(role="system", ...))
Conclusión: el LLM procesa las reglas de oversight
Tipo de salto: aplicación de concepto de otro sistema (OpenAI role="system") a ADK/Gemini
Tamaño: CRÍTICO
Justificación que debería existir: Gemini/ADK usa system_instruction, no role="system"
  en contents; el capítulo debe verificar el schema de LlmRequest y confirmar que
  este role es válido, o usar el mecanismo correcto.
```

```
SALTO-3: print() → audit trail de producción
Premisa: print(f"Decision logged for audit: {llm_response}")
Conclusión: "a complete audit trail for every decision made" (Sec. Code description)
Tipo de salto: conclusión especulativa — placeholder descrito como sistema de producción
Tamaño: CRÍTICO
Justificación que debería existir: explicitar que es un placeholder; en producción
  se requiere persistencia a storage durable, timestamp, transaction ID, user ID,
  hash de integridad, y retención configurable.
```

```
SALTO-4: flag_for_review herramienta disponible → HITL real
Premisa: flag_for_review está en tools=[...] del agente
Conclusión: "human-in-the-loop" donde el humano está en el proceso de decisión
Tipo de salto: analogía sin derivación — disponibilidad de herramienta ≠ bloqueo de workflow
Tamaño: CRÍTICO
Justificación que debería existir: un sistema HITL real requiere que el workflow
  se detenga hasta recibir respuesta humana (interrupt/resume pattern), que hay
  una UI o canal de notificación para el reviewer, y que el agente no pueda
  continuar sin esa respuesta. Nada de eso existe en el código.
```

```
SALTO-5: LLM instruido para escalar → "errs on the side of involving humans"
Premisa: system instruction dice "If uncertain about any factor, flag for human review"
Conclusión: "HITL errs on the side of involving humans" (Sec. At a Glance)
Tipo de salto: el mismo mecanismo que puede equivocarse (el LLM) es el encargado
  de decidir cuándo escalar. Eso reproduce exactamente el automation bias que el
  patrón declara mitigar.
Tamaño: CRÍTICO
Justificación que debería existir: el escalado debería ser determinístico (threshold
  checks antes del LLM, no instrucciones al LLM), o el LLM debería ser el mecanismo
  secundario con verificación automática primaria.
```

```
SALTO-6: HOTL y HIC descritos en prosa → código demuestra los tres patrones
Premisa: la taxonomía define tres niveles de involvement
Conclusión: el capítulo presenta "different levels of human involvement" como opciones implementables
Tipo de salto: analogía sin derivación — solo HITL tiene un ejemplo de código;
  HOTL y HIC son descritos pero sin ninguna diferenciación en implementación
Tamaño: medio
Justificación que debería existir: código diferenciado para HOTL (monitoring sin bloqueo)
  vs HIC (override mechanism) vs HITL (blocking review).
```

---

## CAPA 4: Contradicciones

```
CONTRADICCIÓN-1:
Afirmación A: "there's always a human who can explain and justify the final outcomes"
  (Sec. Intro, párr. final)
Afirmación B: El código tiene approve_loan y reject_loan como herramientas que el LLM
  puede llamar directamente sin que ningún mecanismo de bloqueo requiera approval humano
  (Sec. Código, herramientas definidas en tools=[...])
Por qué chocan: Si el LLM llama approve_loan directamente, no hay ningún humano que
  haya revisado ni justificado la decisión. La garantía del texto requiere un interrupt
  pattern que el código no implementa.
Cuál prevalece: B (el código) — el texto describe una garantía que la arquitectura
  no puede cumplir.
```

```
CONTRADICCIÓN-2:
Afirmación A: "HITL explicitly addresses automation bias by requiring human review
  for complex or uncertain cases" (Sec. Why)
Afirmación B: El agente decide si llama flag_for_review basado en las instrucciones
  del system prompt — el mismo LLM que puede exhibir automation bias o estar
  equivocado es el que determina si escalar.
Por qué chocan: mitigar automation bias mediante instrucciones al agente que puede
  tener automation bias es circular. El mecanismo real de mitigación requería que
  la decisión de escalar estuviera fuera del control del LLM (thresholds determinísticos).
Cuál prevalece: B (análisis del diseño) — la arquitectura reproduce el problema
  que declara resolver.
```

```
CONTRADICCIÓN-3:
Afirmación A: "continuous improvement by incorporating human feedback into the
  decision-making process, creating a learning loop" (Sec. Intro)
Afirmación B: after_model_callback hace print() del response del LLM. No hay captura
  del feedback del human reviewer, no hay storage de la decisión final humana, no hay
  mecanismo de fine-tuning ni de actualización de reglas basado en revisión humana.
  (Sec. Código, after_model_callback)
Por qué chocan: "incorporating human feedback" requiere que el feedback exista como
  dato capturado. El código captura el output del LLM, no el input del humano.
Cuál prevalece: B (el código) — no hay feedback loop implementado en ningún punto
  del sistema.
```

```
CONTRADICCIÓN-4:
Afirmación A: "The after_model_callback runs after the model's response. It logs
  every decision for auditing purposes" / "a complete audit trail for every decision"
  (Sec. Code description)
Afirmación B: La implementación es:
  print(f"Decision logged for audit: {llm_response}")
  El comentario dice "In production, this would log to an audit system"
Por qué chocan: el texto de descripción del código habla en presente ("logs", "complete
  audit trail") mientras el comentario inline admite que NO está implementado
  ("this would log"). El texto de descripción contradice el comentario del propio código.
Cuál prevalece: B (comentario inline) — el código admite explícitamente que no es
  implementación de producción. La descripción textual es falsa.
```

---

## CAPA 5: Engaños estructurales

### P1 — Credibilidad prestada (framework válido → aplicación analógica)

La referencia Mosqueira-Rey et al. (2023) en *Artificial Intelligence Review* es real, peer-reviewed, y verificable (DOI: 10.1007/s10462-022-10246-z). El capítulo la lista en References pero no la cita inline en ningún punto del texto.

Los claims que dependen de esa credibilidad — "automation bias", "continuous improvement", "accountability" — se presentan como propiedades del patrón sin derivarlas del paper. El lector asume que los claims tienen respaldo del paper. No lo tienen: el paper podría contradecir las garantías específicas del capítulo (e.g., las condiciones bajo las cuales HITL realmente mitigates automation bias).

**Operación en este capítulo:** el paper aparece al final, el peso semántico del paper opera en toda la narrativa anterior, pero la conexión claim→paper nunca se establece.

### P2 — Notación formal encubriendo especulación

Los umbrales en risk_context ("$1M", "650", "0.43", "$500K") tienen formato de parámetros regulatorios derivados. El lector los lee como si vinieran de ECOA, Reg B, Dodd-Frank, o guidelines de lending. Solo el 0.43 tiene correspondencia real en Dodd-Frank §1026.43 (qualified mortgage DTI limit) — pero el capítulo no lo cita, convirtiendo un valor verificable en especulación.

Los otros tres valores son inventados con formato de política. En un sistema de loan approval en producción, usar umbrales sin base regulatoria es un riesgo de compliance real.

### P3 — Garantía en contexto distinto extrapolada

"Audit trail" tiene definición técnico-legal específica en banking (Bank Secrecy Act, SOX §802, FFIEC guidance): persistencia durable, timestamp preciso, identificador único por transacción, identidad del actor, inmutabilidad, retención por período definido.

El capítulo usa "audit trail" aplicado a `print()`. El lector de compliance o banking asume que el capítulo habla del mismo concepto que el auditor. No lo hace. La garantía opera con la credibilidad del término técnico sin cumplir sus requisitos.

### P4 — Limitación enterrada (ausente del texto)

El comentario inline `# In production, this would log to an audit system` admite que `after_model_callback` es un placeholder. El texto de descripción del código no menciona esto — dice "logs every decision for auditing purposes" en presente, sin qualifiers.

La limitación de `personalization_callback` retornando `None` no está documentada en ningún punto del capítulo (ni en el texto ni en comentarios). El lector no puede detectar el bug sin conocer el contrato de ADK.

### P5 — Profecía auto-cumplida (el patrón define su propia validación)

El capítulo define HITL como patrón donde "humans are directly involved in the decision-making process, often approving or rejecting AI suggestions". Luego presenta como implementación HITL un sistema donde el LLM puede llamar `approve_loan` directamente.

La etiqueta HITL se aplica al sistema porque tiene una herramienta llamada `flag_for_review`. La definición no exige que el humano DEBA revisar — solo que "often" lo haga. Eso hace que cualquier agente con una herramienta de escalada sea clasificable como HITL sin implementar el patrón real.

### P6 — El mecanismo del título es el menos implementado (patrón recurrente confirmado)

| Capítulo | Nombre del patrón | Feature menos implementada |
|----------|-------------------|---------------------------|
| Cap.10 | Dynamic Tool Discovery | Servidores hardcodeados en lugar de descubrimiento real |
| Cap.11 | Agent Monitoring | Silencia el fallo — misma salida que éxito |
| Cap.12 | Exception Handling | Fallback inoperable (state key nunca establecida) |
| **Cap.13** | **Human in the Loop** | **No hay loop real — no hay bloqueo de workflow hasta human review** |

El patrón es estructural: el nombre del capítulo identifica la feature central. El código implementa la infraestructura circundante (herramientas, callbacks, agente) pero el mecanismo que da nombre al patrón es un placeholder o está directamente ausente.

---

## CAPA 6: Veredicto

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| Taxonomía HITL/HOTL/HIC como conceptos | Terminología estándar en literatura de autonomía de sistemas | Mosqueira-Rey et al. (2023); literatura de HRI/HCI |
| "automation bias" existe y es un problema documentado | Parasuraman & Manzey (2010), Mosier & Skitka (1996) — el claim del capítulo es correcto, solo falta la cita | Literatura de automation research |
| A diferencia de Cap.12, las herramientas tienen cuerpo definido | Las 5 funciones tienen return statements concretos — el código puede ejecutarse parcialmente | Análisis directo del código |
| "Automated Trading" framing como estrategia humana + ejecución AI | Arquitectura más correcta que Cap.10/11/12; separa correctamente los roles | Comparación con capítulos anteriores |
| DTI > 0.43 tiene base regulatoria parcial | Dodd-Frank §1026.43 usa 43% como límite para qualified mortgage | Reg. federal verificable |
| La referencia Mosqueira-Rey et al. (2023) es real | DOI: 10.1007/s10462-022-10246-z verificable en Artificial Intelligence Review | DOI externo |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia |
|-------|-----------------|------------------------|
| "a complete audit trail for every decision made" | `print()` no es audit trail: sin persistencia, sin timestamp, sin transaction ID, sin integridad, sin retención | El propio comentario inline admite "In production, this would log to an audit system" |
| "consistent policy enforcement" vía personalization_callback | El callback retorna `None` — en ADK, None significa "usar request original"; la modificación in-place puede ser descartada si ADK hace deepcopy | Contrato de ADK before_model_callback |
| `risk_context` llega al modelo vía `types.Content(role="system", ...)` | En Gemini/ADK, role="system" no es un rol válido en `contents`; se usa `system_instruction` en configuración del modelo | ADK/Gemini API schema |
| "there's always a human who can explain and justify the final outcomes" | El LLM puede llamar approve_loan/reject_loan directamente; no hay interrupt pattern ni bloqueo de workflow | Análisis del código — tools incluye approve_loan y reject_loan sin gate humano |
| "continuous improvement by incorporating human feedback" | El código no captura feedback humano en ningún punto — after_model_callback captura el output del LLM, no la decisión del human reviewer | Análisis del código — ninguna función de captura de feedback existe |
| "HITL errs on the side of involving humans" | El mismo LLM que puede equivocarse es el que decide si escalar — reproduce el automation bias que el patrón declara mitigar | Análisis arquitectónico — decisión de escalada no es determinística |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría |
|-------|--------------------------|-----------------|
| "compliance with lending regulations" | El sistema prompt menciona compliance pero no cita regulaciones específicas; los umbrales en risk_context no tienen fuente normativa completa | Citar ECOA, Reg B, Fair Housing Act con umbrales derivados; verificar que $1M, 650, $500K corresponden a regulación específica |
| Si personalization_callback funciona en alguna versión de ADK | Depende del comportamiento interno de ADK al pasar objetos a callbacks (por referencia vs. deepcopy) | Acceso al código fuente de ADK o tests de verificación del comportamiento de mutación |
| Si types.Content(role="system") es aceptado silenciosamente o causa error | Depende de la versión de ADK/Gemini API y del manejo de validación | Tests contra la API real o inspección del schema de LlmRequest |
| "automation bias" como término específico aplicado a AI-to-AI (no solo human-to-AI) | El capítulo dice "for humans or other AI systems to over-trust automated decisions" — extender automation bias a AI-AI interactions es una generalización no trivial | Literatura específica sobre AI-AI automation bias (diferente de la literatura human-automation clásica de Parasuraman/Mosier) |

### Nota sobre mejoras genuinas vs. capítulos anteriores

Cap.13 tiene mejoras reales sobre Cap.10/11/12:

1. **Las herramientas están definidas** (vs. Cap.12 donde las funciones principales no existían)
2. **Conciencia regulatoria explícita** — aunque sin citas específicas, menciona "fairness and compliance with lending regulations" — primer capítulo de los cuatro en hacerlo
3. **Trading framing más maduro** — separa estrategia humana de ejecución AI correctamente
4. **Una referencia peer-reviewed real** — vs. capítulos anteriores sin ninguna referencia

Estas mejoras son reales pero no contradicen los bugs críticos. El núcleo del patrón sigue sin implementarse.

### Patrón dominante

**Nombre:** "HITL como conjunto de herramientas de escalada sin interrupt pattern"

**Descripción:** El capítulo implementa correctamente la infraestructura circundante del patrón (herramientas de loan management, callbacks instalados, agente configurado) pero el mecanismo central que define HITL — el bloqueo del workflow hasta que un humano revise y apruebe — está completamente ausente. La herramienta `flag_for_review` es una función que retorna `{"success": True}` y no hace nada más. No hay canal de notificación al human reviewer, no hay estado de "waiting for human", no hay mecanismo que impida al LLM continuar tomando decisiones después de llamar `flag_for_review`.

**Cómo opera en este capítulo:** El texto construye la narrativa de HITL como filosofía de diseño completa (accountability, audit trail, feedback loops, compliance) con credibilidad tomada de terminología real y una referencia peer-reviewed. El código implementa la estructura exterior que hace que el sistema "parezca" HITL (callbacks, herramienta de escalada nombrada `flag_for_review`). El lector que no conoce ADK y no analiza el contrato de retorno de `before_model_callback` — y que no pregunta "¿qué pasa después de que el agente llama flag_for_review?" — concluirá que el sistema implementa HITL. No lo implementa.

**Bugs críticos enumerados:**

1. **BUG-1** (`personalization_callback` retorna `None`): Las reglas de oversight posiblemente nunca llegan al LLM. El sistema HITL puede operar sin sus propias reglas de riesgo. Severidad: CRÍTICA — invalida el mecanismo central de enforcement de política.

2. **BUG-2** (`types.Content(role="system", ...)` en `contents`): ADK/Gemini no acepta role="system" en contents; el risk_context puede ser silenciosamente ignorado o causar error de validación. Severidad: CRÍTICA — segundo mecanismo por el cual las reglas de oversight no llegan al modelo.

3. **BUG-3** (no hay interrupt pattern): El agente puede llamar `approve_loan` o `reject_loan` directamente sin que ningún humano intervenga. `flag_for_review` es solo una herramienta opcional. Severidad: CRÍTICA — invalida el claim central del patrón.

4. **BUG-4** (`print()` como audit trail de producción): Sin persistencia, sin timestamp, sin transaction ID, sin integridad. El comentario del código admite que es placeholder; el texto de descripción lo presenta como producción. Severidad: ALTA — genera falsa expectativa de compliance en lectores de regulados.

---

## Síntesis ejecutiva

Cap.13 es el capítulo con más conciencia de las implicaciones del dominio de los cuatro analizados. Las mejoras son reales: herramientas definidas, conciencia regulatoria, referencia peer-reviewed, framing de trading más maduro. El nivel de sofisticación conceptual (taxonomía HITL/HOTL/HIC, casos de uso en dominios regulados, automation bias) es genuinamente mayor que los capítulos anteriores.

Sin embargo, el núcleo del patrón no está implementado. Un sistema HITL real requiere que el workflow se detenga hasta recibir respuesta humana. El código del capítulo es un agente LLM con herramientas de escalada opcionales — el LLM decide si escalar (reproduciendo el automation bias que el patrón declara mitigar), y si escala, el workflow no se bloquea de ninguna manera. El loop del "Human in the Loop" no existe en el código.

Los dos bugs de ADK (retorno `None` en before_model_callback, role="system" en contents) hacen que incluso las reglas de oversight configuradas en risk_context probablemente no lleguen al modelo. El sistema puede operar completamente sin sus propias salvaguardas.

El patrón estructural detectado en Cap.10/11/12 se confirma: el mecanismo que da nombre al capítulo es el menos implementado en el código.

**Veredicto final:** PARCIALMENTE VÁLIDO — la conceptualización es correcta, las mejoras respecto a capítulos anteriores son reales, pero las garantías centrales del patrón (oversight activo, audit trail, human blocking review, feedback capture) son FALSAS como implementaciones en el código presentado.
