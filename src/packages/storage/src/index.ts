/**
 * Puerto fiel de `ccnmt: packages/storage/src/index.ts` (465 bytes fuente
 * — porte completo). Superficie pública del paquete: los tipos de
 * contrato, el backend de disco, los tres stores de alto nivel y la
 * familia de errores tipados.
 *
 * Los cuatro archivos que reexporta YA EXISTEN en este árbol con la misma
 * forma exacta (`contracts.ts`, `stores/{artifactStore,sessionMetadataStore,
 * transcriptStore}.ts`, `errors.ts` — ninguno mío, portados en un pase
 * anterior) más `backends/localFileBackend.ts` (mío, este mismo pase) —
 * ningún export de abajo es especulativo. Los otros 14 módulos de este
 * pase (`fileRead`, `fileEncoding`, `fsOperations`, `secureStorage/*`,
 * `browser`, `filePersistence/*`, `testing`) NO se exportan aquí porque la
 * fuente tampoco lo hace: se consumen por subpath
 * (`@thyrox/storage/fsOperations.js`, etc.), no por el barrel — igual que
 * ya hace este mismo `package.json` para `cache-paths`/`tempfile.js`/etc.
 * Cablear esos subpaths nuevos en `package.json` queda fuera de mi
 * alcance (no es uno de los 15 archivos de esta tarea); ver el reporte
 * final.
 */
export type {
  ArtifactStore,
  SessionMetadataStore,
  StorageBackend,
  StorageReadResult,
  StorageWriteData,
  TranscriptStore,
} from './contracts.js'
export { LocalFileStorageBackend } from './backends/localFileBackend.js'
export { BackendArtifactStore } from './stores/artifactStore.js'
export { FileSessionMetadataStore } from './stores/sessionMetadataStore.js'
export { FileTranscriptStore } from './stores/transcriptStore.js'
export * from './errors.js'
