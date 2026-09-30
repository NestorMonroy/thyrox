```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
Work: Análisis de references y templates + tests adicionales
```

# Solution Strategy: References, Templates y Tests

## Research Step

### Unknown 1: ¿Cómo implementar los 31 tests?

**Alternativas:**
- A) evals.json según skill-creator — requiere ejecución con subagents y grading
- B) Documento markdown con queries y expected outputs — verificable manualmente
- C) Script bash que verifica si el SKILL tiene los links y keywords correctos — determinístico

**Evidencia:**
- skill-creator dice: "Save test cases to evals/evals.json"
- Pero también dice: "In Claude.ai, skip the quantitative benchmarking"
- Nuestro entorno tiene subagents pero no tiene el eval-viewer de skill-creator
- Los 20 trigger evals verifican la description (matching), no el body
- Los 3 functional evals verifican el workflow (necesitan ejecución real)
- Los 8 derivados verifican reference/template correcta (verificable por contenido)

**Decisión:** B + C combinados.
- **Trigger evals (20+8):** Documento markdown con queries categorizadas. No se pueden ejecutar como script — dependen de cómo Claude procesa la description internamente.
- **Functional evals (3):** Crear evals.json según formato skill-creator para posible ejecución futura.
- **Reference/template mapping verification:** Script que verifica que SKILL.md enlaza a todas las references y que el mapeo fase→reference es correcto.

**Justificación:** No tenemos el eval-viewer ni run_loop.py del skill-creator. Pero podemos crear los archivos en el formato correcto para cuando estén disponibles, y verificar lo que se puede verificar determinísticamente ahora.

### Unknown 2: ¿Las 10 references >300 líneas necesitan TOC ahora?

**Evidencia:**
- skill-creator dice: "For large reference files (>300 lines), include a table of contents"
- 10 references exceden 300 líneas
- Agregar TOC a 10 archivos es trabajo significativo

**Decisión:** Crear un script que detecte references >300 líneas sin TOC, documentar cuáles necesitan, pero no agregar TOCs ahora.
**Justificación:** El TOC es mejora de calidad, no bloqueante. El script puede detectar y el trabajo de agregar TOCs va en otro work package.

### Unknown 3: ¿CLAUDE.md necesita actualización post-rewrite del SKILL?

**Evidencia:**
- CLAUDE.md actual (51 líneas) referencia SKILL.md correctamente
- La estructura no cambió (skills/pm-thyrox/ sigue igual)
- Los locked decisions no cambiaron
- El SKILL.md cambió internamente pero su ubicación y nombre son iguales

**Decisión:** No actualizar CLAUDE.md. Solo verificar que los links funcionan.
**Justificación:** CLAUDE.md es estable. Solo cambió el contenido del SKILL, no su interfaz.

---

## Strategy

### Artefactos a crear

| Artefacto | Tipo | Propósito |
|-----------|------|-----------|
| `evals/evals.json` | JSON | 3 functional evals en formato skill-creator |
| `evals/trigger-evals.json` | JSON | 28 trigger evals (20 original + 8 derivados) |
| Script de verificación de mapping | Bash | Verificar references enlazadas + >300 líneas sin TOC |

### Lo que NO hacemos ahora

| Acción | Por qué no |
|--------|-----------|
| Agregar TOC a 10 references | Trabajo separado, no bloqueante |
| Ejecutar trigger evals con run_loop.py | No tenemos el tooling |
| Description optimization | Requiere evaluar triggers primero |
| Blind comparison | Requiere subagents especializados |

---

## Siguiente Paso

→ Phase 3: PLAN
