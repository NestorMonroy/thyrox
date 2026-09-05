```yml
Fecha: 2026-03-31
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: 3 Problemas de Consistencia

---

## 1. Key Ideas

```
Idea 1: El framework debe seguir sus propias reglas sin excepción
  Descripción: Si SKILL dice kebab-case, TODO es kebab-case. Sin excepciones.
  Impacto: Credibilidad del framework — si el creador no sigue las reglas,
    nadie las seguirá (L-017)

Idea 2: Separar lo que es del framework de lo que es del proyecto
  Descripción: Las decisiones del framework (cómo funciona pm-thyrox) no deben
    ocupar el mismo espacio que las decisiones del proyecto (qué stack usar)
  Impacto: Template limpio — el usuario empieza sin decisiones ajenas

Idea 3: El SKILL debe ser unavoidable, no opcional
  Descripción: Si Claude puede ignorar el framework completo cuando el usuario
    dice "arregla este bug", el framework no funciona
  Impacto: El flujo de sesión en CLAUDE.md necesita ser más directivo
```

---

## 1b. Research Step

### Unknown 1: ¿Renombrar assets rompe algo?

**Investigación — ¿quién referencia los 3 archivos UPPERCASE?**

Los 3 archivos a renombrar: `AD_HOC_TASKS.md.template`, `EXIT_CONDITIONS.md.template`, `REFACTORS.md.template`

Necesito verificar qué archivos los referencian para actualizar los links.

**Decisión:** Renombrar + actualizar todas las referencias. grep antes de renombrar.

### Unknown 2: ¿Qué hacer con los 12 ADRs del framework?

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | setup-template.sh limpia context/decisions/ completo | Template limpio, 0 decisiones ajenas | El usuario pierde los ADRs como referencia de cómo se toman decisiones |
| B | Mover ADRs a skills/pm-thyrox/references/framework-decisions.md | Separación clara, disponible como referencia | Un archivo más en references |
| C | setup-template.sh limpia + deja 1 ADR de ejemplo | Template limpio + el usuario ve el formato | El ejemplo puede confundir |
| D | Marcar ADRs como "Framework ADR" en metadata + setup limpia | Separación conceptual + limpieza en template | Nadie lee el metadata |

**Evidencia de proyectos de referencia:**
- spec-kit: no tiene ADRs del framework en el template
- Cortex-Template: constitution es Layer 0 (separado de decisions)
- agentic-framework: decisions viven en el playbook, no en state

**Decisión: A — setup-template.sh limpia context/decisions/**
- El usuario empieza con 0 ADRs
- Los ADRs del framework ya están codificados como "Locked Decisions" en CLAUDE.md (son las mismas 7 reglas)
- Si el usuario quiere ver ejemplos de ADRs, el template `assets/adr.md.template` está disponible
- **Justificación:** Duplicación — las locked decisions en CLAUDE.md YA SON los 12 ADRs resumidos. No necesitan estar como archivos separados en el template distribuido.

### Unknown 3: ¿Cómo hacer el SKILL unavoidable?

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | CLAUDE.md: "Siempre consultar SKILL antes de actuar" | Simple, directivo | Puede ser ignorado (soft) |
| B | CLAUDE.md: "Para TODO trabajo, seguir el flujo de sesión" con SKILL como paso obligatorio | Más fuerte que A | Agrega palabras a CLAUDE.md |
| C | Hook que pregunta "¿en qué fase estás?" al inicio | Hard enforcement | Intrusivo, no todos los proyectos lo quieren |
| D | Reescribir flujo de sesión para que SKILL sea parte integral, no paso separado | Natural, integrado | Requiere repensar CLAUDE.md |

**Evidencia:**
- El flujo actual dice: "2. Contexto — Identificar fase actual. Consultar SKILL."
- Pero no dice "obligatorio" ni "siempre"
- Cuando el usuario dice "arregla este bug", Claude va directo a código
- El skill description tiene triggers pero solo para activar el skill file, no para forzar el flujo

**Decisión: D — Reescribir flujo de sesión**
- Cambiar el flujo de sesión para que sea: "Antes de cualquier trabajo, identificar fase actual. Todo trabajo sigue una fase."
- Agregar en CLAUDE.md: "Todo trabajo pasa por el SKILL — incluso un bug fix usa Phase 1→6 (abreviado para <2h)."
- **Justificación:** El SKILL ya define escalabilidad (trabajos <2h usan fases 1,2,6,7). El problema es que CLAUDE.md no comunica que TODO trabajo pasa por el SKILL.

---

## 2. Fundamental Decisions

```
Decision 1: Renombrar 3 assets UPPERCASE a kebab-case
  Alternatives: Dejar como están, crear alias
  Justification: El SKILL dice kebab-case. Sin excepciones.
  Implications: Actualizar todas las referencias (grep antes de renombrar)

Decision 2: setup-template.sh limpia context/decisions/
  Alternatives: Mover a references, dejar como ejemplo, marcar como framework
  Justification: Locked Decisions en CLAUDE.md ya codifican los 12 ADRs.
    Duplicación innecesaria. Template limpio > template con bagaje.
  Implications: El usuario empieza con 0 ADRs. Usa adr.md.template para crear nuevos.

Decision 3: Reescribir flujo de sesión para SKILL obligatorio
  Alternatives: Solo agregar "siempre", hook de inicio, no cambiar
  Justification: El SKILL ya soporta escala (fases 1,2,6,7 para <2h).
    El gap es que CLAUDE.md no comunica que todo trabajo pasa por el SKILL.
  Implications: CLAUDE.md flujo de sesión se reescribe (~2 líneas cambian).
```

---

## 3. Technology Stack

```
No requiere tech stack adicional. Solo renombrados, ediciones a CLAUDE.md
y setup-template.sh.
```

---

## 4. Patterns

```
Structural: Self-compliance (el framework sigue sus propias reglas)
Behavioral: Clean template (el usuario empieza sin bagaje del framework)
Architectural: Unavoidable methodology (el SKILL no es opcional)
```

---

## 5. Quality Goals → Solution

```
Quality Goal: El framework sigue sus propias convenciones
  Approach: Renombrar 3 assets, verificar que no queden excepciones
  Medición: 0 archivos que violen kebab-case en assets/

Quality Goal: Template limpio sin confusión framework/proyecto
  Approach: setup-template.sh limpia decisions/ y errors/
  Medición: 0 ADRs del framework en context/decisions/ post-setup

Quality Goal: SKILL unavoidable para todo trabajo
  Approach: Flujo de sesión explícito: "Todo trabajo pasa por el SKILL"
  Medición: Eval test — "arregla este bug" debe activar Phase 1 análisis
```

---

## Pre-design check

| Principio | ¿Respetado? |
|-----------|------------|
| ANALYZE first | ✅ Análisis completado antes de decidir |
| Anatomía oficial | ✅ No se agregan archivos nuevos |
| Git as persistence | ✅ N/A |
| Markdown only | ✅ N/A |
| Single skill | ✅ Todo en pm-thyrox |
| Work packages | ✅ Timestamped |
| Conventional commits | ✅ Se seguirá |

## Post-design re-check

| Decisión | ¿Viola principio? |
|----------|------------------|
| Renombrar assets | No — fortalece "Naming: kebab-case" |
| Limpiar decisions/ en setup | No — ya están en locked decisions de CLAUDE.md |
| Reescribir flujo | No — fortalece "ANALYZE first" |

---

## Siguiente

→ Phase 3+5: PLAN + DECOMPOSE
