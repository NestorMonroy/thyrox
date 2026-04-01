```yml
Tipo: Phase 2 — SOLUTION_STRATEGY
Work package: 2026-04-01-00-00-00-skill-activation-failure
Fecha: 2026-04-01
Status: draft
```

# Solution Strategy: SKILL Activation Failure

Problema raíz (Phase 1): El SKILL no se activa automáticamente en ningún modelo
porque CLAUDE.md no instruye invocar el Skill tool, y el SKILL.md es demasiado
implícito para modelos menos capaces.

---

## 1. Key Ideas

### Idea 1: Dos problemas independientes, una solución coordinada

El fallo tiene dos capas que deben resolverse juntas:

- **Capa de activación** — El SKILL nunca se invoca (problema de CLAUDE.md)
- **Capa de instrucción** — Cuando se invoca, instrucciones son implícitas (problema de SKILL.md)

Resolver solo una capa no es suficiente. Si solo arreglas CLAUDE.md pero el SKILL
sigue siendo implícito, Haiku fallará. Si solo arreglas SKILL.md pero nunca se
activa, no importa qué tan bueno sea.

### Idea 2: CLAUDE.md como capa de enforcement obligatoria

CLAUDE.md es el único archivo que **siempre se lee** (es el system prompt del proyecto).
Debe ser el lugar donde se enforce el uso del SKILL, no solo donde se menciona.

La diferencia entre "mencionar" y "enforcer":
- Mencionar: "Todo trabajo pasa por el SKILL" (actual — ignorable)
- Enforcer: "ANTES de responder cualquier tarea, invocar Skill tool → pm-thyrox" (obligatorio)

### Idea 3: El SKILL.md debe ser autocontenido por fase

Cada fase debe poder ejecutarse sin depender de razonamiento previo del modelo.
La información necesaria para cada paso debe estar EN ese paso, no en otra referencia.

Principio: **Si el modelo necesita inferir, fallará en algún modelo.**

### Idea 4: Mecanismo de activación dual (push + pull)

- **Push** (usuario invoca): `/pm-thyrox` → Skill tool activa metodología
- **Pull** (modelo auto-activa): CLAUDE.md instruye invocar Skill tool al inicio de tarea

Actualmente solo existe push. Se necesita también pull para que funcione sin
que el usuario sepa del SKILL.

---

## 2. Research

### Unknown 1: ¿Cómo instruir a CLAUDE.md para que el modelo auto-invoque el Skill tool?

**Alternativas investigadas:**

**Opción A: Instrucción directa en CLAUDE.md**
```markdown
ANTES de trabajar en cualquier tarea, ejecutar: Skill tool → pm-thyrox
```
- Pros: Simple, directo, no requiere cambios al SKILL
- Cons: El modelo puede ignorar si no tiene el lenguaje fuerte correcto

**Opción B: Incrustar el flujo directamente en CLAUDE.md (sin Skill tool)**
```markdown
## Flujo OBLIGATORIO para cualquier tarea:
Phase 1: ANALYZE — crear work package, documentar
Phase 2: SOLUTION_STRATEGY — ...
...
```
- Pros: Elimina la dependencia del Skill tool; funciona con cualquier modelo
- Cons: Duplica contenido entre CLAUDE.md y SKILL.md; mantenimiento doble

**Opción C: Startup hook que inyecta recordatorio**
Crear un hook que al inicio de sesión diga "recuerda usar pm-thyrox para toda tarea"
- Pros: No modifica CLAUDE.md ni SKILL.md
- Cons: El hook se ejecuta solo al inicio; si la sesión ya está activa, no aplica

**Opción D: Combinar A + mejorar lenguaje de CLAUDE.md**
Mantener Skill tool pero cambiar el lenguaje de "sugerencia" a "obligatorio"
- Pros: No duplica contenido, aprovecha el Skill tool existente
- Cons: Sigue dependiendo de que el modelo entienda el Skill tool

**Decisión provisional**: Opción D como principal + Opción B como fallback inline
Razón: Modelos capaces (Sonnet/Opus) usan el Skill tool; modelos menos capaces
tienen el flujo inline como respaldo en CLAUDE.md.

---

### Unknown 2: ¿Qué tan explícito debe ser el SKILL.md para funcionar con Haiku?

**Investigación en prompting-tips.md:**
- Haiku necesita: instrucciones atómicas, lenguaje fuerte (SIEMPRE/NUNCA/REQUERIDO)
- Haiku falla con: "cuando sea necesario", "si aplica", "según contexto"
- Principio de Anthropic: "Ser explícito con instrucciones"

**Alternativas:**

**Opción A: Reescribir SKILL.md con instrucciones atómicas por cada paso**
- Pros: Funciona con cualquier modelo
- Cons: SKILL.md se vuelve muy largo y verboso

**Opción B: Mantener SKILL.md conciso + agregar "Haiku mode" en sección de escalabilidad**
```markdown
## Para modelos menos capaces:
- Phase 1 PASO 1: Preguntar explícitamente sobre estos 8 puntos...
- Phase 1 PASO 2: Crear work package con este comando exacto...
```
- Pros: SKILL.md sigue siendo conciso para Sonnet/Opus
- Cons: Complejidad adicional, dos "modos"

**Opción C: Mejorar solo las partes ambiguas del SKILL actual (mínimo viable)**
Identificar las 5 instrucciones más ambiguas y hacerlas explícitas sin reescribir todo.
- Pros: Cambio mínimo, bajo riesgo de romper lo que funciona
- Cons: No resuelve el problema completamente para Haiku

**Decisión provisional**: Opción C primero (mínimo viable), luego Opción A si falla.

---

### Unknown 3: ¿Dónde vive la instrucción "crear work package SIEMPRE en Phase 1"?

El análisis de Phase 1 encontró que el work package se menciona en 3 lugares
(Phase 1, Phase 3, y la tabla de artefactos) de forma inconsistente.

**Alternativas:**
- Solo en Phase 1 (una fuente de verdad)
- En Phase 1 + nota en Phase 3 diciendo "ya fue creado en Phase 1"
- En la tabla de artefactos solamente

**Decisión**: Phase 1 es la fuente de verdad. Phase 3 solo dice "verificar que existe".

---

## 3. Pre-design check

Verificando que las decisiones respetan los Locked Decisions de CLAUDE.md:

| Locked Decision | ¿Respetada? | Nota |
|----------------|-------------|------|
| ANALYZE first | ✓ | No cambia |
| Markdown only | ✓ | Solo cambios en .md |
| Git as persistence | ✓ | No se crean backups |
| Single skill | ✓ | No se crean skills nuevos |
| Conventional Commits | ✓ | No cambia |

Sin violaciones. Seguir.

---

## 4. Decisions

### Decisión 1: Cambiar CLAUDE.md — lenguaje de "sugerencia" a "obligatorio"

**Qué**: Reemplazar el flujo de sesión con instrucción explícita de invocar el Skill tool
y lenguaje OBLIGATORIO para toda tarea.

**Alternativas consideradas**: Opciones A, B, C, D del Unknown 1
**Elegida**: Opción D (Skill tool obligatorio + flujo inline como fallback)

**Cambio concreto en CLAUDE.md:**

```markdown
## Flujo de sesión — OBLIGATORIO

**SIEMPRE** seguir este flujo antes de trabajar en cualquier tarea:

1. **Inicio** — Leer focus.md + now.md + ROADMAP.md
2. **Activar SKILL** — Invocar Skill tool → pm-thyrox ANTES de responder.
   Si el Skill tool no está disponible, leer SKILL.md completo y seguirlo.
3. **Identificar fase** — ¿Hay work package activo en context/work/?
   - SÍ → continuar en la fase donde quedó
   - NO → empezar Phase 1: ANALYZE
4. **Trabajar** — Seguir cada fase hasta su exit criteria
5. **Cierre** — Actualizar focus.md + now.md
```

**Justificación**: Lenguaje fuerte (SIEMPRE, OBLIGATORIO, ANTES) + fallback inline
cubre tanto modelos capaces (Skill tool) como menos capaces (leer SKILL.md directo).

---

### Decisión 2: Hacer explícitas las 5 instrucciones más ambiguas del SKILL.md

**Qué**: Cambios mínimos y quirúrgicos en SKILL.md para eliminar ambigüedad crítica.

**Las 5 instrucciones a corregir:**

1. **Phase 1** — "Investigar requisitos" → especificar los 8 aspectos concretos a investigar
2. **Phase 1** — "Si hay decisiones arquitectónicas" → definir qué cuenta como decisión arquitectónica
3. **Phase 2** — No dice "leer solution-strategy.md PRIMERO" → agregar como PASO 1 explícito
4. **Phase 6** — "Tomar siguiente tarea" → "Leer plan.md y tomar la siguiente tarea sin [x]"
5. **Phase 6** — "Si falla, crear ERR-NNN" → "Si falla, crear context/errors/ERR-NNN usando error-report.md.template"

**Justificación**: Cambios mínimos, máximo impacto. No reescribe el SKILL, solo clarifica
los puntos donde modelos menos capaces pierden el hilo.

---

### Decisión 3: Resolver ambigüedad de work package (una fuente de verdad: Phase 1)

**Qué**: Clarificar en SKILL.md que el work package SE CREA en Phase 1 y se VERIFICA en Phase 3.

**Cambio concreto:**
- Phase 1, paso 2: "Crear work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`" → OK (ya está)
- Phase 3, paso 2: Cambiar de "verificar que el work package existe (creado en Phase 1)" para hacerlo más explícito
- Tabla de artefactos: Queda igual (Phase 1 → Work package)

---

### Decisión 4: NO reescribir SKILL.md completamente (por ahora)

**Por qué no**: Una reescritura completa tiene alto riesgo de romper lo que ya funciona
con Sonnet/Opus. Las evals actuales muestran 40/40 (100%) — no romper eso.

**Enfoque**: Cambios mínimos quirúrgicos. Si después de aplicar Decisiones 1-3 el SKILL
sigue fallando con Haiku, entonces sí justifica una reescritura mayor.

---

## 5. Post-design re-check

### ¿Las decisiones resuelven las 5 causas raíz del análisis?

| Causa raíz (Phase 1) | Decisión que la resuelve | ¿Resuelta? |
|---------------------|--------------------------|-----------|
| CLAUDE.md no instruye invocar Skill tool | Decisión 1 | ✓ |
| Modelo no auto-invoca tools sin instrucción | Decisión 1 (lenguaje fuerte + fallback) | ✓ |
| "Consultar el SKILL" ≠ "Invocar el Skill tool" | Decisión 1 (instrucción explícita) | ✓ |
| examples.md tiene nomenclatura desactualizada | No incluida — scope separado | ⚠ fuera de scope |
| Sin /pm-thyrox explícito el SKILL es invisible | Decisión 1 (pull model) | ✓ |
| Instrucciones ambiguas para modelos menos capaces | Decisión 2 | ✓ |
| Work package creation ambiguo | Decisión 3 | ✓ |

### ¿Qué queda fuera de scope?

- examples.md desactualizado → scope separado (no bloquea el problema actual)
- Reescritura completa de SKILL.md → reservado si Decisiones 1-3 no son suficientes
- Validación automática por fase (bash scripts) → mejora futura, no crítica ahora

### ¿Hay riesgos?

- **Riesgo 1**: Cambios en CLAUDE.md pueden afectar el comportamiento de sesiones actuales
  → Mitigación: Cambios aditivos (no eliminar, solo agregar/fortalecer lenguaje)

- **Riesgo 2**: Cambios en SKILL.md pueden bajar evals de Sonnet/Opus
  → Mitigación: Re-ejecutar evals después de cada cambio

---

## Stack / Artefactos a Modificar

```
Archivos a cambiar:
  .claude/CLAUDE.md                          ← Flujo de sesión (Decisión 1)
  .claude/skills/pm-thyrox/SKILL.md          ← 5 instrucciones (Decisión 2 + 3)

Archivos fuera de scope (por ahora):
  .claude/skills/pm-thyrox/references/examples.md  ← nomenclatura desactualizada
```

---

## Checklist de Validación

- [ ] Key Ideas identificadas y articuladas ✓
- [ ] Research con pros/cons por cada unknown ✓
- [ ] Pre-design check contra Locked Decisions ✓
- [ ] Decisiones fundamentales documentadas ✓
- [ ] Alternativas consideradas ✓
- [ ] Post-design re-check: causas raíz cubiertas ✓
- [ ] Riesgos identificados ✓
- [ ] Scope acotado ✓
