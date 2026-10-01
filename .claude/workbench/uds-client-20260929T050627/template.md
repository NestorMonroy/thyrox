Portas a thyrox (Bun, TypeScript) un módulo entero de la referencia 2.1.283. El `Item:` de
abajo nombra el chunk y los archivos que te pertenecen; no toques ningún otro.

Fuente: `_references/claude-code-bin/2.1.283/bunfs-root/<chunk>` (sólo lectura). Cada símbolo
exportado se porta completo —mismo comportamiento, mismos casos límite— o se declara su
divergencia en un comentario de intención con la razón medida; ninguno se omite en silencio.
Antes de escribir nada, busca en `src/packages/local-observability/src/uds/` y en el resto de
`src/packages` los símbolos que el chunk importa (`rg -n "<símbolo>" src/packages`): muchos
ya están portados (autenticación del buzón, ruta del socket, registro de sesiones y su
barrido `registrySweep`, sobre de mensajes, `peerMessageStatus`, `inboxDelivery`). Reúsalos;
no dupliques. Cada módulo nuevo cita en su cabecera qué símbolos de la referencia porta.

Ejecución en modo -p, sin nadie que te reanude:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama, comprueba
  que retirarla hace caer al menos una prueba. Para sockets reales usa un directorio de
  `mkdtemp` bajo `os.tmpdir()` y ciérralos en `afterEach`.
- Identificadores en inglés; comentarios en español, de intención, sin historial ni fechas.
  La palabra «Claude» con mayúscula no va en `src`. Sin imports dinámicos nuevos.
- Toda variable de entorno que la referencia lea como `CLAUDE_CODE_*` se lee como
  `THYROX_CODE_*`, con prueba y línea en `.env.example`.
- No añadas dependencias a ningún `package.json` ni toques `bun.lock`.
- No corras `tests/run.sh` ni lances trabajos en segundo plano. Corre en primer plano sólo tus
  pruebas con `bun test <archivo>` desde el directorio del paquete.
- No escribas nunca bajo `_references/`. No commitees: deja los archivos en tu worktree.
- No termines tu turno esperando una notificación: lo que no esté escrito se pierde.

Al terminar, las pruebas que tocaste deben quedar en verde. Responde con la lista de
archivos creados o cambiados, una tabla símbolo→archivo (o divergencia) y un resumen de dos líneas.
