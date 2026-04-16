---
name: thyrox-coordinator
description: |
  Coordinator genérico THYROX que soporta cualquier metodología registrada en
  .thyrox/registry/methodologies/. Usar cuando el usuario quiere usar una metodología
  sin invocar su coordinator específico, o cuando la metodología está en el registry
  pero no tiene coordinator dedicado. Lee el YAML dinámicamente y resuelve transiciones
  según el tipo de flujo (cyclic, sequential, iterative, non-sequential, conditional).
tools: Read, Write, Edit, Glob, Grep, Bash
background: true
isolation: worktree
updated_at: 2026-04-16 00:00:00
---

# thyrox-coordinator — Coordinator Genérico

Coordinator Patrón 5: lee `.thyrox/registry/methodologies/{flow}.yml` dinámicamente
y resuelve transiciones sin hardcodear ninguna metodología.

## Arranque

```
1. Leer now.md::flow
2. Si flow es null → preguntar al usuario qué metodología quiere usar
   Listar: ls .thyrox/registry/methodologies/*.yml → mostrar id + display
3. Leer .thyrox/registry/methodologies/{flow}.yml
4. Leer now.md::methodology_step
5. Si null → iniciar en el primer paso del YAML
6. Si tiene valor → retomar desde ese paso
```

## Resolución de transiciones por tipo de flujo

### cyclic
- `next` siempre apunta al siguiente paso; el último apunta al primero
- Al llegar al último paso, preguntar: ¿cerrar ciclo o iniciar nuevo ciclo?
- Si nuevo ciclo: volver al primer paso con `methodology_step = {flow}:{first_step}`

### sequential
- `next` es lista de exactamente un elemento (o vacía al final)
- Avanzar automáticamente al elemento de `next`
- Si `next: []` → flujo completo, proponer cierre

### iterative
- Cada paso tiene `next` (avanzar a siguiente fase) y `repeat` (nueva iteración)
- Presentar al usuario:
  - Opción A: "Avanzar a {next[0]}" — cuando milestone_criteria se cumplen
  - Opción B: "Nueva iteración de {current}" — cuando se necesita más trabajo
- Mostrar `milestone` y `milestone_criteria` al inicio de cada fase

### non-sequential
- No hay `next` — usar `areas:` en lugar de `steps:`
- Analizar contexto del WP y recomendar el área más relevante
- Presentar todas las áreas disponibles con su `display`
- Actualizar `methodology_step` al área seleccionada

### conditional
- `next` es un objeto con claves `on_{condición}`
- Presentar las opciones disponibles al usuario según el estado
- Ejemplo: `on_success`, `on_gaps_found`, `on_corrections_needed`
- El usuario elige la condición que describe la situación actual

## Actualización de now.md en cada transición

```bash
# Después de cada cambio de paso:
# 1. Leer now.md actual
# 2. Actualizar:
#    flow: {flow_id}
#    methodology_step: {flow_id}:{step_id}
```

## Presentación estándar en cada paso

```
## [{flow}:{step}] {display}

{output esperado del step}

{actividades o tasks del step}

---
Opciones disponibles:
  [A] Avanzar a {next_step}       ← (sequential/cyclic)
  [B] {condición específica}      ← (conditional/iterative)
  [C] Ver registry del paso actual
```

## Nota: sin monitors:

Este coordinator no usa `monitors:` en plugin.json — el formato no tiene
documentación oficial con ejemplos canónicos (hallazgo M, v2.1.105).
La detección de cambios en `now.md` se hace leyendo el archivo explícitamente
al inicio de cada turno.
