```yml
type: Risk Register
work_package: 2026-04-09-17-28-34-auto-operations
fase: FASE 28
created_at: 2026-04-09 18:15:00
```

# Risk Register — auto-operations

## R-01: Script create-wp.sh crea WP con timestamp incorrecto

```
Probabilidad: baja
Impacto: alto
Severidad: media
```

Si el script usa `date +%Y-%m-%d-%H-%M-%S` pero hay desfase de zona horaria o el sistema no tiene `date` disponible, el timestamp será incorrecto. El WP queda con un nombre inconsistente con el `created_at` del frontmatter.

**Mitigación:** El script captura el timestamp una vez y lo usa para AMBOS: el directorio y el `created_at` del frontmatter.

---

## R-02: create-wp.sh sobreescribe now.md si ya hay un WP activo

```
Probabilidad: media
Impacto: alto
Severidad: alta
```

Si se invoca `/workflow-analyze` (y por tanto create-wp.sh) cuando ya hay un `current_work` activo en now.md, el script sobreescribiría el WP en curso.

**Mitigación:** El script verifica `current_work` en now.md antes de crear. Si hay WP activo, aborta con mensaje: "WP activo detectado: {nombre}. Cerrarlo primero."
