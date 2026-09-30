Portas en thyrox (Bun, TypeScript) una pieza del daemon de `@thyrox/daemon` para que
se comporte como la referencia 2.1.283. El `Item:` de abajo nombra los archivos que te
pertenecen y los sitios de la referencia; no toques ningún otro archivo.

La referencia se lee con la herramienta del proveedor, nunca de memoria:

    R=_references/claude-code-bin/2.1.283/bunfs-root
    bash bin/binary literal <texto> --root $R          # dónde se usa un literal
    bash bin/binary symbol <chunk> <nombre>... --root $R   # a qué definición resuelve un nombre
    bash bin/binary references <chunk> <nombre> --root $R  # quién lo usa

Cita cada símbolo portado en un comentario con su chunk y su nombre minificado. Nunca
escribas bajo `_references/`. Si `bin/binary` no tiene la función que necesitas, no la
implementes tú: dilo en tu respuesta con la llamada que te faltó.

Reglas del porte:
- El daemon ejecuta; los dominios son dueños de sus datos (`.claude/rules/persistencia-y-procesos.md`).
  Un error persistente se registra con `logError` de `@thyrox/local-observability/logging`,
  que ya llega al error store; el daemon no abre bases ni guarda errores en sus archivos.
- Los eventos van por `logEvent` de `@thyrox/local-observability`; el nombre del evento se
  conserva tal cual (`tengu_*`).
- Todo lo que la referencia hace y aquí no se porte se declara en un comentario
  `// pendiente: <qué, por qué>`; nunca se omite en silencio.
- Identificadores, nombres de archivo y firmas en inglés; comentarios en español técnico, sin
  coloquialismos, con los términos técnicos en inglés. La palabra «Claude» con mayúscula no
  va en `src`. Sin imports dinámicos nuevos ni `require` dentro de funciones.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba, y dilo en tu respuesta.
- Nada de `/tmp` fijo (`os.tmpdir()` + `mkdtemp`); restaura `process.env`. No leas stdin.
- No añadas dependencias ni variables de entorno nuevas; no toques `bun.lock` ni `.env.example`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano: sólo tus pruebas y las
  existentes de `src/packages/daemon`.
- No commitees: deja los archivos en tu worktree. No termines esperando una notificación.

Al terminar, las pruebas de `src/packages/daemon` (y las de `src/packages/cli/src/__tests__` si tu pieza es de cli) deben quedar en verde. Responde con los
archivos cambiados, los símbolos de la referencia portados, lo declarado pendiente, los
controles de anulación y un resumen de dos líneas.

Contexto adicional de esta ola (Daemon D6–D16, segunda ola):
- El mapa de paridad está en `.claude/workbench/daemon-inventory-20260929T065202/parity-map.tsv`
  (columna 1 = tarea; columnas: chunk, nombre, qué hace, equivalente thyrox, estado, fallos,
  área, falta). Lee las filas de tu tarea antes de empezar; son tu lista de piezas.
- Clasificación de fallos exacta, por cada catch de lo que portes: la referencia distingue
  manejo esperado (sin log), log con nivel (`{level:"warn"|"error"}`), `logError` y silencio
  intencional. Porta la clase que la referencia usa en ESE sitio; nunca un `catch → logError`
  genérico. Cada rama de clasificación lleva su prueba.
- Al final, lista las filas de tu tarea con su estado nuevo (paridad / parcial con qué falta /
  latente).
