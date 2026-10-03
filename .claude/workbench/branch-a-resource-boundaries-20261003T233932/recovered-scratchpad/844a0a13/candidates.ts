import { estimateServingMemoryFromShape } from '/home/user/thyrox/src/packages/model-artifacts/memoryEstimate.ts'
// Formas de atención y tamaños Q4_K_M declarados de memoria (fichas públicas), no leídos de un GGUF.
const candidates = [
  ['Qwen3-4B (actual) / Qwen3-4B-Instruct-2507', 2_497_280_256, 36, 8, 128],
  ['Qwen2.5-Coder-7B-Instruct', 4_683_073_536, 28, 4, 128],
  ['Qwen3-8B', 5_027_783_488, 36, 8, 128],
  ['Qwen2.5-Coder-3B-Instruct', 2_104_932_768, 36, 2, 128],
] as const
for (const [name, bytes, blockCount, kvHeadCount, headDimension] of candidates) {
  const row = [16384, 32768].map(c => {
    const e = estimateServingMemoryFromShape({ ggufBytes: bytes, attention: { blockCount, kvHeadCount, headDimension }, contextLength: c, kvCacheType: 'f16' } as never)
    return `ctx${c}=${Math.round(e.totalBytes / 1048576)}MiB`
  })
  console.log(name.padEnd(46), row.join('  '))
}
