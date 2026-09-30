18:## Installation
20:### Linux and Mac
36:### Windows
53:## Getting Started
83:## Storing
130:## Querying
161:#### Distances
181:#### Aggregates
195:## Indexing
206:## HNSW
215:CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
218:Note: Use `halfvec_l2_ops` for `halfvec` and `sparsevec_l2_ops` for `sparsevec` (and similar with the other distance functions)
223:CREATE INDEX ON items USING hnsw (embedding vector_ip_ops);
229:CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);
235:CREATE INDEX ON items USING hnsw (embedding vector_l1_ops);
241:CREATE INDEX ON items USING hnsw (embedding bit_hamming_ops);
247:CREATE INDEX ON items USING hnsw (embedding bit_jaccard_ops);
253:- `halfvec` - up to 4,000 dimensions
255:- `sparsevec` - up to 1,000 non-zero elements
257:### Index Options
265:CREATE INDEX ON items USING hnsw (embedding vector_l2_ops) WITH (m = 16, ef_construction = 64);
270:### Query Options
289:### Index Build Time
321:### Indexing Progress
334:## IVFFlat
349:CREATE INDEX ON items USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
352:Note: Use `halfvec_l2_ops` for `halfvec` (and similar with the other distance functions)
357:CREATE INDEX ON items USING ivfflat (embedding vector_ip_ops) WITH (lists = 100);
363:CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
369:CREATE INDEX ON items USING ivfflat (embedding bit_hamming_ops) WITH (lists = 100);
375:- `halfvec` - up to 4,000 dimensions
378:### Query Options
397:### Index Build Time
407:### Indexing Progress
424:## Filtering
447:CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
459:CREATE INDEX ON items USING hnsw (embedding vector_l2_ops) WHERE (category_id = 123);
468:## Multitenancy
478:## Iterative Index Scans
518:### Iterative Scan Options
