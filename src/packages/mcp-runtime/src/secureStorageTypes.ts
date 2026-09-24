/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/secureStorageTypes.ts`
 * — sus 2 tipos, ninguno omitido. Sin imports en la fuente.
 *
 * Tipos canónicos para la superficie de almacenamiento seguro. Se
 * mantienen mínimos — la implementación real se eliminó durante la
 * decompilación (nota verbatim de la fuente).
 */
// `mcp-runtime` ya depende de `@thyrox/storage`: los tipos son los de su
// almacenamiento, no marcadores del decompilado.
export type {
  SecureStorage,
  SecureStorageData,
} from '@thyrox/storage/secureStorage/types.js'
