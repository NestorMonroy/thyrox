```yml
created_at: 2026-04-20 21:45:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 6 — SCOPE (DECISIONES PRE-DISEÑO)
author: NestorMonroy
status: Borrador
```

# Decisiones de Diseño y Protocolo de Errores

## Pregunta 1: Errores en Scripts Existentes

Si durante la implementación de workflows encontramos errores/bugs en scripts existentes (`.claude/scripts/`):

### Opción A: Fix in-place (Arreglar en este WP)
- Corregir el script en `.claude/scripts/`
- Crear commit de fix
- Documentar el bug encontrado en `.thyrox/context/errors/`
- El workflow reutiliza el script corregido

**Ventaja:** Scripts más confiables para futuros workflows
**Desventaja:** Scope creep (scope del WP se expande)

### Opción B: Create wrapper (Envolver el script)
- No modificar el script existente
- Crear wrapper en `.github/scripts/` que repara el output
- El workflow llama al wrapper, no al script original
- Documentar en `.thyrox/context/errors/` que script tiene bug

**Ventaja:** Scope acotado, aislamiento de cambios
**Desventaja:** Deuda técnica (script original sigue siendo incorrecto)

### Opción C: Defer (Diferir a futuro WP)
- Documentar que el script tiene problemas
- Workflow se implementa con validación manual o skipeo de esa validación
- Bug va a backlog de technical-debt.md
- Crear issue/task para WP futuro

**Ventaja:** Scope estricto, no bloquea este WP
**Desventaja:** Workflows funciona pero incompleto

### Decisión Propuesta: A + C (Hibrido)

**Protocolo:**
1. Si el error es trivial (typo, lógica simple): Fix in-place (A) — pequeño esfuerzo
2. Si el error es complejo (requiere refactoring): Defer (C) — documentar y continuar
3. Si el error impacta múltiples workflows: Fix in-place (A) — asegurar reutilización

**Documentación:**
- Crear archivo `.thyrox/context/errors/script-bugs-found.md` durante este WP
- Registrar cada bug encontrado con: script, descripción, decisión (fixed/deferred)

---

## Pregunta 2: Decisiones de Diseño Necesarias

### D-1: Branching Strategy

Flujo: feature → develop → main

**Necesita definición explícita de:**

Pregunta: ¿Qué branch es "default" en GitHub?
- Option 1: main (master)
- Option 2: develop

**Implicación:** Los workflows se comportan distinto según branch trigger.

Pregunta: ¿Qué validaciones son obligatorias?
- Para feature → develop: 
  - Commits convencionales? (SI/NO)
  - Links rotos? (SI/NO como blocker?)
  - Context audit? (SI/NO)
- Para develop → main:
  - Todos los anteriores?
  - Release notes?
  - Tag de versión?

**Decisión necesaria:** Matriz de validaciones por rama

---

### D-2: Workflow Failure Behavior

Si un workflow falla (ej: test-markdown-links detects broken links):

Pregunta: ¿Bloquea el PR o es advertencia?
- Option 1: Bloqueador — PR no se puede mergear
- Option 2: Advertencia — PR puede mergearse pero reviewer notificado
- Option 3: Comentario automático — CI comenta en el PR pero NO bloquea

**Decisión necesaria:** Severidad de cada validación

---

### D-3: Scope de Validaciones

Pregunta: ¿Qué archivos/directorios validan los workflows?

Ejemplo: detect-missing-md-links.sh puede validar:
- Option A: Todo el repo (lento)
- Option B: Solo archivos modificados en el PR (rápido)
- Option C: Solo `.thyrox/context/work/` (específico a WPs)

**Decisión necesaria:** Scope de validación por workflow

---

### D-4: Scripts Parsing/Dependencies

Scripts existentes usan:
- bash
- python3
- grep/ripgrep
- git

Pregunta: ¿Qué hacer si un script depende de algo que no está disponible en GitHub Actions?

Ejemplo: `.claude/scripts/context-audit.sh` podría depender de `.claude/` que no existe en algunos contextos.

**Decisión necesaria:** Verificar dependencies de cada script antes de reutilizar

---

### D-5: Error Reporting in Workflows

Cuando un workflow detecta un error (ej: link roto), ¿cómo reportarlo?

Options:
- Option A: Fail el workflow (exit 1) — bloquea el PR
- Option B: Crear comentario automático en PR
- Option C: Crear issue de seguimiento
- Option D: Agregar a un reporte consolidado

**Decisión necesaria:** Formato de reportes por validación

---

### D-6: Versioning de Scripts

Si un script en `.claude/scripts/` cambia durante este WP:

Pregunta: ¿El workflow debe usar una versión específica?

Options:
- Option A: Sempre usa script más reciente (git pull)
- Option B: Pin versión (ej: commit SHA)
- Option C: Semver si el script lo soporta

**Decisión necesaria:** Versionado de dependencies de scripts

---

## Síntesis: 6 Decisiones Necesarias

| Decisión | Pregunta | Impacto |
|----------|----------|--------|
| D-1 Branching Strategy | ¿Qué validaciones por rama? | ALTA — define todo el flujo |
| D-2 Workflow Failure | ¿Bloqueador o advertencia? | ALTA — requerimiento de merge |
| D-3 Validation Scope | ¿Validar todo o cambios? | MEDIA — performance vs coverage |
| D-4 Script Dependencies | ¿Qué verificar ante de usar? | MEDIA — riesgos de ejecución |
| D-5 Error Reporting | ¿Cómo reportar problemas? | MEDIA — UX del workflow |
| D-6 Script Versioning | ¿Usar latest o pin version? | BAJA — estabilidad iterativa |

---

## Siguiente Paso

Estas decisiones deben tomarse ANTES de Phase 8 PLAN EXECUTION.

Opciones:
1. Tomar decisiones AHORA (requiere análisis + opciones claras)
2. Documentarlas como ADRs en Phase 7 DESIGN/SPECIFY
3. Incluir decisiones en task-plan.md de Phase 8 con checkpoints explícitos

Recomendación: Tomar D-1 (Branching) y D-2 (Failure behavior) AHORA porque impactan todo el diseño.
D-3 a D-6 pueden documentarse en DESIGN/SPECIFY.

