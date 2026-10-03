-- Instantánea determinista del corpus: conteos y una muestra fija de findings
-- (los 20 primeros por domain_id) con ids, hashes y md5 del texto de cada chunk.
-- La misma consulta corre por bun (corpus real) y por psql (anulación).
SET search_path TO semantic_search;
SELECT json_build_object(
  'counts', json_build_object(
    'documents', (SELECT count(*) FROM documents),
    'chunks', (SELECT count(*) FROM document_chunks),
    'embeddingSpaces', (SELECT count(*) FROM embedding_spaces)),
  'sample', (SELECT json_agg(s ORDER BY s.domain_id) FROM (
    SELECT d.domain_id, d.document_id, d.content_hash,
      (SELECT json_agg(json_build_object('chunkId', c.chunk_id, 'hash', c.content_hash, 'textMd5', md5(c.text)) ORDER BY c.position)
         FROM document_chunks c WHERE c.document_id = d.document_id AND c.version = d.version) AS chunks
    FROM documents d WHERE d.domain = 'finding' ORDER BY d.domain_id LIMIT 20) s)) AS snapshot;
