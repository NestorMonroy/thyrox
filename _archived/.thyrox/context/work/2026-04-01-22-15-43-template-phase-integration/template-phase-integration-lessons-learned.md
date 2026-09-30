```yml
ID work package: 2026-04-01-22-15-43-template-phase-integration
Fecha cierre: 2026-04-02-00-00-00
Proyecto: thyrox / pm-thyrox SKILL
Fase de origen: Phase 6 — EXECUTE
Total lecciones: 3
Autor: Claude
```

# Lessons Learned: Template Phase Integration

## Lecciones

### L-001: El trabajo sobre el SKILL debe seguir el SKILL

**Qué pasó**

7 de 10 puntos de template integration se ejecutaron sin work package formal, sin
spec, sin plan — exactamente el proceso que el SKILL debería prevenir.

**Raíz**

El trabajo se percibió como "pequeño" (agregar referencias de templates) y se
ejecutó directamente. La ausencia de work package hizo que las decisiones quedaran
implícitas en los commits en lugar de documentadas.

**Fix aplicado**

Este WP formalizó retroactivamente las decisiones (D1–D5) y creó los artefactos
de las 7 fases para el trabajo de template integration.

**Regla**

Cuando [cualquier cambio al SKILL o sus artefactos], seguir las 7 fases sin
excepción — porque no hacerlo es el error que el SKILL fue diseñado para prevenir.

---

### L-002: Reveal Intent se aplica al output, no al template

**Qué pasó**

Los templates se llamaban genéricamente (`introduction.md.template`) y los outputs
también (`introduction.md`, `plan.md`, `spec.md`). El nombre no revelaba qué
proyecto ni qué contenido específico tenía el archivo.

**Raíz**

La convención de naming del SKILL no distinguía entre el nombre del template
(reutilizable, genérico) y el nombre del output (específico del proyecto).

**Fix aplicado**

Patrón `{nombre-wp}-{tipo}.md` — el prefijo del WP aporta contexto, el sufijo
revela el tipo. Ejemplo: `pagos-stripe-task-plan.md`.

**Regla**

Cuando [se instancia un template], el output filename debe seguir `{nombre-wp}-{tipo}.md`.
El template puede tener nombre genérico; el output nunca.

---

### L-003: Validar links antes de declarar trabajo completo

**Qué pasó**

R-001 (links rotos en SKILL.md) se identificó como riesgo en Phase 1 pero nunca
se había verificado antes. El trabajo de template integration se consideraba
"completo" sin haber comprobado que los 19 links apuntaban a archivos reales.

**Raíz**

No había checkpoint de validación de referencias como parte del flujo de cierre.

**Fix aplicado**

Verificación ejecutada en Phase 2: `grep -o 'assets/...' SKILL.md | xargs ls` →
19/19 válidos. R-001 cerrado.

**Regla**

Cuando [se agregan referencias a templates en SKILL.md], verificar existencia de
archivos como parte del checkpoint de Phase 2, no después de Phase 6.

---

## Patrones identificados

| Patrón | Lecciones | Acción sistémica |
|--------|-----------|-----------------|
| Trabajo sobre el SKILL sin seguir el SKILL | L-001 | Obligatorio: cualquier cambio al SKILL → work package |
| Naming genérico en outputs | L-002 | Patrón {nombre-wp}-{tipo}.md en sección Naming |

---

## Qué replicar

- **Verificación de links en Phase 2**: ejecutar antes de planificar, no al final
- **Solution strategy con "Unknown verificado"**: documentar resultado real de la investigación, no solo la pregunta
- **Scope pequeño = fases completas igualmente**: las 7 fases tomaron menos tiempo que el trabajo informal previo

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| T-DT-001 | examples.md — nomenclatura de fases desactualizada | baja | examples-nomenclature-update |
