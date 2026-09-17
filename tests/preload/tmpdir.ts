/**
 * El grifo de /tmp para `bun test` suelto: una suite no deja su fixture en el
 * directorio compartido.
 *
 * Por que un preload y no editar las suites. Medido antes de elegir: 115
 * archivos `.ts` crean su directorio con `mkdtemp`/`mkdtempSync` y 56 no lo
 * retiran nunca. Editar 56 archivos es 56 oportunidades de que el 57 nazca sin
 * la limpieza; redirigir `TMPDIR` los cubre a todos por construccion, incluido
 * el que todavia no existe.
 *
 * Que `TMPDIR` alcanza esta medido por conducta, no leido de una descripcion:
 * `os.tmpdir()` de bun, `mkdtempSync` de `node:fs` y `mktemp -d` de coreutils
 * los tres lo honran. Y el bypass esta medido en CERO: ningun `.ts`, `.py` ni
 * `.sh` del arbol crea bajo un literal `/tmp/`.
 *
 * Por que `afterAll` y no `process.on('exit')`. La primera version uso el
 * segundo y el directorio quedo en disco con sus doce fixtures dentro: medido,
 * `bun test` NO dispara `exit` ni `beforeExit` en el proceso del corredor. Con
 * `afterAll` desde el preload si dispara — una vez por ejecucion, no una por
 * archivo, y tambien cuando algun caso queda en rojo (las tres, medidas). El
 * defecto que esto cierra es de la clase que un control verde no distingue: el
 * `TMPDIR` redirigido hacia sentir que el grifo cerraba, cuando lo unico que
 * hacia era mover el charco de sitio.
 *
 * La guarda que impide el dano: este modulo retira SOLO el directorio que el
 * mismo creo. Cuando el llamador ya fijo `THYROX_TEST_TMPDIR` —lo hace
 * `tests/run.sh` para toda la ejecucion— lo hereda y no lo toca: sin esa guarda,
 * cada `bun test` de una ejecucion borraria el directorio de los demas mientras
 * corren.
 *
 * Ciega a: una ejecucion que muera por senal (el corredor no llega a `afterAll`
 * y el directorio sobrevive). Ese caso lo cubre el `trap` de `tests/run.sh`,
 * que actua desde fuera del proceso.
 *
 * Su control de anulacion vive en `tests/session/test-tmpdir-faucet.sh`, con
 * `impactCli.test.ts` como control positivo real —la suite que dejo 3408
 * copias del mismo repo sintetico, 823 MB— y no un incumplidor fabricado.
 */
import { afterAll } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** La clave por la que un llamador declara que el directorio es suyo. */
const OWNER_VAR = 'THYROX_TEST_TMPDIR'

/**
 * El prefijo que marca la propiedad.
 *
 * No es cosmetico: es el discriminador de la guarda de borrado. Un directorio
 * que no lo lleve no se retira aunque este en `TMPDIR`, porque entonces la
 * unica evidencia de propiedad seria una variable que cualquiera puede fijar.
 */
const OWNED_PREFIX = 'thyrox-tests-'

const inherited = process.env[OWNER_VAR]

if (inherited === undefined || inherited === '') {
  const owned = mkdtempSync(join(tmpdir(), OWNED_PREFIX))
  process.env.TMPDIR = owned
  process.env[OWNER_VAR] = owned

  afterAll(() => {
    // Se re-comprueba el prefijo al salir, no solo al crear: entre una cosa y
    // la otra el proceso pudo reescribir la variable. El significante —que la
    // variable exista— no autoriza a borrar; lo autoriza el nombre del
    // directorio, que es lo unico que este modulo controla.
    const target = process.env[OWNER_VAR]
    if (typeof target === 'string' && target.includes(`/${OWNED_PREFIX}`)) {
      rmSync(target, { recursive: true, force: true })
    }
  })
}
