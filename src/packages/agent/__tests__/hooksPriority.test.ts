/**
 * Registro de hooks con prioridad — adaptado de VVV (MIT).
 *
 * MITAD ROJA. `runHooks` recibe el contrato del cliente y lo recorre asi:
 *
 *     for (const grupo of config[event] ?? [])
 *       for (const h of grupo.hooks)
 *
 * El orden es la POSICION EN EL ARREGLO. Anadir un hook exige editar la
 * configuracion en el sitio correcto, y no hay forma de decir «este va
 * despues de aquel» sin saber donde esta aquel.
 *
 * VVV resuelve exactamente eso con `vvv_add_hook <evento> <funcion>
 * [prioridad]` / `vvv_hook <evento>` (provision/provision-helpers.sh:533-627):
 * el consumidor registra contra un punto con NOMBRE y un numero, y el
 * orquestador solo invoca el punto. `provision/core/nginx/provision.sh`
 * registra seis funciones en seis puntos, una con prioridad 40, sin tocar
 * `provision/provision.sh`.
 *
 * EL PORTE ES ADITIVO, y esa es su propiedad de diseno: `runHooks` existe para
 * que los hooks que este repo ya tiene corran SIN reescribirse, asi que si
 * nadie declara prioridad el orden tiene que quedar identico al de hoy. La
 * prioridad por defecto es 10 —la de VVV— y el orden dentro de un mismo numero
 * es el de declaracion (orden estable). Con todo en 10, estable == posicion.
 *
 * CONTROL DE ANULACION, medido: si el orden vuelve a ser la posicion del
 * arreglo, caen **4 de 8** — el 2, el 4, el 6 y el 8, que son exactamente los
 * cuatro que dependen del orden. Sobreviven el 1 (sin prioridad nada cambia),
 * el 3 (estabilidad), el 5 (matcher) y el 7 (validacion del evento), que no
 * dependen de el.
 *
 * Al declararlo antes de medirlo escribi «cae el caso 2 —y solo el 2—», que se
 * quedaba corto: el 4, el 6 y el 8 tambien miden orden. Se corrige aqui en vez
 * de dejar la declaracion mal, porque una anulacion que dice caer menos de lo
 * que cae no sirve para leer un rojo futuro.
 */

import { describe, expect, test } from 'bun:test'
import { addHook, orderedCommands, runHooks, type HookConfig } from '../loop/hooks.ts'

/** Un hook que deja su marca en un archivo, para leer el ORDEN real. */
function marca(archivo: string, etiqueta: string) {
  return { type: 'command' as const, command: `echo ${etiqueta} >> ${archivo}` }
}

describe('registro de hooks con prioridad — adaptado de VVV', () => {
  test('1. sin prioridad declarada el orden es el de hoy: la posicion', () => {
    const cfg: HookConfig = {
      Stop: [{ hooks: [marca('/dev/null', 'a'), marca('/dev/null', 'b')] },
             { hooks: [marca('/dev/null', 'c')] }],
    }
    expect(orderedCommands(cfg, 'Stop', {}).map((h) => h.command))
      .toEqual(['echo a >> /dev/null', 'echo b >> /dev/null', 'echo c >> /dev/null'])
  })

  test('2. la prioridad manda sobre la posicion', () => {
    const cfg: HookConfig = {
      Stop: [{ hooks: [
        { ...marca('/dev/null', 'tarde'), priority: 40 },
        { ...marca('/dev/null', 'pronto'), priority: 5 },
      ] }],
    }
    expect(orderedCommands(cfg, 'Stop', {}).map((h) => h.command))
      .toEqual(['echo pronto >> /dev/null', 'echo tarde >> /dev/null'])
  })

  test('3. dentro de una prioridad se conserva el orden de declaracion', () => {
    const cfg: HookConfig = {
      Stop: [{ hooks: [
        { ...marca('/dev/null', 'primero'), priority: 10 },
        { ...marca('/dev/null', 'segundo'), priority: 10 },
      ] }],
    }
    expect(orderedCommands(cfg, 'Stop', {}).map((h) => h.command))
      .toEqual(['echo primero >> /dev/null', 'echo segundo >> /dev/null'])
  })

  test('4. el defecto es 10, el de VVV: un sin-declarar corre ANTES de un 40', () => {
    const cfg: HookConfig = {
      Stop: [{ hooks: [
        { ...marca('/dev/null', 'con40'), priority: 40 },
        marca('/dev/null', 'sin'),
      ] }],
    }
    expect(orderedCommands(cfg, 'Stop', {}).map((h) => h.command))
      .toEqual(['echo sin >> /dev/null', 'echo con40 >> /dev/null'])
  })

  test('5. el matcher se sigue respetando al ordenar', () => {
    const cfg: HookConfig = {
      PreToolUse: [
        { matcher: 'Bash', hooks: [{ ...marca('/dev/null', 'bash'), priority: 1 }] },
        { matcher: 'Read', hooks: [{ ...marca('/dev/null', 'read'), priority: 0 }] },
      ],
    }
    // `read` tiene prioridad menor, pero su matcher no aplica: no debe salir.
    expect(orderedCommands(cfg, 'PreToolUse', { tool_name: 'Bash' }).map((h) => h.command))
      .toEqual(['echo bash >> /dev/null'])
  })

  test('6. addHook registra sin que el consumidor edite arreglos', () => {
    const cfg: HookConfig = {}
    addHook(cfg, 'Stop', 'echo tarde', 40)
    addHook(cfg, 'Stop', 'echo pronto', 5)
    expect(orderedCommands(cfg, 'Stop', {}).map((h) => h.command))
      .toEqual(['echo pronto', 'echo tarde'])
  })

  test('7. addHook rehusa un evento que este harness no emite', () => {
    // VVV valida el nombre del hook antes de cualquier `eval`. Aqui no hay
    // eval, pero el defecto equivalente es peor y esta declarado en el propio
    // hooks.ts: un evento sin emisor es capacidad muerta — el hook se escribe,
    // nunca corre, y su silencio se lee como que no paso nada.
    expect(() => addHook({}, 'TeammateIdle', 'echo x')).toThrow(/TeammateIdle/)
  })

  test('8. el orden con prioridad es el que runHooks EJECUTA, no solo el que lista', async () => {
    const f = `${process.env.TMPDIR ?? '/tmp'}/orden-${Date.now()}.txt`
    const cfg: HookConfig = {}
    addHook(cfg, 'Stop', `echo tarde >> ${f}`, 40)
    addHook(cfg, 'Stop', `echo pronto >> ${f}`, 5)
    const r = await runHooks(cfg, 'Stop', {})
    expect(r.ran).toBe(2)
    expect((await Bun.file(f).text()).trim().split('\n')).toEqual(['pronto', 'tarde'])
  })
})
