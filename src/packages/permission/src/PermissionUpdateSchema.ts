/**
 * Los esquemas de una actualización de permiso: su destino y sus seis formas.
 *
 * Procedencia: `ccnmt: packages/permission/src/PermissionUpdateSchema.ts`
 * (61 líneas, 4 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * Es la contraparte de validación de `./PermissionUpdate.ts`, que ya porta la
 * mutación en memoria: aquél decide el nuevo estado, éste decide qué cargas
 * tienen derecho a llegar hasta él. Sin este archivo, `applyPermissionUpdate`
 * confiaba en que el tipo de TypeScript describiera lo que entra por el borde
 * —y en un borde de proceso el tipo no vale nada, porque se borra al compilar.
 *
 * La unión es DISCRIMINADA por `type` y no una `z.union` corriente. La
 * diferencia no es de estilo: con una unión sin discriminador, una carga que
 * mezcla campos de dos formas se valida por la primera rama que encaje, y el
 * error que devuelve nombra la rama equivocada. Con discriminador, `type`
 * elige la rama antes de mirar nada más.
 *
 * DIVERGENCIA DECLARADA: los tipos vienen de `./permissionTypes.js` y no de
 * `./types/permissions.js` — este árbol los concentra en un módulo y aquél los
 * reparte en un subdirectorio. Mismos nombres, mismo contenido.
 */
import { z } from 'zod/v4'
import type {
  PermissionUpdate,
  PermissionUpdateDestination,
} from './permissionTypes.js'
import { lazySchema } from '../internal/lazySchema.js'
import { externalPermissionModeSchema } from './PermissionMode.js'
import {
  permissionBehaviorSchema,
  permissionRuleValueSchema,
} from './PermissionRule.js'

export type { PermissionUpdate, PermissionUpdateDestination }

/**
 * Los cinco destinos declarados.
 *
 * Tres tienen un archivo de settings detrás y dos no —`session` y `cliArg`
 * viven sólo mientras dure el proceso—, distinción que `supportsPersistence`
 * de `./PermissionUpdate.ts` consume. Aquí no se separan: el esquema decide si
 * el destino EXISTE, no si es persistible.
 */
export const permissionUpdateDestinationSchema = lazySchema(() =>
  z.enum([
    'userSettings',
    'projectSettings',
    'localSettings',
    'session',
    'cliArg',
  ]),
)

export const permissionUpdateSchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('addRules'),
      rules: z.array(permissionRuleValueSchema()),
      behavior: permissionBehaviorSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    z.object({
      type: z.literal('replaceRules'),
      rules: z.array(permissionRuleValueSchema()),
      behavior: permissionBehaviorSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    z.object({
      type: z.literal('removeRules'),
      rules: z.array(permissionRuleValueSchema()),
      behavior: permissionBehaviorSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    z.object({
      type: z.literal('setMode'),
      mode: externalPermissionModeSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    z.object({
      type: z.literal('addDirectories'),
      directories: z.array(z.string()),
      destination: permissionUpdateDestinationSchema(),
    }),
    z.object({
      type: z.literal('removeDirectories'),
      directories: z.array(z.string()),
      destination: permissionUpdateDestinationSchema(),
    }),
  ]),
)
