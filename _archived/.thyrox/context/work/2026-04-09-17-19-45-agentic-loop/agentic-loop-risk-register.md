```yml
type: Risk Register
work_package: 2026-04-09-17-19-45-agentic-loop
fase: FASE 27
created_at: 2026-04-09 18:00:00
```

# Risk Register — agentic-loop

## R-01: Verify checks demasiado genéricos → falsos negativos

```
Probabilidad: media
Impacto: medio
Severidad: media
```

**Descripción:** La tabla de checks en workflow-execute/SKILL.md define verificaciones genéricas que no detectan errores específicos del dominio (e.g., check de "link válido" no detecta que el link apunta al archivo incorrecto).

**Mitigación:** Definir checks por categoría de cambio (code / markdown / config / script), no por tipo de archivo. Documentar limitaciones conocidas en `agentic-loop.md`.

---

## R-02: Verify step ralentiza significativamente Phase 6

```
Probabilidad: baja
Impacto: medio
Severidad: baja
```

**Descripción:** Agregar verificación después de cada tarea puede hacer Phase 6 notoriamente más lenta, especialmente en WPs con muchas tareas (T-NNN > 15).

**Mitigación:** Hacer Verify opcional/configurable por tarea. Permitir que el SPEC de cada T-NNN indique `verify: none | basic | full`. Por defecto: `basic`.

---

## R-03: Conflicto entre Verify y Claim Protocol en ejecución paralela

```
Probabilidad: baja
Impacto: alto
Severidad: media
```

**Descripción:** Si dos agentes ejecutan en paralelo y ambos hacen Verify, pueden verificar el estado post-cambio del otro agente y reportar falso éxito o falso error.

**Mitigación:** En ejecución paralela, el Verify se restringe al scope de la tarea propia (archivos en `[~]` claim). No verificar archivos de otras tareas en curso.

---

## R-04: workflow-execute/SKILL.md crece en complejidad

```
Probabilidad: alta
Impacto: bajo
Severidad: baja
```

**Descripción:** Agregar la sección Verify aumenta la longitud del SKILL.md, potencialmente compitiendo con el contexto disponible en sesiones largas.

**Mitigación:** Mantener la tabla de checks concisa (max 10 líneas). Mover el detalle a `references/agentic-loop.md`.
