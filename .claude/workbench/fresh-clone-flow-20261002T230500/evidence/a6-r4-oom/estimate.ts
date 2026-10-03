import { estimateServingMemoryFromShape } from '/home/user/thyrox/src/packages/model-artifacts/memoryEstimate.ts'
const attention = { blockCount: 36, kvHeadCount: 8, headDimension: 128 }
for (const c of [24663, 32768, 40960]) {
  const e = estimateServingMemoryFromShape({ ggufBytes: 2_497_281_120, attention, contextLength: c, kvCacheType: 'f16' } as any)
  console.log(c, JSON.stringify(e, (k, v) => typeof v === 'number' ? Math.round(v / 1048576) + 'MiB' : v))
}
