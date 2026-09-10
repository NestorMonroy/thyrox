```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: Generalización del Template

## Unknown 1: ¿Limpiar in-place o crear branch separado?

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Limpiar in-place en main | Simple, un solo repo | Pierde la historia de THYROX como ejemplo |
| B | Branch `template` limpio | THYROX sigue como referencia, template separado | 2 branches que mantener, divergen |
| C | Crear guía TEMPLATE_SETUP.md sin limpiar nada | Zero riesgo, el usuario hace el replace | El template no está "listo para usar" |
| D | Script `setup-template.sh` que hace el replace interactivo | El template se auto-personaliza | Requiere mantenimiento del script |

**Evidencia de referencia:**
- Cortex-Template: distribuye limpio, sin historia del proyecto original
- spec-kit: tiene `commands/` genéricos, sin nombre de proyecto hardcodeado
- valet: mantiene el nombre propio, es un proyecto no un template

**Decisión: D — Script de setup interactivo**
- El usuario clona el repo, ejecuta `bash setup-template.sh`, responde nombre del proyecto
- El script hace find-and-replace de THYROX → nombre elegido
- Resetea project-state, ROADMAP, CHANGELOG a estado inicial
- El template funciona out-of-the-box después del script
- **Justificación:** Máximo valor para el usuario. No necesita leer guía ni hacer replace manual. Un comando y listo.

## Unknown 2: ¿Qué incluir en el template distribuible vs. qué es historia de desarrollo?

**Decisión:** El template distribuible es TODO el repo con el script de setup. Los work packages son historia de git — el script de setup los ignora porque están en `context/work/` que el nuevo usuario no tendrá (o puede borrar).

El script de setup:
1. Pide nombre del proyecto
2. Reemplaza THYROX/pm-thyrox/PM-THYROX en archivos core
3. Resetea project-state.md, ROADMAP.md, CHANGELOG.md a estado inicial
4. Limpia context/work/ y context/errors/ (son historia de THYROX)
5. Hace commit inicial: "feat: initialize [PROJECT_NAME] from pm-thyrox template"

## Unknown 3: ¿Generalizar ejemplos de templates o dejar como están?

**Decisión:** Dejar los ejemplos domain-specific (User Auth, Shopper, etc.)
- Son EJEMPLOS — el usuario entiende que debe reemplazarlos
- Tener ejemplos concretos es más útil que placeholders vacíos `[EXAMPLE]`
- El SKILL ya dice "usar templates como base"
- **Evidencia:** spec-kit tiene ejemplos de "task management app" en sus templates — funciona bien

## Resumen

| Decisión | Resultado |
|----------|-----------|
| Distribución | Script `setup-template.sh` interactivo |
| Scope del template | Todo el repo — script limpia lo THYROX-específico |
| Ejemplos en templates | Mantener como están (ejemplos concretos > placeholders) |

## Siguiente

→ Phase 3+5: PLAN + DECOMPOSE — definir tareas del script
