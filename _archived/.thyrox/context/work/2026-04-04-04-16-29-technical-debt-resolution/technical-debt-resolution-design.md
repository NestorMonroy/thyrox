```yml
Fecha diseño: 2026-04-04-04-16-29
Proyecto: thyrox — PM-THYROX skill
Feature: Technical Debt Resolution
Versión diseño: 1.0
Estado: Completo
WP: 2026-04-04-04-16-29-technical-debt-resolution
Fase: 4 - STRUCTURE
```

# Design: Technical Debt Resolution

## Propósito

Documentar CÓMO implementar los 6 SPEC del WP. Todos los cambios son modificaciones de archivos Markdown y shell scripts existentes — sin nuevos componentes, sin nuevas dependencias.

---

Basado en: [technical-debt-resolution-requirements-spec](technical-debt-resolution-requirements-spec.md)

## 1. Visión General

Todos los cambios son **in-place**: modificar archivos existentes con adiciones mínimas. No se crean directorios ni archivos nuevos (excepto el checklist de calidad). El orden de ejecución importa solo para `scalability.md` (tocado por SPEC-001 y SPEC-003).

Estrategia de implementación: **batch paralelo** con un punto de sincronización antes de `scalability.md`.

## 2. Decisiones de Diseño

DA-001: Headers YAML vs. comentarios Markdown
- Contexto: ¿Cómo indicar la fase de uso en un template?
- Decisión: Agregar campo `Fase:` al bloque YAML existente en cada template
- Alternativas rechazadas: Comentario HTML `<!-- Fase: N -->` — menos discoverable; sección dedicada en el body — demasiado intrusivo
- Consecuencias: Positivo — consistente con frontmatter existente. Negativo — ninguno.

DA-002: Condiciones de activación en SKILL.md — texto inline vs. tabla
- Contexto: ¿Cómo documentar cuándo activar un template opcional?
- Decisión: Texto inline junto al link: `[template](assets/...) — activar si [condición]`
- Alternativas rechazadas: Tabla separada — overhead de mantenimiento; sección nueva — fragmenta la lectura
- Consecuencias: Positivo — legible en el flujo natural. Negativo — ninguno.

DA-003: validate-session-close.sh — warning vs. error
- Contexto: ¿El check de timestamp debe bloquear el cierre o solo advertir?
- Decisión: Warning (exit 0 con mensaje) — el cierre de sesión no debe bloquearse por timestamps
- Consecuencias: Positivo — no rompe flujo existente. Negativo — puede ignorarse.

## 3. Componentes Afectados

### 3.1 Nuevos Componentes

Ninguno.

### 3.2 Componentes Modificados

| Componente | Ubicación | Cambios |
|---|---|---|
| ad-hoc-tasks template | `assets/ad-hoc-tasks.md.template` | Agregar `Fase: 5 - DECOMPOSE / 6 - EXECUTE` al YAML |
| analysis-phase template | `assets/analysis-phase.md.template` | Agregar `Fase: 1 - ANALYZE` al YAML |
| categorization-plan template | `assets/categorization-plan.md.template` | Agregar `Fase: 5 - DECOMPOSE` al YAML |
| document template | `assets/document.md.template` | Agregar `Fase: 4 - STRUCTURE` al YAML |
| project.json template | `assets/project.json.template` | Agregar `// Fase: 1 - ANALYZE` al header JSON |
| refactors template | `assets/refactors.md.template` | Agregar `Fase: 5 - DECOMPOSE / 6 - EXECUTE` al YAML |
| SKILL.md | `skills/pm-thyrox/SKILL.md` | Tabla artefactos + links con condiciones por fase |
| scalability.md | `references/scalability.md` | project.json → opcional; fix exit_conditions → exit-conditions.md.template |
| incremental-correction.md | `references/incremental-correction.md` | Agregar análisis-phase.md en sección relevante |
| examples.md | `references/examples.md` | Reescribir sección de nomenclatura de fases |
| conventions.md | `references/conventions.md` | Agregar sección "Timestamp Format" |
| validate-session-close.sh | `scripts/validate-session-close.sh` | Agregar check de timestamp en frontmatter |
| validate-phase-readiness.sh | `scripts/validate-phase-readiness.sh` | Verificar/agregar case para Phase 3 |
| 8 task-plans históricos | `context/work/2026-03-2*/...-task-plan.md` | Cambiar `[ ]` → `[x]` en todos los checkboxes |

### 3.3 Componentes Deprecados

Ninguno.

## 4. Estructura de Archivos

Sin cambios estructurales. Todos los archivos ya existen.

## 5. Impacto

### 5.1 Cambios Breaking

Ninguno. Todos los cambios son aditivos o correcciones de texto.

### 5.2 Backward Compatibility

- [x] Mantiene compatibilidad total con flujo existente
- [ ] Requiere migración manual — NO aplica

## 6. Plan de Rollback

Si un cambio introduce un problema:
1. `git revert HEAD` revierte el commit del cambio
2. El sistema queda en el estado anterior — sin pérdida de datos

## 7. Testing

### Criterios de Validación

- [ ] `grep -r "^Fase:" .claude/skills/pm-thyrox/assets/` devuelve 6 resultados (uno por template huérfano)
- [ ] `grep -n "ad-hoc-tasks\|analysis-phase\|categorization-plan\|document.md\|project.json\|refactors" .claude/skills/pm-thyrox/SKILL.md` devuelve ≥6 resultados
- [ ] `grep -n "exit_conditions" .claude/skills/pm-thyrox/references/scalability.md` no devuelve resultados
- [ ] `grep -n "YYYY-MM-DD-HH-MM-SS" .claude/skills/pm-thyrox/references/conventions.md` devuelve ≥1 resultado
- [ ] `grep -rn "^\- \[ \]" .claude/context/work/2026-03-2*/ .claude/context/work/2026-03-31*/` no devuelve resultados
- [ ] `bash .claude/skills/pm-thyrox/scripts/validate-phase-readiness.sh 3` sin plan.md falla con mensaje útil

## 8. Referencias

- [technical-debt-resolution-requirements-spec](technical-debt-resolution-requirements-spec.md) — este diseño
- `SKILL.md` — flujo de 7 fases
- `references/scalability.md` — referencia de escalabilidad
- `references/conventions.md` — convenciones del proyecto
