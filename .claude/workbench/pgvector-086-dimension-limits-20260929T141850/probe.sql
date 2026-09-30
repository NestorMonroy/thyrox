-- Límites de dimensión de pgvector 0.8.6 por tipo e índice, en una base desechable.
-- Cada caso imprime una línea «caso|resultado»; un error se captura y se imprime, no aborta.
\set ON_ERROR_STOP off
CREATE EXTENSION vector;
SELECT 'extversion|' || extversion FROM pg_extension WHERE extname = 'vector';

CREATE FUNCTION probe(label text, ddl text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE ddl;
  RETURN label || '|ok';
EXCEPTION WHEN OTHERS THEN
  RETURN label || '|error: ' || SQLERRM;
END $$;

CREATE TABLE t_vec2000 (e vector(2000));   CREATE TABLE t_vec2001 (e vector(2001));
CREATE TABLE t_half4000 (e halfvec(4000)); CREATE TABLE t_half4001 (e halfvec(4001));
CREATE TABLE t_bit64000 (e bit(64000));    CREATE TABLE t_bit64001 (e bit(64001));
CREATE TABLE t_src (e vector(3072));

SELECT probe('hnsw vector(2000)',   'CREATE INDEX ON t_vec2000 USING hnsw (e vector_l2_ops)');
SELECT probe('hnsw vector(2001)',   'CREATE INDEX ON t_vec2001 USING hnsw (e vector_l2_ops)');
SELECT probe('hnsw halfvec(4000)',  'CREATE INDEX ON t_half4000 USING hnsw (e halfvec_l2_ops)');
SELECT probe('hnsw halfvec(4001)',  'CREATE INDEX ON t_half4001 USING hnsw (e halfvec_l2_ops)');
SELECT probe('hnsw bit(64000)',     'CREATE INDEX ON t_bit64000 USING hnsw (e bit_hamming_ops)');
SELECT probe('hnsw bit(64001)',     'CREATE INDEX ON t_bit64001 USING hnsw (e bit_hamming_ops)');
SELECT probe('ivfflat bit(64000)',  'CREATE INDEX ON t_bit64000 USING ivfflat (e bit_hamming_ops) WITH (lists = 1)');
SELECT probe('ivfflat bit(64001)',  'CREATE INDEX ON t_bit64001 USING ivfflat (e bit_hamming_ops) WITH (lists = 1)');
SELECT probe('hnsw vector(3072) directo', 'CREATE INDEX ON t_src USING hnsw (e vector_l2_ops)');
SELECT probe('hnsw binary_quantize(vector(3072))::bit(3072)',
             'CREATE INDEX ON t_src USING hnsw ((binary_quantize(e)::bit(3072)) bit_hamming_ops)');
SELECT probe('hnsw halfvec(3072) por expresion',
             'CREATE INDEX ON t_src USING hnsw ((e::halfvec(3072)) halfvec_l2_ops)');
