---
paths:
  - "src/hooks/**"
  - "src/session/user_wiring.py"
  - "src/session/hook_migration.py"
  - ".claude/settings*"
---

# Renombrar o mover un hook: el orden lo mide `hook_migration`, no la memoria

Un hook cableado es código vivo aunque ningún `import` lo nombre: el cliente
lo ejecuta por ruta en cada llamada a herramienta. Si esa ruta deja de
existir, python sale 2 y el cliente lo lee como un bloqueo **de toda
herramienta**, Bash incluido — la sesión no puede ni deshacerlo con las
herramientas normales. Es el episodio H-THYROX-221.

## El orden

1. **Buscar a todos los que lo nombran** — `bin/hook_migration refs <nombre-viejo>`.
2. **Crear la ruta nueva** sin retirar la vieja (`cp`, no `git mv`).
3. **Actualizar el cableado declarado** (`user_wiring.py`) y los `settings.json`
   versionados de cada consumidor.
4. **Actualizar el cableado vivo** — el `settings.local.json` del usuario, con
   su copia en `.claude/settings-backups/`.
5. **Verificar que el cliente ejecuta la ruta nueva**:
   `bin/hook_migration probe <ruta-nueva>`, una llamada a herramienta
   cualquiera, y `bin/hook_migration confirm <ruta-nueva>`. Sale 0 sólo si la
   leyó; si el sistema de archivos no actualiza el atime, rehúsa con exit 2.
6. **Retirar la ruta vieja.**
7. **Buscar otra vez**: `bin/hook_migration refs <nombre-viejo>` sale 0 y
   `bin/hook_migration broken` da `rotos=0`.

## Qué cuenta como referencia pendiente

`refs` clasifica cada línea por su ruta (`PATH_CLASSES` en el módulo):

| Clase | Qué es | Qué se hace |
|---|---|---|
| `LIVE` | código, `settings`, githooks, `bin/`, pruebas | se corrige: es un fallo |
| `CURRENT_DOC` | reglas, skills, `CLAUDE.md`, `README`, `source/` vigente | se actualiza |
| `HISTORICAL` | bancos, jobs, eventos, respaldos, hallazgos, `_references` | **se conserva**: es evidencia fechada |
| `UNCLASSIFIED` | una ruta que la tabla no conoce | se clasifica en la tabla antes de seguir |

Sale 0 sólo cuando todo lo que queda es `HISTORICAL`. Reescribir evidencia
histórica para bajar el conteo borra justo lo que explica la migración.

## Un commit, un efecto

Si al instalar el cableado aparece una reconciliación que no es parte de la
migración —un hook que faltaba, un consumidor nuevo—, se declara aparte: en
el banco de la migración y en su commit. El `settings.local.json` del
usuario no vive en git, así que su cambio sólo queda en la copia de respaldo
y en el banco.

```bash
python3 tests/session/test_hook_migration.py
```
