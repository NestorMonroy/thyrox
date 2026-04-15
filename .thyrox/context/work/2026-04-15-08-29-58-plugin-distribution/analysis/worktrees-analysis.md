```yml
created_at: 2026-04-15 08:45:00
project: THYROX
topic: .claude/worktrees/ — aplicabilidad al WP plugin-distribution
author: NestorMonroy
status: Borrador
```

# Sub-análisis: `.claude/worktrees/` aplicado a plugin-distribution

---

## Qué es `.claude/worktrees/`

Directorio de almacenamiento interno de Claude Code para git worktrees cuando se usa
`claude --worktree` / `claude -w`. Es una **excepción documentada** a la protección
de `.claude/`:

> *".git/, .claude/ (except `.claude/worktrees/`), shell config files..."*
> — `ultimate-guide.md` quiz question 490

Es decir: `.claude/` está protegido con safety invariant, pero `.claude/worktrees/`
es escribible por Claude Code sin prompting porque es donde el binario gestiona
sus worktrees internamente.

**Ciclo de vida:**
- Creado por: `claude --worktree` o `claude -w`
- Auto-cleanup: si no hay cambios en el worktree al terminar la sesión, se elimina automáticamente
- Gestión: 100% interna al binario — **no es para archivos del usuario**

---

## Dos mecanismos de worktree disponibles

| Mecanismo | Cómo se activa | Caso de uso |
|-----------|---------------|-------------|
| `claude --worktree` | CLI flag al iniciar sesión | Trabajo humano aislado en rama nueva |
| `isolation: "worktree"` en Agent tool | Parámetro del Agent tool | Subagente ejecuta en worktree temporal, se limpia si sin cambios |

El segundo es el más relevante para THYROX — ya está documentado en `agent-spec.md`
y se usa para que subagentes hagan cambios en aislamiento sin tocar el repo principal.

---

## Cómo nos ayuda en plugin-distribution

### Caso 1 — Probar `bin/thyrox-init.sh` sin tocar el repo principal (R-001, R-002)

El riesgo más alto de este WP es que el script de init sobrescriba `.thyrox/context/`
en el repo real (R-001) o que la safety invariant lo bloquee (R-002).

**Worktree como sandbox:**

```bash
# En Phase 6 EXECUTE: probar el init script en aislamiento
claude --worktree
# Dentro del worktree: ejecutar bin/thyrox-init.sh en un directorio limpio
# Si funciona → el worktree tiene cambios → se conserva
# Si rompe algo → el worktree no tiene cambios útiles → auto-cleanup
```

O vía Agent tool con `isolation: "worktree"`:

```python
Agent(
  description="test de bin/thyrox-init.sh en entorno limpio",
  isolation="worktree",
  prompt="Ejecuta bin/thyrox-init.sh en un directorio temporal limpio y reporta qué archivos crea y si triggea la safety invariant de .claude/"
)
```

Si el agente no hace cambios (script falla), el worktree se auto-limpia.
Si el script crea los archivos correctamente, el worktree tiene cambios y se conserva
para revisar.

### Caso 2 — Simular instalación en repo destino vacío (R-004, GAP-002)

No tenemos certeza de qué hace `bin/` durante instalación del plugin (mecanismo de
compound-engineering no documentado). Podemos simularlo:

```
Repo vacío simulado en worktree:
.
├── .git/
└── (sin .thyrox/, sin .claude/)

→ ejecutar bin/thyrox-init.sh
→ verificar que crea .thyrox/context/ con estructura correcta
→ verificar que crea .claude/settings.json con permisos THYROX
→ verificar que NO sobreescribe si ya existe (idempotencia)
```

El worktree parte del estado actual del repo pero en una rama nueva — podemos
simularlo más limpiamente creando un worktree y removiendo `.thyrox/` antes
de ejecutar el init.

### Caso 3 — Testing de hooks en sesión aislada (R-006)

Para el riesgo de hooks duplicados (R-006 — usuarios que tienen template + plugin),
podemos usar un worktree con un `settings.json` de prueba que tenga hooks del template
Y del plugin, y verificar que no se ejecuten dos veces.

```bash
claude --worktree
# En el worktree: modificar .claude/settings.json temporalmente
# para simular el estado de un usuario con template + plugin
# Verificar output del SessionStart hook
```

### Caso 4 — Desarrollo paralelo sin bloquear main (General)

La implementación de `plugin.json`, `hooks/hooks.json`, `bin/thyrox-init.sh` son
cambios riesgosos al núcleo del framework. Un worktree permite:

```
Branch principal: claude/check-merge-status-Dcyvj
  └── Worktree: plugin-distribution-impl
       ├── .claude-plugin/plugin.json (enriquecido)
       ├── hooks/hooks.json (nuevo)
       └── bin/thyrox-init.sh (nuevo)
```

Si algo sale mal, el worktree se descarta sin afectar la rama principal.

---

## Antipatrón a evitar

**NO usar `.claude/worktrees/` para guardar artefactos del WP.**

Este directorio es infraestructura interna de Claude Code. Los hallazgos, análisis,
y artefactos de este WP viven en `.thyrox/context/work/2026-04-15-08-29-58-plugin-distribution/`
como siempre.

El worktree es el **entorno de ejecución** para probar, no el **lugar de almacenamiento**
de resultados.

---

## Implicación para el plan de Phase 6

En Phase 5 (DECOMPOSE), agregar tareas de validación con worktree:

```
[T-NNN] Crear worktree de prueba y ejecutar bin/thyrox-init.sh en entorno limpio
  → Verificar: .thyrox/context/ creado correctamente
  → Verificar: .claude/settings.json creado correctamente
  → Verificar: segunda ejecución no sobreescribe estado existente (idempotencia)
  → Verificar: sin triggers de safety invariant
```

Esto cierra R-001, R-002 antes de Phase 6 EXECUTE.

---

## Resumen

| Caso de uso | Mecanismo | Beneficio |
|-------------|-----------|-----------|
| Probar init script sin riesgo | `claude --worktree` | Si falla, auto-cleanup — el repo real no se toca |
| Simular repo destino vacío | `isolation: "worktree"` en Agent | Ambiente limpio para testing de instalación |
| Verificar idempotencia | Agent con worktree | Ejecutar init script dos veces, verificar resultado |
| Desarrollo de cambios en plugin.json/hooks | `claude --worktree` | Rama aislada, fácil de descartar si no funciona |

El worktree es especialmente valioso aquí porque los cambios de este WP
(reemplazar `setup-template.sh`, reestructurar `plugin.json`, crear `hooks/`) son
**cambios de infraestructura del framework mismo** — el costo de un error es alto.
