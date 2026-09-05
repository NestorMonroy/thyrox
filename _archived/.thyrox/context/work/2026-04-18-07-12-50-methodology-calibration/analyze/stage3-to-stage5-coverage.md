```yml
created_at: 2026-04-19 17:15:12
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — DIAGNOSE
author: deep-review
status: Borrador
version: 1.0.0
cobertura_global: 52%
gaps_criticos: 2
gaps_altos: 2
gaps_medios: 1
gaps_bajos: 1
recomendacion: Iterar Stage 3 o ejecutar Stage 4 antes de Stage 5
```

# Deep-Review: Stage 3 DIAGNOSE → Stage 5 STRATEGY — Cobertura

## Cobertura global: 52% (7 de 13 necesidades cubiertas)

Stage 3 produjo un diagnóstico causal coherente con Stage 2, pero operó como una síntesis
de síntomas documentados — no como una investigación del mecanismo subyacente. El 48% de
brecha no es falta de análisis sino **profundidad insuficiente en los puntos exactos donde
Stage 5 toma decisiones arquitectónicas**.

---

## Gaps encontrados: 6

### Gap 1 — Mecanismo de carga de `@imports` no diagnosticado (TD-040 nombrado pero no resuelto)
**Severidad: CRÍTICO**

**Origen:** `diagnose.md` no menciona TD-040 en ninguna sección. `baseline.md` tampoco lo
toca. TD-040 en `technical-debt.md` dice explícitamente: "verificación pendiente — el
comportamiento de `@path` para `.instructions.md` no está documentado como verificado
en producción."

**Lo que Stage 3 hizo:** Declaró que la solución al Eje 1 es crear
`agentic-python.instructions.md`. No diagnosticó si el mecanismo que haría funcionar ese
archivo (`@imports` en CLAUDE.md) está verificado.

**Lo que Stage 5 necesita:** Para decidir entre (A) crear `agentic-python.instructions.md`
como nuevo guideline vía `@imports`, o (B) mover las reglas a `.claude/rules/` como
mecanismo oficial verificado, Stage 5 necesita saber si `@imports` sobre `.instructions.md`
funciona en producción. Sin esto, Stage 5 tomará una decisión arquitectónica sobre un
mecanismo cuyo funcionamiento es desconocido.

**Impacto:** CRÍTICO — si el mecanismo falla, el Eje 1 completo (mayor severidad según el
diagnóstico) no tendrá efecto real aunque se implemente correctamente.

**Acción recomendada:** Completar TD-040 antes de avanzar a Stage 5, o documentar en
Stage 5 que la decisión debe incluir un plan de verificación. Stage 3 debió haber
diagnosticado el mecanismo, no solo el gap de contenido.

---

### Gap 2 — Alternativas para el Eje 1 no evaluadas (solución directa sin comparación)
**Severidad: ALTO**

**Origen:** `diagnose.md` líneas 75-76: "La solución es agregar un nuevo archivo de
guidelines (no modificar `python-mcp.instructions.md`) o extender explícitamente el scope
existente." Stage 3 no evaluó las alternativas entre sí.

**Lo que Stage 5 necesita para el ADR "nuevo archivo vs extensión de python-mcp":**
- `python-mcp.instructions.md` declara "Aplica a: `registry/mcp/*.py`, `registry/bootstrap.py`,
  cualquier `.py` en el proyecto" — el scope textual ya es amplio, el nombre es el que engaña.
  Extender puede ser correcto sin ser engañoso.
- Un nuevo archivo requiere un nuevo `@import` en CLAUDE.md que depende del mecanismo no
  verificado (Gap 1).
- Un archivo separado implica dos fuentes de verdad para Python, con riesgo de divergencia.

**Impacto:** ALTO — sin esta evaluación, el ADR de Stage 5 será una elección sin
justificación derivada.

---

### Gap 3 — Alternativas para el agente `agentic-validator` no investigadas
**Severidad: ALTO**

**Origen:** `diagnose.md` líneas 131-133: "La solución requiere crear un nuevo agente
`agentic-validator`." Esta es una conclusión sin evaluación de alternativas.

**Lo que Stage 3 no evaluó:**
- Si `deep-dive` puede ser parametrizado con el catálogo AP como input adicional sin crear
  un nuevo agente
- Si el catálogo AP debería vivir en el `system_prompt` del agente o como reference file
  que el agente carga en cada invocación
- Qué constraint impone el registry sobre `system_prompt` de tamaño (30 APs con ejemplos
  es contenido voluminoso)

**Lo que Stage 5 necesita:**
- Si el catálogo AP cabe en `system_prompt` o requiere carga vía `Read` en runtime
- Si bootstrap.py soporta `system_prompt` con el tamaño necesario
- Si un agente nuevo es la única opción o si puede resolver con `description` extendida
  de `deep-dive`

**Impacto:** ALTO — la decisión de arquitectura del agente es el output principal de
Stage 5 para el Eje 2.

---

### Gap 4 — Impacto de TD-037 en el diseño del agente no analizado
**Severidad: MEDIO**

**Origen:** TD-037 en `technical-debt.md`: el campo `model:` está PROHIBIDO en YMLs
según README del registry, pero todos los tech-experts lo tienen. Stage 3 no menciona
TD-037 en ninguna sección del diagnóstico.

**Lo que Stage 5 necesita:** Para decidir cómo especificar el agente validador en el YML,
necesita saber si puede o no especificar un modelo. La prohibición en README vs la
práctica actual en los YMLs crea ambigüedad — Stage 5 necesita saber cuál prevalece
antes de crear el YML.

**Impacto:** MEDIO — no bloquea el diseño pero introduce incertidumbre en la
especificación formal del agente.

---

### Gap 5 — Restricciones del sistema mezcladas con diagnóstico, no formalizadas
**Severidad: MEDIO**

**Origen:** `diagnose.md` mezcla en un mismo documento causas raíz, soluciones propuestas
y restricciones implícitas. Las restricciones reales no están separadas como constraints:

- CLAUDE.md menciona riesgo de saturación de context budget con más de 2-3 skills
  simultáneos — la misma lógica aplica a guidelines, pero no está evaluada
- El registry README prohíbe `model:` pero la práctica actual lo incluye — estado ambiguo
- `workflow-standardize/SKILL.md` tiene un proceso para propagar patrones (Eje 3) pero
  Stage 3 lo describe como "gap de proceso" sin verificar qué hace el SKILL actual vs qué necesita

El directorio `constraints/` del WP existe vacío — Stage 4 no se ejecutó. Stage 5
arrancará sin restricciones formalizadas.

**Impacto:** MEDIO — si Stage 5 asume restricciones no derivadas, reproduce el realismo
performativo que R-01 del risk-register busca evitar.

---

### Gap 6 — Eje 3 (patrones consultables) delega a Stage 12 sin análisis del formato
**Severidad: BAJO**

**Origen:** `diagnose.md` líneas 188-191: "La solución no requiere cambiar el proceso
THYROX — requiere llegar a Stage 10 IMPLEMENT." Stage 3 no analizó si el template de
`workflow-standardize/SKILL.md` tiene soporte para crear patrones desde un catálogo de
30 APs, ni qué formato deberían tener los patrones para ser consultables.

**Impacto:** BAJO — no bloquea Stage 5, pero la estrategia del Eje 3 quedará
subdesarrollada si Stage 5 hereda solo "llegar a Stage 12".

---

## Items correctamente cubiertos: 7

| # | Item cubierto | Calidad |
|---|--------------|---------|
| 1 | Causa raíz Eje 1 derivada de evidencia real (5-Whys trazable) | Alta |
| 2 | Causa raíz Eje 2 derivada de evidencia real (23 agentes ninguno valida código agentic) | Alta |
| 3 | Interdependencia de los 3 ejes documentada (mapa causal integrado) | Alta |
| 4 | Severidad diferenciada por eje derivada de la naturaleza del gap | Media |
| 5 | Causa raíz sistémica secundaria identificada (sin mecanismo propagación) | Alta |
| 6 | Clasificación de gaps por tipo de solución (tabla de complejidad) | Media |
| 7 | Alineación Stage 2 → Stage 3 (3 ejes corresponden a los 3 ejes de baseline.md) | Alta |

---

## Discrepancia verificada

`baseline.md` dice "23 agentes existentes". El conteo real en `.claude/agents/` es 25
archivos. La diferencia: `deep-review.md` y `diagrama-ishikawa.md` no listados en el
inventario original. El diagnóstico de Stage 3 no es incorrecto — ninguno valida código
agentic — pero el inventario base tiene error menor de conteo.

---

## Evaluación de preguntas específicas

| Pregunta | Respuesta |
|---------|-----------|
| ¿Stage 3 analizó mecanismo @imports o solo nombró TD-040? | Solo nombró el gap de contenido. TD-040 no aparece en diagnose.md. Ver Gap 1. |
| ¿Stage 3 evaluó alternativas para cada eje? | No. Propuso solución directa para los 3 ejes. Ver Gaps 2 y 3. |
| ¿Los 3 ejes causales están derivados de evidencia? | Sí — los 5-Whys tienen trazabilidad a observaciones reales. Punto más sólido. |
| ¿Stage 3 documentó restricciones de implementación? | No. Quedan implícitas. `constraints/` vacío — Stage 4 no ejecutado. |
| ¿Hay decisiones que Stage 5 tomará sin evidencia de Stage 3? | Sí: 4 decisiones arquitectónicas (mecanismo @imports, nuevo archivo vs extensión, arquitectura agente, TD-037 en YML). |

---

## Recomendación

**Iterar Stage 3 o ejecutar Stage 4 antes de Stage 5.**

El diagnóstico causal de Stage 3 es sólido — los 3 ejes son correctos y derivados de
evidencia. El problema es que Stage 3 entregó conclusiones de solución donde debía
entregar preguntas diagnósticas sin respuesta.

**Ruta mínima para avanzar a Stage 5 sin riesgo de R-01 (realismo performativo):**

1. Verificar empíricamente TD-040 — prueba de sesión con `@import` activo (15 min).
   Si falla: la arquitectura del Eje 1 cambia completamente.
2. Documentar Stage 4 CONSTRAINTS con restricciones reales (context budget de guidelines,
   estado ambiguo de TD-037, capacidad de `system_prompt` en bootstrap.py). Stage 4 ligero:
   1 artefacto.

Sin estos dos pasos, Stage 5 tomará al menos 2 decisiones arquitectónicas sobre mecanismos
cuyo funcionamiento real es desconocido — exactamente lo que este WP combate.
