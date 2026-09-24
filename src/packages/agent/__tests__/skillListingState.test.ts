/**
 * El estado del listado de skills de 2.1.275 (`xJn`, `VB`, `I1r`, `P1r`,
 * `M6n`, `O6n`, `eCs` en `chunk-q2gh92k2.js`): qué skills ya se anunciaron,
 * por agente, y las dos formas de no volver a anunciarlas.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import {
  forgetSentSkillNames,
  forgetSentSkillsForAgent,
  getSkillListingDelta,
  resetSentSkillNames,
  seedSentSkillNames,
  suppressNextSkillListing,
} from '../attachments.ts'

const skills = (...names: string[]) => names.map(name => ({ name }))
beforeEach(() => resetSentSkillNames())

describe('getSkillListingDelta', () => {
  test('la primera vez todo es nuevo e inicial; después sólo lo que falta', () => {
    expect(getSkillListingDelta(undefined, skills('a', 'b'))).toEqual({ newSkills: skills('a', 'b'), isInitial: true })
    expect(getSkillListingDelta(undefined, skills('a', 'b'))).toBeNull()
    expect(getSkillListingDelta(undefined, skills('a', 'b', 'c'))).toEqual({ newSkills: skills('c'), isInitial: false })
  })
  test('cada agente lleva su cuenta', () => {
    getSkillListingDelta(undefined, skills('a'))
    expect(getSkillListingDelta('agente', skills('a'))).toEqual({ newSkills: skills('a'), isInitial: true })
  })
  test('suppressNext marca todo como enviado una vez, sólo en el hilo principal', () => {
    suppressNextSkillListing()
    expect(getSkillListingDelta('agente', skills('a'))).not.toBeNull()
    expect(getSkillListingDelta(undefined, skills('a', 'b'))).toBeNull()
    expect(getSkillListingDelta(undefined, skills('a', 'b', 'c'))).toEqual({ newSkills: skills('c'), isInitial: false })
  })
  test('la semilla de reanudación cuenta sólo lo que sigue existiendo', () => {
    seedSentSkillNames(['a', 'viejo'])
    expect(getSkillListingDelta(undefined, skills('a', 'b'))).toEqual({ newSkills: skills('b'), isInitial: false })
  })
  test('olvidar reabre el anuncio', () => {
    getSkillListingDelta(undefined, skills('a', 'b'))
    forgetSentSkillNames(['a'])
    expect(getSkillListingDelta(undefined, skills('a', 'b'))).toEqual({ newSkills: skills('a'), isInitial: false })
    getSkillListingDelta('agente', skills('a'))
    forgetSentSkillsForAgent('agente')
    expect(getSkillListingDelta('agente', skills('a'))?.isInitial).toBe(true)
  })
  test('reset lo borra todo, supresión incluida', () => {
    getSkillListingDelta(undefined, skills('a'))
    suppressNextSkillListing()
    resetSentSkillNames()
    expect(getSkillListingDelta(undefined, skills('a'))?.isInitial).toBe(true)
  })
})
