// Verifica, con los mecanismos de local-models (fetchSourceSpec,
// isVerifiedOnDisk), que el GGUF local es exactamente el archivo que la
// revisión fijada del catálogo publica: si coincide, la revisión basta para
// restaurarlo. No borra nada; deja el veredicto en JSON.
import { readFileSync, writeFileSync } from 'node:fs'

import { fetchSourceSpec, isVerifiedOnDisk } from '@thyrox/local-models/huggingFaceSource.ts'

const [entryPath, localPath, fileName, outPath] = process.argv.slice(2)
const entry = JSON.parse(readFileSync(entryPath, 'utf8'))
const spec = await fetchSourceSpec(url => fetch(url), entry.repository, entry.revision)
const file = spec.files.find(candidate => candidate.path === fileName)
const verdict = {
  repository: entry.repository,
  revision: entry.revision,
  fileName,
  catalogSha256: entry.artifact.sha256,
  catalogBytes: entry.artifact.bytes,
  publishedDigest: file?.digest ?? null,
  publishedBytes: file?.sizeBytes ?? null,
  publishedMatchesCatalog: file?.digest === `sha256:${entry.artifact.sha256}` && file?.sizeBytes === entry.artifact.bytes,
  localVerifiedAgainstPublished: file === undefined ? false : await isVerifiedOnDisk(localPath, file),
  license: spec.license ?? null,
  measuredAt: new Date().toISOString(),
}
writeFileSync(outPath, `${JSON.stringify(verdict, null, 2)}\n`)
console.log(JSON.stringify({ publishedMatchesCatalog: verdict.publishedMatchesCatalog, localVerifiedAgainstPublished: verdict.localVerifiedAgainstPublished }))
