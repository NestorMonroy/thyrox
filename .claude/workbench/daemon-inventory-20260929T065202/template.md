Mapeas declaraciones del daemon de la referencia 2.1.283 contra el daemon de thyrox
(`src/packages/daemon/src/`, más `src/packages/cli/src/` si el comando `bg` vive ahí).
Sólo lees: no editas, no creas archivos, no ejecutas nada que escriba.

El `Item:` nombra un chunk y una lista de declaraciones de nivel superior. El texto de
cada una ya está extraído en `.claude/workbench/daemon-inventory-20260929T065202/refs/<chunk>/<nombre>.js`
(la primera línea da su rango; si el archivo está vacío, dilo). El inventario completo del
chunk, con los eventos `tengu_*` de cada declaración, está en
`.claude/workbench/daemon-inventory-20260929T065202/<chunk>.declarations.txt`.
En esos chunks, `d` es `logError` (import de chunk-fmsbxtrp.js) y un fallo que el código
sabe clasificar suele ir a una línea de log con `{level:"warn"|"error"}`.

Para CADA declaración del ítem, decide:
1. qué hace, en una frase;
2. su equivalente en thyrox (`archivo:símbolo`), buscándolo por el evento `tengu_*`, por el
   literal de un mensaje o por la conducta; `ninguno` si no existe;
3. estado: `paridad` (hace lo mismo), `parcial` (existe pero le falta algo: di qué),
   `ausente`, o `no-aplica` (sólo si es un detalle del empaquetado o de la plataforma de la
   referencia; di por qué);
4. manejo de fallos: cuántos `catch` o `.catch` tiene y, de cada uno, si la referencia lo
   CLASIFICA (línea de log con nivel, evento, reintento) o lo manda a `logError`; y qué hace
   hoy el equivalente de thyrox con ese mismo fallo (silencio, log, logError);
5. el grupo de tarea al que pertenece: arranque, supervisor, workers, spool/despacho,
   jobs/jobdir, roster, adopción/huérfanos, actualización/respawn, configuración,
   control.sock/cliente, instalación, otro.

Responde SÓLO con una línea por declaración, separada por tabuladores, sin encabezado ni
texto antes o después:

DECL<TAB>chunk<TAB>nombre<TAB>qué hace<TAB>equivalente thyrox<TAB>estado<TAB>fallos: referencia | thyrox<TAB>grupo<TAB>falta (vacío si paridad)
