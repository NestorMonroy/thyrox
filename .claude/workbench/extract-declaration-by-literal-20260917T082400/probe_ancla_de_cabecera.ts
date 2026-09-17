/** El prefijo de cabecera vive en un TemplateHead: ¿lo alcanza el extractor? */
import { extractByLiteral, findLiteralSites } from '../../../src/packages/binary/src/declaration.ts'
import { readFileSync } from 'node:fs'
const src = readFileSync('_references/claude-code-bin/2.1.274/bunfs-root/chunk-ayyj05ne.js', 'utf8')
const ANCLA = 'anthropic-ratelimit-unified-'
console.log('por texto:', src.split(ANCLA).length - 1)
console.log('sitios:', findLiteralSites(src, ANCLA).length)
console.log('declaraciones:', extractByLiteral(src, ANCLA).length)
