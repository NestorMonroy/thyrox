# Sensitive data at rest in thyrox SQLite stores

## How the reference client does it (`bin/binary`, corpus `_references/claude-code-bin/2.1.286/bunfs-root`, 2124 chunks)

- **Sealing, not plaintext.** `chunk-03237y1v.js` `fe` opens a sealed entry: versioned prefix,
  header digest bound to the cache key, IV + AES-256-GCM + 16-byte tag, base64url, with AAD.
  A missing prefix, short body, wrong header or bad tag is a refusal (`reason`), never a read.
- **Fail closed without a key.** `Ze`: when the sealing key is unavailable ("secure storage
  unreadable") the cache is turned off for the process — it does not fall back to plaintext.
- **The key lives in secure storage.** `chunk-xz5ks3wt.js` `ne`: macOS keychain through
  `security find-generic-password` / `add-generic-password` (hex payload, write lock).
- **Masking is an allowlist.** `chunk-1xnhnvr6.js` `ZZ`: only allowlisted header names whose
  value passes a check are kept; everything else becomes `[REDACTED]`.
- Literals with 0 hits: `bun:sqlite`, `safeStorage`, `createCipheriv` (the cipher is called by a
  minified name). Full outputs: `binary-literals*.txt`, `symbol-*.txt`.

## What thyrox has

- `provider/src/accounts/fieldCipher.ts` already seals credentials at rest: AES-256-GCM,
  `enc:v1:<iv>:<ciphertext>:<tag>`, key from `THYROX_STORAGE_ENCRYPTION_KEY` (declared: present).
- Gap versus the reference: **without a key it stored credentials in plain text** (one warning).
- Stores measured (counts only, no values; `credential_cell_census.ts`, `sqlite_value_scan.ts`
  over `provider/sanitize/credentialPatterns`):

| Store | Text cells | Credential-shaped matches |
|---|---|---|
| agent-results/agent_store.sqlite3 | 132 501 | 0 |
| .claude/agent-results/agent_store.sqlite3 | 28 | 0 |
| /root/.claude/providers/connections.sqlite3 | 2 (0 connection rows) | 0 |

  Control: a synthetic store with one fake connection string and one fake `sk-ant-api03-` key is
  detected (connection_string, anthropic_alt, openai_compatible). Note: the `anthropic` pattern
  (`sk-ant-api[0-9]?-`) does not match the real `api03` form; `anthropic_alt` catches it.

## What changed

- `fieldCipher.encrypt` and `encryptConnectionFields` now refuse a non-empty, unsealed credential
  when no key is declared (`StorageKeyMissingError`), like the reference's fail-closed sealing.
  Reading legacy plaintext and already-sealed values is unchanged.
- Not changed here: free text in `agent_store` (findings) is not masked on write; the value scan
  found 0 credentials today. A write-time mask belongs to S2 (value-based exposure gate) and the
  sensitivity authority (S1), not to a second redactor.
