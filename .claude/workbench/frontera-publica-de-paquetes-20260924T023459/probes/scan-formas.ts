// Qué publica Bun.Transpiler.scan para cada forma de export y de import.
const t = new Bun.Transpiler({ loader: 'tsx' })
const code = `
export const a = 1
export function b() {}
export class C {}
export type T = number
export interface I { x: number }
export { d as e } from './x'
export * from './star'
export * as ns from './nsmod'
const f = 1; export { f }
export default 3
import { g, h as k } from './y'
import type { Z } from './z'
import def from './w'
import * as all from './v'
`
console.log(JSON.stringify(t.scan(code), null, 1))
