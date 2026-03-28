```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE)
Tema: Principios — dónde están, cuándo se usan, cuándo se validan
```

# Análisis: Principios en THYROX

## El problema

Los principios están en **3 lugares diferentes** con **3 propósitos diferentes**, y ninguno está instanciado como constitution real del proyecto.

---

## Dónde están los principios hoy

### Lugar 1: SKILL.md "Key Principles" (línea 269)

```
1. ROADMAP.md is source of truth
2. Spec-driven, not vibe-driven
3. Persistent context
4. Transparency
```

**Propósito:** Guía general del framework.
**Enforcement:** Ninguno. Son texto descriptivo.
**Cuándo se validan:** Nunca explícitamente.

### Lugar 2: constitution.md.template (assets/)

Template con placeholders para 5+ principios + constraints + governance.
Incluye sección "Constitution Check" con checklist.

**Propósito:** Template para crear constitution de un proyecto.
**Enforcement:** El template tiene checklist, pero nadie lo instancia.
**Cuándo se validan:** En teoría en Phase 2 (gate), en práctica nunca (no existe constitution.md).

### Lugar 3: EXIT_CONDITIONS.md.template (assets/)

3 gates referenciando constitution:
- Phase 1: "constitution.md creada o revisada"
- Phase 2: "Pre-design constitution check" + "Post-design re-check"

**Propósito:** Bloquear avance si principios no se respetan.
**Enforcement:** Solo si alguien usa EXIT_CONDITIONS.
**Cuándo se validan:** En teoría al final de cada fase, en práctica nadie instancia EXIT_CONDITIONS tampoco.

### Lugar 4: ADRs (decisions/)

ADR-010 (ANALYZE primero), ADR-011 (anatomía oficial), ADR-012 (work-log obligatorio) son decisiones que funcionan como principios.

**Propósito:** Documentar por qué se tomó una decisión.
**Enforcement:** Ninguno. Son registro histórico.
**Cuándo se validan:** Nunca automáticamente.

### Lugar 5: ARCHITECTURE.md

8 decisiones arquitectónicas (ADR-001 a ADR-008) que también son principios:
- Markdown only, ROADMAP source of truth, Conventional Commits, etc.

**Propósito:** Presentación pública de decisiones.
**Enforcement:** Ninguno.

---

## Mapa de validación actual

```
Phase 1: ANALYZE
  Gate: "constitution.md creada" → NO EXISTE constitution.md
  Resultado: Gate falla silenciosamente (nadie lo chequea)

Phase 2: SOLUTION_STRATEGY
  Gate: "Pre-design constitution check" → No hay constitution que chequear
  Gate: "Post-design re-check" → Mismo problema
  Resultado: Se toman decisiones sin validar contra principios

Phase 3-5: Sin gates de principios

Phase 6: EXECUTE
  Sin validación de principios
  Se puede escribir código que viole principios sin detección

Phase 7: TRACK
  Sin verificación de principios retroactiva
```

**Resultado: Los principios existen en documentación pero NO se validan en NINGÚN punto del flujo real.**

---

## Los 3 problemas

### 1. No existe constitution.md instanciada

El template existe. Los gates la referencian. Pero nadie la creó para THYROX. `validate-phase-readiness.sh` lo detecta como faltante.

### 2. Los principios están dispersos

4 principios en SKILL.md "Key Principles."
8 decisiones en ARCHITECTURE.md.
3 ADRs nuevos en decisions/.
5 placeholders en constitution.md.template.

Si preguntas "¿cuáles son los principios de THYROX?" no hay UN lugar donde encontrarlos todos.

### 3. No hay mecanismo de enforcement real

Los gates en EXIT_CONDITIONS dicen "verificar constitution" pero:
- EXIT_CONDITIONS es un template (nadie lo instancia)
- constitution.md no existe
- No hay script que valide principios automáticamente
- El flujo funciona sin que nadie chequee principios

---

## Cómo debería funcionar

```
constitution.md (FUENTE CANÓNICA de principios)
       ↓
Phase 1: ANALYZE
  → Gate: constitution.md existe y está revisada ✓
       ↓
Phase 2: SOLUTION_STRATEGY
  → Pre-check: ¿decisiones respetan principios? ✓
  → Decisiones tomadas
  → Post-check: ¿siguen respetando? ✓
  → Si violación → ADR con justificación
       ↓
Phase 3-5: PLAN/STRUCTURE/DECOMPOSE
  → Principios guían qué incluir/excluir del scope
       ↓
Phase 6: EXECUTE
  → Commits respetan principios (Conventional Commits es un principio)
       ↓
Phase 7: TRACK
  → Retroactivo: ¿se violó algún principio? → documentar en errors/
```

---

## Acciones

1. **Crear constitution.md real para THYROX** — instanciar el template con los principios reales del proyecto
2. **Consolidar principios dispersos** — los 4 de SKILL.md + los relevantes de ARCHITECTURE.md + los 3 ADRs nuevos → todo en constitution.md
3. **SKILL.md "Key Principles" → link a constitution.md** — no duplicar, referenciar

---

**Última actualización:** 2026-03-28
