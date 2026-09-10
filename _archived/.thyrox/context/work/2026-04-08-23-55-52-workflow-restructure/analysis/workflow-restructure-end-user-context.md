```yml
project: THYROX
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-08 23:55:52
updated_at: 2026-04-08 23:55:52
phase: Phase 1 — ANALYZE (Step 0)
```

# END USER CONTEXT: workflow-restructure

---

## END USER

**¿Quién es?**

El desarrollador que usa Claude Code con pm-thyrox activo y escribe `/workflow_analyze` (u otro `/workflow_*`) al inicio de cada sesión para ejecutar la fase activa de su work package. No es un usuario abstracto — es quien teclea el comando en el prompt de Claude Code.

**¿Qué problema resuelve con nuestro sistema?**

En lugar de escribir instrucciones largas cada sesión, escribe `/workflow_analyze` y Claude sigue automáticamente el protocolo completo de Phase 1: Step 0, 8 aspectos, creación de WP, análisis, gate humano. El skill es su "piloto automático" para ejecutar fases del SDLC.

**¿Cómo mide el éxito?**

- `/workflow_analyze` (o el nombre que resulte de FASE 23) responde igual que antes del cambio
- La estructura de `.claude/skills/` es visualmente consistente: todos los skills son directorios, no una mezcla de directorios y archivos planos
- Puede agregar archivos auxiliares a `workflow_analyze/` sin romper la estructura (ej. referencias específicas de fase)

**¿Qué lo frustra hoy (sin el cambio)?**

- `.claude/skills/` tiene 7 archivos planos mezclados con 8 subdirectorios — la inconsistencia visual dificulta navegar el directorio
- No puede agregar archivos auxiliares por skill de fase sin crear una convención nueva

---

## Cadena de Requisitos

| Capa | Traducción del requisito | Restricción que introduce |
|------|--------------------------|--------------------------|
| **END USER** | `/workflow_analyze` sigue funcionando después de la migración | — |
| **App / Producto** | Convertir flat files a subdirectorios manteniendo `/<name>` invocación | La invocación `/<name>` depende del nombre del directorio/archivo |
| **Framework / Metodología** | pm-thyrox define convención de subdirectorios (Option B, ADR-016) | El nombre del directorio determina `/<name>` — underscore vs hyphen importa |
| **Platform / Runtime** | Claude Code resuelve `/<name>` desde nombre de archivo (flat) o nombre de directorio (subdir) | Si cambias guion/underscore en directorio, cambia la invocación |
| **Hardware / Infraestructura** | Sistema de archivos — sin restricciones | El END USER percibe el cambio solo si la invocación falla |

**Puntos de fricción:**

- **Fricción 1:** Si el directorio usa hyphen (`workflow-analyze/`) pero `session-start.sh` emite `/workflow_analyze` (underscore), la opción B del menú de sesión apuntará a un nombre incorrecto — el usuario recibe guía incorrecta en cada sesión.
- **Fricción 2:** Si el directorio usa underscore (`workflow_analyze/`) pero la convención del proyecto es kebab-case (pm-thyrox, backend-nodejs), la inconsistencia de naming persiste a nivel de directorio.

---

## Restricciones Relevantes para el END USER

| Restricción | Origen (capa) | Impacto en END USER | ¿Mitigable? |
|-------------|--------------|---------------------|-------------|
| `/<name>` = nombre del directorio en subdirectory skills | platform | Si cambia directorio a hyphen, cambia el comando que debe escribir | sí — usar underscore en directorio |
| `session-start.sh` hardcodea `/workflow_analyze` etc. | app | Si invocación cambia, el menú de inicio muestra comandos incorrectos | sí — actualizar session-start.sh |
| `description:` en frontmatter debe coincidir con `/<name>` real | framework | Si no coincide, el Skill tool muestra nombre incorrecto | sí — actualizar frontmatter |

---

## Notas de Contexto

- Decisión arquitectónica Option B tomada en FASE 22: subdirectorios con SKILL.md. No hay decisión sobre underscore vs hyphen.
- `pm-thyrox/SKILL.md` usa hyphen → convención natural del proyecto es kebab-case.
- Los 7 flat files usan underscore (`workflow_analyze.md`) → inconsistencia ya existente.
- El usuario dijo explícitamente "workflow-analyze/SKILL.md" (hyphen) en su instrucción de FASE 23. Esto implica cambio de invocación de `/workflow_analyze` a `/workflow-analyze`.

---

## Checklist Step 0

- [x] END USER identificado como persona real (no rol abstracto)
- [x] Problema expresado en su vocabulario (sin jerga técnica del implementador)
- [x] Al menos un indicador de éxito desde su perspectiva
- [x] Cadena de requisitos trazada (todas las capas)
- [x] Al menos un punto de fricción identificado o "Ninguno" explícito
