Llevas en thyrox (Bun, TypeScript) un sitio que calcula `homedir()/.claude` a mano al
directorio de configuración canónico. El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro.

Contexto medido en la referencia 2.1.283 (`_references/claude-code-bin/2.1.283/claude_strings.txt`):
el directorio de configuración es `Se = CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')`
(`var Se=Fo(()=>(o()??u(R(),".claude")).normalize("NFC"),o)`). En thyrox ese directorio es
`getConfigHomeDir()` de `@thyrox/config/env/configHome` (`THYROX_CONFIG_DIR`, luego
`~/.thyrox`, y `~/.claude` sólo como respaldo heredado); para un directorio de DATOS con
variable propia, `resolveDataDir(variable, subdir)` del mismo módulo. Un sitio que escriba
`join(homedir(), '.claude', …)` o `process.env.THYROX_CONFIG_DIR ?? join(homedir(), '.claude')`
reimplementa el resolutor sin el `~/.thyrox`: en una instalación nueva ese dato cae en otro
directorio que el resto.

Antes de cambiar, mide en la referencia qué hace ESE sitio: busca en `claude_strings.txt`
el literal de su subdirectorio (p. ej. `"plans"`, `"local"`, `"telemetry"`, `"state"`,
`"debug"`) junto a `Se()` y cita la cadena que encuentres en un comentario de intención de
una línea. Si la referencia NO lo resuelve por `Se()` (p. ej. es un literal mostrado al
usuario, o una ruta fija deliberada), no lo cambies: deja el archivo intacto y dilo en tu
respuesta con la cadena que lo prueba.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo (con `THYROX_CONFIG_DIR` apuntando a un `mkdtemp` debe usarse
  ese directorio, y sin él, `~/.thyrox` cuando exista); después la implementación. Por cada
  guarda o rama nueva, comprueba que retirarla hace caer al menos una prueba.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos.
- Nada de `/tmp` fijo: `os.tmpdir()` + `mkdtemp` en pruebas; restaura `process.env` en
  `afterEach`. Para no depender del HOME real, inyecta el home o usa `resolveConfigHomeDir`.
- Toda variable THYROX_* que se lea necesita una prueba y su línea en `.env.example`.
- No añadas dependencias a ningún `package.json` ni toques `bun.lock`: el paquete ya depende
  de `@thyrox/config`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano (`thyrox-bg`,
  `run_in_background`, `&`). Corre en primer plano sólo tus pruebas con
  `bun test <archivo>` desde el directorio del paquete.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados y un resumen de dos líneas.
