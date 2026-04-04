# /workflow_plan — Phase 3: PLAN

Inicia o retoma Phase 3 PLAN del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Verificar si ya existe `*-plan.md` con `[x] Scope aprobado`:
   - Si existe aprobado → Phase 3 ya completó. Proponer `/workflow_structure`.
3. Verificar que ROADMAP.md tiene el WP linkeado.

---

## Fase a ejecutar: Phase 3 PLAN

1. Brainstorm con el usuario: ¿qué problema? ¿quiénes son usuarios? ¿qué es éxito? ¿qué está fuera?
2. Verificar WP activo: `ls .claude/context/work/`
3. Crear `[nombre-wp]-plan.md` usando `assets/plan.md.template`:
   - Scope statement (problema + usuarios + criterios de éxito)
   - In-scope: lista explícita de lo que entra
   - Out-of-scope: lista explícita con razón de cada exclusión
   - Estimación de esfuerzo por componente
4. Actualizar ROADMAP.md con features y link al WP
5. Presentar scope al usuario y esperar confirmación explícita

**IMPORTANTE:** No declarar Phase 3 completa hasta recibir confirmación del usuario.

---

## Exit criteria

Phase 3 completa cuando:
- `work/../[nombre]-plan.md` existe
- `[x] Scope aprobado` está marcado en el plan
- ROADMAP.md tiene el WP linkeado

Al terminar: proponer `/workflow_structure` para Phase 4.
