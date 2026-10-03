// Resuelve la revisión exacta (sha) de un repositorio de Hugging Face y lista
// sus archivos con tamaño y digest, con `fetchSourceSpec` de local-models.
import { fetchSourceSpec } from '@thyrox/local-models/huggingFaceSource.ts'

const [repository, pattern] = process.argv.slice(2)
const head = await fetch(`https://huggingface.co/api/models/${repository}`).then(r => r.json()) as { sha: string }
const spec = await fetchSourceSpec(url => fetch(url), repository, head.sha)
const files = spec.files.filter(file => file.path.includes(pattern ?? ''))
console.log(JSON.stringify({ repository, revision: spec.revision, license: spec.license ?? null, files }, null, 2))
