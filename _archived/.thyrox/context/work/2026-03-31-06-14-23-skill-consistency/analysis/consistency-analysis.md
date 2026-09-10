```yml
Fecha: 2026-03-31
Tipo: Phase 1 (ANALYZE)
```

# Análisis: 3 Problemas de Consistencia del SKILL

---

## Problema 1: Naming de assets — 3 UPPERCASE, 30 lowercase

**Evidencia:**

| Archivo | Naming | Convención SKILL (kebab-case.md) |
|---------|--------|--------------------------------|
| `AD_HOC_TASKS.md.template` | SCREAMING_SNAKE | ❌ Viola convención |
| `EXIT_CONDITIONS.md.template` | SCREAMING_SNAKE | ❌ Viola convención |
| `REFACTORS.md.template` | SCREAMING_SNAKE | ❌ Viola convención |
| Los otros 30 | kebab-case | ✅ Correctos |

El SKILL.md sección Naming dice:
```
Archivos: kebab-case.md
```

Los 3 archivos violan la convención que el propio SKILL define. Si un usuario ve UPPERCASE en assets, puede pensar que UPPERCASE es válido.

**Corrección:** Renombrar a `ad-hoc-tasks.md.template`, `exit-conditions.md.template`, `refactors.md.template`.

---

## Problema 2: `context/decisions/` — ¿del proyecto o del SKILL?

**Evidencia:** Los 12 ADRs actuales son decisiones del SKILL/framework:

| ADR | Decisión | ¿Es del framework o del proyecto? |
|-----|----------|----------------------------------|
| 001 | Markdown para documentación | **Framework** — es una regla del SKILL |
| 002 | ROADMAP como fuente de verdad | **Framework** |
| 003 | Conventional commits | **Framework** |
| 004 | Single skill | **Framework** |
| 005 | Estructura de context/ | **Framework** |
| 006-012 | Varias decisiones de estructura | **Framework** |

**Problema:** Cuando un usuario usa el template para su proyecto (ej: un e-commerce), y ejecuta `setup-template.sh`, los ADRs del framework QUEDAN en `context/decisions/`. El usuario va a mezclar sus propias decisiones (ej: "ADR-013: PostgreSQL vs MySQL") con decisiones del framework (ADR-001: "Markdown para documentación").

**¿Qué debería pasar?**
- Las decisiones del **framework** (cómo funciona pm-thyrox) deberían vivir DENTRO del skill o eliminarse al hacer setup
- Las decisiones del **proyecto** (qué stack usar, qué arquitectura) son las que crea el usuario en `context/decisions/`

**Opciones:**
- A: `setup-template.sh` limpia `context/decisions/` (el usuario empieza con 0 ADRs)
- B: Mover las ADRs del framework a `skills/pm-thyrox/references/` o similar
- C: Marcar las ADRs como "framework decisions" vs "project decisions"

---

## Problema 3: ¿En qué momento del flujo se activa el SKILL?

**El flujo actual:**

1. Claude Code lee [CLAUDE](.claude/CLAUDE.md) siempre (se carga automáticamente)
2. CLAUDE.md dice: "Consultar SKILL" en el paso 2 del flujo de sesión
3. El SKILL tiene un `description:` en el frontmatter YAML que dice cuándo activarse

**Pero hay un gap:** El SKILL se activa por el `description:` (trigger words como "planificar", "analizar", "¿qué hago primero?"). ¿Qué pasa cuando el usuario NO usa esas trigger words?

Ejemplo real: si el usuario dice "arregla este bug", Claude puede ir directo a Phase 6: EXECUTE sin pasar por Phase 1: ANALYZE. El SKILL no se activa porque "arregla este bug" no es un trigger word.

**El problema no es del trigger — es del flujo de sesión en CLAUDE.md:**

```
1. Inicio — Leer focus.md + now.md. Revisar ROADMAP.md.
2. Contexto — Identificar fase actual. Consultar SKILL.
3. Trabajar — Seguir la fase.
4. Cierre — Actualizar focus.md + now.md.
```

El paso 2 dice "Consultar SKILL" pero no dice **cuándo es obligatorio**. ¿Solo cuando el usuario pide planificación? ¿O siempre?

**Para un proyecto que usa el template:** si no hay instrucción clara de "siempre consultar el SKILL antes de actuar", Claude puede ignorar el framework completo.

**Corrección necesaria:** CLAUDE.md debería decir explícitamente cuándo el SKILL es obligatorio vs opcional. Por ejemplo:
- "Siempre consultar el SKILL antes de crear archivos, tomar decisiones, o empezar trabajo nuevo"
- O: "El SKILL se activa automáticamente para cualquier trabajo de gestión"

---

## Resumen

| # | Problema | Severidad | Impacto |
|---|---------|-----------|---------|
| 1 | 3 assets UPPERCASE violan convención kebab-case | Media | El framework no sigue sus propias reglas |
| 2 | ADRs del framework mezclados con espacio del proyecto | Alta | Confunde al usuario del template |
| 3 | No está claro cuándo el SKILL es obligatorio | Alta | Claude puede ignorar el framework |
