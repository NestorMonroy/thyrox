```yml
created_at: 2026-04-17 22:15:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Análisis: setup-template.sh en README — Mantener vs Eliminar

> Análisis de implicaciones para T-009 fix B-3. Contexto: El README actual mantiene
> `setup-template.sh` como "Opción A" con nota de migración. T-017 esperaba grep vacío.

---

## Contexto

**¿Qué es setup-template.sh?**
Script de inicialización que existía en versiones pre-ÉPICA 39 del framework. Fue reemplazado por `bin/thyrox-init.sh` durante la migración a plugin puro (ÉPICA 39). El script original no existe en el repositorio actual pero persiste en la memoria muscular de usuarios con instalaciones antiguas.

**Estado actual en README (líneas 93-100):**
```markdown
# Opción A — inicialización guiada (si setup-template.sh existe):
bash setup-template.sh

# Opción B — manual:
# Editar ROADMAP.md, CLAUDE.md y .thyrox/context/now.md con el nombre de tu proyecto

> **Nota de migración:** Si `setup-template.sh` no existe en tu versión, usa la Opción B.
> El registry en `.thyrox/registry/` genera los componentes dinámicamente vía `bootstrap.py`.
```

---

## Implicaciones de MANTENER (approach actual)

### ✅ Ventajas

| Aspecto | Detalle |
|---------|---------|
| **Retrocompatibilidad** | Usuarios con instalaciones antiguas que aún tienen `setup-template.sh` pueden seguir la Opción A sin romper su flujo |
| **Transición suave** | La nota de migración educa sin forzar un cambio abrupto |
| **Menor deuda cognitiva** | Usuarios que recuerdan el comando antiguo encuentran una respuesta en el README |
| **Documentación honesta** | El README refleja que el script _puede_ existir en el repo copiado, no que es el camino canónico |

### ❌ Costos

| Aspecto | Detalle |
|---------|---------|
| **Confusión de nuevos usuarios** | Alguien que llega al framework desde cero ve "Opción A" con un script que no existe — puede generar frustración e issue support |
| **Documentación bifurcada** | El README describe dos caminos donde solo uno está activo, lo que incrementa la superficie de texto a mantener |
| **Drift permanente** | Cada vez que el framework evolucione, habrá que recordar que "Opción A" sigue existiendo y si aún aplica |
| **Señal de arquitectura incorrecta** | Mantener referencias a scripts deprecados comunica que el framework está en transición — cuando en realidad la transición (ÉPICA 39) ya terminó hace versiones |

### Obligaciones si se mantiene

1. **Mantener la nota de migración** actualizada en cada release
2. **Verificar en cada ÉPICA** que la "Opción A" no haya quedado completamente inválida
3. **Documentar el trigger de eliminación**: ¿cuándo se elimina? ¿en v3.0.0? ¿después de N versiones? Sin criterio de salida, vive para siempre

---

## Implicaciones de ELIMINAR

### ✅ Ventajas

| Aspecto | Detalle |
|---------|---------|
| **README limpio** | Un solo camino de inicialización — no hay ambigüedad |
| **Menos mantenimiento** | No hay referencia a script inexistente que "pueda" o "no pueda" estar |
| **Arquitectura honesta** | Refleja el estado real post-ÉPICA 39: solo existe `bin/thyrox-init.sh` |
| **T-017 pasa en verde** | El grep queda vacío como fue diseñado |

### ❌ Costos

| Aspecto | Detalle |
|---------|---------|
| **Ruptura de memoria muscular** | Usuarios con el repo antiguo que ejecutan `bash setup-template.sh` no encuentran ni el script ni la referencia — el error es silencioso |
| **Pérdida de contexto histórico** | Si se elimina sin nota, se pierde la señal de que hubo una transición |

### Si se elimina, debe incluirse

Una nota breve en el CHANGELOG o en el README de distribución:
```
> v2.8.x+: La inicialización vía setup-template.sh fue reemplazada por bin/thyrox-init.sh en ÉPICA 39.
```

---

## Implicaciones de DESARROLLAR `setup-template.sh`

> El usuario también preguntó sobre "desarrollar". Este escenario implica volver a crear el script.

### Cuándo tendría sentido

Solo si el framework adopta una distribución multi-modo: (a) plugin puro (`bin/thyrox-init.sh`) para Claude Code con plugin system, y (b) template directo (`setup-template.sh`) para usuarios que copian el repo sin usar el plugin system.

### Por qué NO es recomendable hoy

1. **Duplicación de lógica**: `bin/thyrox-init.sh` y `setup-template.sh` harían lo mismo — dos fuentes de verdad para inicialización
2. **ÉPICA 39 ya resolvió esto**: La decisión de mover a plugin puro fue deliberada (ADR implícito en ÉPICA 39). Revertir requeriría nuevo ADR con justificación
3. **Overhead de mantenimiento**: Cada cambio de inicialización habría que hacerlo en dos scripts
4. **Señal contradictoria**: Mantener `setup-template.sh` activo enviaría la señal de que el sistema de plugins no es el camino principal

### Alternativa si se quiere soporte multi-modo

Crear un único `bin/thyrox-init.sh` que detecte el modo:
```bash
if [ -f ".claude-plugin/plugin.json" ]; then
  # modo plugin — ya inicializado
else
  # modo template — ejecutar setup básico
fi
```

---

## Decisión recomendada

**Eliminar la Opción A y mantener solo la Opción B** con una línea de contexto histórico:

```markdown
2. **Inicializar el proyecto:**
   ```bash
   # Editar ROADMAP.md, CLAUDE.md y .thyrox/context/now.md con el nombre del proyecto
   ```
   > `bin/thyrox-init.sh` automatiza este paso en instalaciones con plugin activo.
   > Si vienes de una versión pre-v2.8.0 con setup-template.sh, ver CHANGELOG para migración.
```

**Razones:**
- La transición (ÉPICA 39) está completa — no hay razón para mantener referencias al pasado en el camino feliz
- El criterio de T-017 (grep vacío) fue diseñado por el mismo equipo que diseñó la migración — es la intención correcta
- Un README más corto y sin bifurcaciones tiene menor costo de mantenimiento
- La nota histórica en CHANGELOG es más apropiada que en el quick start

**Cuándo ejecutar el fix:**
En la sesión actual (Stage 11 TRACK/EVALUATE) si el ejecutor aprueba esta dirección, ya que es un cambio pequeño y de bajo riesgo en un archivo de documentación.

---

## Criterio de salida para referencias históricas en README

Regla propuesta (para documentar como convención):

> Las referencias a scripts/comandos deprecados se eliminan del README en la siguiente versión MINOR después de que el reemplazo esté estable. Una nota en CHANGELOG-archive.md es suficiente evidencia histórica.

Aplicando esta regla: `setup-template.sh` fue reemplazado en ÉPICA 39 (v2.7.x). La versión actual es v2.8.0. La referencia debe eliminarse ahora.
