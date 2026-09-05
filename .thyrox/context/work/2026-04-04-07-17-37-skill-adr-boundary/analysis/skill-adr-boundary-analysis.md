```yml
Tipo: Análisis de Problema
Fase: 1 - ANALYZE
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
```

# Análisis — Confusión SKILL vs ADR en modelos no-Sonnet

## Objetivo

Identificar por qué modelos como Haiku se confunden entre el contenido del SKILL
(`skills/pm-thyrox/SKILL.md`) y los ADRs (`context/decisions/adr-NNN.md`) al trabajar
en proyectos que usan el framework PM-THYROX, y determinar las correcciones necesarias.

---

## 1. Descripción del problema

Al usar Haiku (u otro modelo menos capaz) en un proyecto con PM-THYROX instalado,
el modelo no distingue correctamente:

- **SKILL.md** = instrucciones de metodología (cómo trabajar en cada fase)
- **ADRs** = registro histórico de decisiones arquitectónicas ya tomadas

Síntomas observados:
- El modelo crea ADRs para cosas que deberían estar en SKILL.md
- El modelo modifica ADRs en lugar de seguir la metodología del SKILL
- El modelo no sabe cuándo debe crear un ADR nuevo vs cuándo simplemente ejecutar una fase
- El modelo confunde "Locked Decisions" de CLAUDE.md con ADRs

---

## 2. Análisis de causas raíz

### RC-001: Sin boundary statement explícito

No existe en ningún archivo una regla que diga explícitamente:
> "SKILL.md = instrucciones para Claude. ADRs = registro de decisiones del proyecto."

Haiku lee ambos archivos y no puede inferir la distinción sin esa regla.

**Evidencia:** `SKILL.md` menciona ADRs en Phase 1 step 8 y Phase 2, pero no hay sección que
explique QUÉ son los ADRs ni en qué se diferencian del SKILL mismo.

### RC-002: Trigger de ADR demasiado vago

El texto actual en Phase 1 es:
> "Si hay decisión arquitectónica (cambio de stack tecnológico, adopción de patrón nuevo
> como microservicios o event-driven, o reemplazo de componente principal), crear ADR"

El problema: "decisión arquitectónica" es ambiguo para un modelo con menos capacidad.
- ¿Agregar un template al SKILL es una "decisión arquitectónica"?
- ¿Cambiar una convención de naming es "adopción de patrón nuevo"?
- ¿Haiku debería crear ADR cuando modifica SKILL.md?

### RC-003: CLAUDE.md "Locked Decisions" confunde con ADRs

`CLAUDE.md` tiene una sección llamada `## Locked Decisions (no revisitar)` que lista
7 decisiones con referencias a ADR IDs. Esto crea un tercer "lugar de decisiones" que:
- Parece a un ADR (tiene decisiones)
- Está en CLAUDE.md (no en context/decisions/)
- No es idéntico a ningún ADR individual

Un Haiku que lee CLAUDE.md puede no entender si debe:
a) Crear un nuevo ADR y actualizarlo en "Locked Decisions"
b) Solo agregar a "Locked Decisions"
c) Solo crear el ADR

### RC-004: Inconsistencia de formato entre ADRs

Los 12 ADRs existentes tienen 2 formatos distintos:
- **Formato largo** (ADR-001, ADR-004): 100+ líneas, 8+ secciones, tablas de aprobación
- **Formato corto** (ADR-010, ADR-012): 20-40 líneas, 4 secciones esenciales

Esta inconsistencia hace que Haiku no reconozca con certeza "esto es un ADR" al leer el repo.

### RC-005: Ausencia de referencia `adr-guide.md`

No existe un documento que explique:
- Cuándo crear un ADR
- Cuándo NO crear un ADR
- Qué tipos de decisiones van en ADRs vs en SKILL.md vs en CLAUDE.md
- El proceso de numeración

SKILL.md asume que el lector sabe qué es un ADR; un Haiku no tiene ese conocimiento
contextual implícito.

### RC-006: La tabla de artefactos del SKILL no distingue "qué es cada artefacto"

La tabla en SKILL.md muestra:
```
| 1–2 | Decisiones arquitectónicas | context/decisions/adr-NNN.md | adr.md.template |
```

Pero no hay descripción de qué distingue un ADR de un plan o de una decisión en SKILL.md.

### RC-007: La solución misma debe ser atómica para Haiku

La sesión 4 (WP skill-activation-failure) resolvió 15 gaps de compatibilidad Haiku usando
el principio **"Baja Libertad solo en gates"**: reglas con lenguaje REQUERIDO/NO/SIEMPRE,
no párrafos narrativos.

El problema actual tiene el mismo requisito: si la corrección agrega texto narrativo para
explicar la diferencia SKILL/ADR, Haiku seguirá sin poder usarlo. La solución debe producir
**reglas en formato SI/NO** que no requieran inferencia:

❌ Narrativo (Sonnet lo entiende, Haiku no):
> "Considera si la decisión tiene impacto duradero en la arquitectura del proyecto antes de
> crear un ADR."

✅ Atómico (funciona para Haiku):
> "CREAR ADR si: cambio de stack / nuevo patrón arquitectónico / reemplazo de componente principal.
> NO crear ADR si: cambio dentro de una fase del WP / convención de naming / template nuevo."

### RC-008: El stop hook es local, no portátil

El hook `~/.claude/stop-hook-git-check.sh` es global de máquina (directorio `~/.claude/`,
no `.claude/` del proyecto). Detecta archivos sin commitear para CUALQUIER modelo en esta
máquina, pero **no existe en el entorno de otros desarrolladores** que clonen el repo.

Por lo tanto: el stop hook es una red de seguridad local, no una solución al problema de
confusión SKILL/ADR en otros entornos. El análisis no puede asumir su existencia.

---

## 3. Stakeholders

- **Modelos no-Sonnet (Haiku, Haiku 3)**: afectados directamente — no distinguen boundary
- **Desarrolladores que usan el framework en proyectos propios**: reciben outputs incorrectos
- **Mantenedor del framework**: debe corregir sin romper compatibilidad con sesiones existentes

---

## 4. Restricciones

- No romper ADRs existentes (adr-001 a adr-012)
- No cambiar la ubicación de `context/decisions/` (convención establecida)
- Los cambios deben ser legibles también por Haiku (lenguaje simple, reglas explícitas)
- No duplicar información entre SKILL.md y un nuevo `adr-guide.md`

---

## 5. Criterios de éxito

1. Un modelo Haiku dado el mismo prompt puede crear un ADR correcto vs ejecutar una fase sin confusión
2. Existe una regla explícita en SKILL.md que define el boundary SKILL vs ADR
3. El trigger de creación de ADR tiene ejemplos concretos de SÍ/NO
4. `adr.md.template` tiene en su frontmatter un campo que lo diferencia visualmente de otros templates

---

## 6. Fuera de alcance

- Migrar ADRs al formato corto (los existentes son legacy, no hay ROI)
- Crear un sistema de validación automática de ADRs
- Cambiar la ubicación de `context/decisions/`

---

## 7. Hallazgos aprobados

Las causas raíz son RC-001 a RC-008. Prioridad:

| Prioridad | RC | Razón |
|-----------|-----|-------|
| Alta | RC-001 | Sin boundary explícito — causa directa de toda confusión |
| Alta | RC-002 | Trigger ambiguo — Haiku no puede inferir cuándo crear ADR |
| Alta | RC-007 | La solución debe ser atómica (SI/NO), no narrativa |
| Media | RC-003 | "Locked Decisions" en CLAUDE.md introduce tercer "lugar" |
| Media | RC-005 | No existe `adr-guide.md` con ejemplos concretos |
| Baja | RC-004 | Inconsistencia de formato entre ADRs legacy |
| Baja | RC-006 | Tabla de artefactos sin descripción diferenciadora |
| Info | RC-008 | Stop hook es local — no puede usarse como solución portátil |
