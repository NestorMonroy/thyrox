---
description: /workflow_analyze — Phase 1: ANALYZE. Inicia o retoma análisis del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 1' >> .claude/context/now.md"
updated_at: 2026-04-08
---

# /workflow_analyze — Phase 1: ANALYZE

Inicia o retoma Phase 1 ANALYZE del work package activo.

---

## Contexto de sesión

1. Identificar el work package activo (directorio más reciente en `context/work/`):
   ```bash
   ls -t .claude/context/work/ | head -1
   ```

2. Listar tech skills activos:
   ```bash
   ls .claude/skills/ | grep -v pm-thyrox
   ```

3. Verificar si ya existe un `*-analysis.md` en el WP activo:
   ```bash
   ls .claude/context/work/[WP-activo]/analysis/ 2>/dev/null
   ```
   - Si existe sin `[NEEDS CLARIFICATION]` → Phase 1 ya completó. Proponer `/workflow_strategy`.
   - Si no existe → iniciar Phase 1.

---

## Fase a ejecutar: Phase 1 ANALYZE

Seguir el SKILL pm-thyrox Phase 1 completo:

1. Investigar los 8 aspectos (Objetivo, Stakeholders, Uso operacional, Calidad, Restricciones, Contexto, Fuera de alcance, Criterios de éxito)
2. Crear work package si no existe: `context/work/$(date +%Y-%m-%d-%H-%M-%S)-[nombre]/`
3. Crear `analysis/[nombre-wp]-analysis.md` usando `assets/introduction.md.template`
4. Crear `[nombre-wp]-risk-register.md` usando `assets/risk-register.md.template`
5. Para proyectos medianos/grandes: crear `[nombre-wp]-exit-conditions.md`

Tech skills activos a considerar en el análisis:
- Si hay `frontend-react`: investigar componentes afectados, estado, rutas
- Si hay `backend-nodejs`: investigar endpoints, capas, dependencias de API
- Si hay `db-postgresql`: investigar tablas, relaciones, volumen de datos

---

## Exit criteria

Phase 1 completa cuando:
- `work/.../analysis/[nombre]-analysis.md` existe
- No contiene `[NEEDS CLARIFICATION]`
- Usuario aprobó los hallazgos

Al terminar: proponer `/workflow_strategy` para Phase 2.
