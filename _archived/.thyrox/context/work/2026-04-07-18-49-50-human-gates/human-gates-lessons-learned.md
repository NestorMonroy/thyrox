```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-18-49-50-human-gates
created_at: 2026-04-07 18:49:50
status: Completado
phase: Phase 7 — TRACK
```

# Lecciones Aprendidas: human-gates

## L-064 — "SI" previo = autorización en blanco (el patrón que rompemos aquí)

**Contexto:** El comportamiento previo interpretaba cualquier respuesta afirmativa del usuario como autorización para todo el WP. "SI" al inicio de la FASE 17 se tradujo en ejecutar 7 fases sin ninguna pausa.

**Lección:** La autorización es específica a la transición de fase, no al WP. Un "SI" al inicio autoriza Phase 1. El siguiente "SI" autoriza Phase 2. Cada gate requiere su propia confirmación.

**Fix aplicado:** `⏸ GATE HUMANO — STOP antes de continuar` en exit conditions de Phase 1, 2, 4 y 5. Con la instrucción explícita: "un SI previo no autoriza esta fase."

---

## L-065 — El lenguaje descriptivo de estado no genera comportamiento de pausa

**Contexto:** "salir cuando el usuario aprobó los hallazgos" describe un estado deseable pero no instruye a Claude a detenerse. Claude lo interpreta como una condición que puede verificar internamente.

**Lección:** Las instrucciones de comportamiento deben ser imperativas: "STOP", "presentar X", "esperar respuesta", "NO continuar hasta". El lenguaje descriptivo ("cuando X esté aprobado") se interpreta como evaluación interna, no como interacción requerida.

---

## L-066 — Phase 5 → Phase 6 es la transición más peligrosa del flujo

**Contexto:** Phase 5 produce el plan. Phase 6 ejecuta el plan. Sin gate entre ambas, Claude puede comenzar a modificar el repositorio con un plan que el usuario no revisó en detalle.

**Lección:** Este gate no tiene excepciones — ni siquiera para WPs de documentación. La transición planificación→ejecución siempre requiere aprobación humana explícita.

---

## L-067 — La clasificación por reversibilidad calibra la agresividad de los gates

**Contexto:** No todos los WPs tienen el mismo riesgo. Un WP de documentación que solo crea archivos en `context/work/` es fundamentalmente distinto a uno que elimina directorios o modifica `.mcp.json`.

**Lección:** Clasificar el WP en Phase 1 (`documentation` / `reversible` / `irreversible`) permite que los gates en Phase 6 sean proporcionales al riesgo real. Gates demasiado rígidos en WPs de documentación generan fricción innecesaria; gates demasiado laxos en WPs irreversibles son peligrosos.

---

## Resumen de cambios aplicados a SKILL.md

| Phase | Cambio |
|-------|--------|
| 1 | Exit condition: `⏸ GATE HUMANO` + clasificación `reversibility` en frontmatter del WP |
| 2 | Exit condition: `⏸ GATE HUMANO` |
| 3 | Sin cambio — ya tenía gate explícito ("NO declarar... hasta confirmación explícita") |
| 4 | Exit condition: `⏸ GATE HUMANO` con excepción para WPs `documentation` |
| 5 | Exit condition: `⏸ GATE HUMANO CRÍTICO` — sin excepciones |
| 6 | Añadido `⚠ GATE OPERACIÓN` para operaciones destructivas con lista explícita |
