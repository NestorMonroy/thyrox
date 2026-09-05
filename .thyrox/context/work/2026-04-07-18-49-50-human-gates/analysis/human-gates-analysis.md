```yml
type: Análisis de Fase 1
work_package: 2026-04-07-18-49-50-human-gates
created_at: 2026-04-07 18:49:50
status: Completado
phase: Phase 1 — ANALYZE
```

# Análisis: human-gates

## Objetivo

Corregir el flujo de pm-thyrox para que Claude solicite autorización humana explícita en las transiciones de fase que lo requieren, en lugar de avanzar automáticamente.

## Evidencia del problema — comportamiento real observado

### Caso FASE 16 (registry-separation)

```
Phase 1: análisis → propuse scope → usuario respondió "Apruebas este scope"
         ↓ Claude interpretó: "la frase del usuario es aprobación implícita, continuar"
Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
         ↓ Sin ninguna pausa para autorización intermedia
```

### Caso FASE 17 (mise-reference-analysis)

```
Usuario: "genera un nuevo wp con todas las phases y copia ese análisis"
         ↓ Claude interpretó: "el usuario autorizó TODAS las fases completas"
Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 sin ningún gate
```

### Patrón subyacente

"SI" o cualquier respuesta afirmativa del usuario se interpreta como **autorización en blanco para todo el WP**, no como autorización para la siguiente fase.

---

## Análisis del SKILL.md actual — 3 causas raíz

### Causa 1: Exit conditions ambiguas en Phase 1 y 2

**Phase 1:**
> "Salir cuando: ...y el usuario aprobó los hallazgos."

**Phase 2:**
> "Salir cuando: Arquitectura aprobada con investigación documentada."

Estas frases describen un estado deseado pero NO instruyen a Claude a **detenerse y esperar**. Claude las interpreta como condiciones que él mismo puede verificar ("el análisis está completo → se cumple la condición → avanzo").

**Phase 3** funciona mejor porque dice explícitamente:
> "NO declarar Phase 3 completa hasta **confirmación explícita** del usuario"

La diferencia es `confirmación explícita` vs `usuario aprobó` — el primero es una instrucción de comportamiento, el segundo es una descripción de estado.

### Causa 2: Sin distinción por reversibilidad del WP

El SKILL.md trata igual:
- Un WP de documentación (mise-reference-analysis) — totalmente reversible, bajo riesgo
- Un WP que elimina archivos (registry-separation, FASE 15 eliminó `registry/`) — parcialmente irreversible
- Un WP que modifica infraestructura activa (MCP servers, bootstrap.py) — alto riesgo

Para un WP de documentación, avanzar automáticamente es razonable. Para uno que elimina archivos o modifica infraestructura, cada fase destructiva necesita un gate individual.

### Causa 3: Phase 5 → Phase 6 sin gate es el gap más peligroso

Phase 5 (DECOMPOSE) produce el task-plan. Phase 6 (EXECUTE) ejecuta esas tareas. La transición 5→6 es el punto donde Claude pasa de planificar a actuar. Sin un gate explícito aquí, Claude puede comenzar a ejecutar un plan que el usuario aún no aprobó en su totalidad.

El task-plan puede contener operaciones que el usuario, al verlas listadas, querría modificar antes de ejecutar.

### Causa 4: Operaciones destructivas en Phase 6 sin gate individual

Dentro de Phase 6, ciertas operaciones son irreversibles:
- `rm` / `rmdir` — eliminar archivos
- `git push --force` — sobrescribir historia remota
- Modificar `.mcp.json` o `CLAUDE.md` — afecta comportamiento de sesiones futuras
- Overwrite de archivos de configuración existentes con `--force`

Actualmente no hay instrucción de solicitar confirmación antes de estas operaciones específicas.

---

## GAPs identificados

| ID | Gap | Impacto | Fase |
|----|-----|---------|------|
| GAP-1 | Phase 1 exit no instruye a detenerse y esperar | Alto | 1→2 |
| GAP-2 | Phase 2 exit no instruye a detenerse y esperar | Alto | 2→3 |
| GAP-3 | Phase 4 exit no tiene gate humano | Medio | 4→5 |
| GAP-4 | Phase 5 → Phase 6 no tiene gate humano | **Crítico** | 5→6 |
| GAP-5 | Operaciones destructivas en Phase 6 sin gate individual | Alto | dentro de 6 |
| GAP-6 | Sin clasificación de WP por reversibilidad | Medio | Phase 1 |

---

## Criterios de éxito

- Un "SI" del usuario autoriza solo la siguiente fase, no todo el WP
- Phase 5 → Phase 6 nunca ocurre sin confirmación explícita del usuario
- Operaciones destructivas tienen gate individual visible antes de ejecutarse
- WPs de documentación pueden tener gates más ligeros que WPs de infraestructura
- El texto de las exit conditions usa lenguaje imperativo de comportamiento, no descriptivo de estado
