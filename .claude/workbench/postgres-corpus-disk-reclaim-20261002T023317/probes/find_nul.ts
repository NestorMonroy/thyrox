/** Localiza qué documento reconocido lleva U+0000 tras el análisis (sin base de datos). Uso: bun find_nul.ts <dominio> <raíz> */
import { recognizeDocuments } from '../../../../src/packages/semantic-search/findingIngestion'

const [domain, root] = process.argv.slice(2)
const { recognized } = recognizeDocuments(domain, root, { repository: 'probe', revision: '' } as never)
const hits = recognized.filter(({ document }) => JSON.stringify(document).includes('\\u0000'))
for (const { relativePath, document } of hits) {
  const where = JSON.stringify(document).split('\\u0000')[0].slice(-120)
  console.log(JSON.stringify({ relativePath, before: where }))
}
console.log(JSON.stringify({ recognized: recognized.length, withNul: hits.length }))
