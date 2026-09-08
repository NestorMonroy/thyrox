/**
 * Los invariantes de `openai/client.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO. Aqui no es un complemento opcional: es el UNICO
 * eje que alcanza la rama del registro de conexiones. `resolveConnectionForModel`
 * lee la config global por `require`, envuelto en try/catch que devuelve vacio;
 * sin config no hay conexion que resolver, y la fuente no expone costura para
 * sembrar una. La suite de conducta lo declara y no lo intenta.
 *
 * Los cuatro invariantes de esa rama —cuando gana la conexion, de donde salen
 * su clave y su endpoint, y con que forma se cachea— quedan sin medir por
 * conducta. Pincharlos sobre la fuente es lo unico disponible.
 *
 * CONTROL DE ANULACION, medido: relajando la doble condicion de la conexion
 * (`protocol === 'openai' && auth.type === 'api_key'`) a solo el protocolo,
 * caen **1 de 6** aqui (el caso 1) y **0 de 14** en conducta.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fuente = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'openai',
    'client.ts',
  ),
  'utf-8',
)

describe('invariantes escritos en openai/client.ts', () => {
  test('1. la conexion gana solo si es de protocolo openai Y auth por clave', () => {
    // Las dos condiciones, no una: una conexion de otro protocolo, o de otro
    // tipo de auth, tiene que caer al respaldo por entorno.
    expect(fuente).toMatch(
      /conn\?\.protocol === 'openai' && conn\.auth\.type === 'api_key'/,
    )
  })

  test('2. con conexion, la clave y el endpoint salen de ELLA, no del entorno', () => {
    const cuerpo = fuente.slice(fuente.indexOf('const apiKey ='))
    expect(cuerpo).toMatch(/usingConn[\s\S]{0,120}conn\.auth\.key/)
    expect(cuerpo).toMatch(/usingConn \? conn\.endpoint : readEnv\('OPENAI_BASE_URL'\)/)
  })

  test('3. la clave de cache lleva el id de la conexion, o env como respaldo', () => {
    expect(fuente).toMatch(/`conn:\$\{conn\.id\}`\s*:\s*'env'/)
  })

  test('4. fetchOverride salta la cache en LECTURA y en ESCRITURA', () => {
    // Las dos mitades: no lee la cache y tampoco la puebla. Con solo una de
    // las dos, un cliente de prueba contaminaria el compartido.
    const lecturas = fuente.match(/if \(!options\?\.fetchOverride\) \{/g) ?? []
    expect(lecturas).toHaveLength(2)
  })

  test('5. la capa de red se pide declarando que NO es el API de Anthropic', () => {
    expect(fuente).toMatch(/getProxyFetchOptions\(\{ forAnthropicAPI: false \}\)/)
  })

  test('6. el cliente se construye con dangerouslyAllowBrowser', () => {
    expect(fuente).toMatch(/dangerouslyAllowBrowser: true/)
  })
})
