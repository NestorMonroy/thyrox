Llevas en thyrox (Bun, TypeScript) el daemon y la superficie de trabajos en segundo plano
al directorio de configuración canónico. El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro.

Contexto medido en la referencia 2.1.283 (`_references/claude-code-bin/2.1.283/claude_strings.txt`):
el directorio de configuración es `Se = CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')`
(`var Se=Fo(()=>(o()??u(R(),".claude")).normalize("NFC"),o)`, con
`function o(){return process.env.CLAUDE_CONFIG_DIR}`); el daemon vive en
`join(Se(), "daemon")` (`function c(){return i(Se(),"daemon")}`) y los trabajos en
`join(Se(), "jobs")`. En thyrox ese directorio es `getConfigHomeDir()` de
`@thyrox/config/env/configHome` (`THYROX_CONFIG_DIR`, luego `~/.thyrox`, y `~/.claude` sólo
como respaldo heredado). El daemon y sus vecinos leen en cambio una variable inventada,
`THYROX_CONFIG_HOME`, y caen a `homedir()/.claude` fijo: en una instalación nueva, las
claves del buzón van a `~/.thyrox` y el daemon a `~/.claude`. No es una divergencia
declarada: es un error de porte.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos.
- Nada de `/tmp` fijo: `os.tmpdir()` + `mkdtemp` en pruebas; restaura `process.env` en
  `afterEach`.
- Toda variable THYROX_* que se lea necesita una prueba y su línea en `.env.example`; una
  que se retire, se quita de `.env.example`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano (`thyrox-bg`,
  `run_in_background`, `&`). Corre en primer plano sólo tus pruebas con
  `bun test <archivo>` desde el directorio del paquete.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados y un resumen de dos líneas.
