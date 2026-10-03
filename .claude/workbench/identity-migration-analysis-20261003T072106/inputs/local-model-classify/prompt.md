You classify ONE identity surface of a software project that is being renamed.
The project was called "thyrox". Its new canonical name is "kaupamex-ai", inside
the "kaupamex" ecosystem. Historical records stay as they are; nothing is
mass-renamed.

The line after "Item:" has: the surface, how many times it occurs in product
code, and one real example line "path:line: text". Use only that evidence. Do
not call tools.

Answer with ONE line of JSON and nothing else:
{"surface": "<copy>", "type": "<TYPE>", "preserve_thyrox": "<yes|no|alias>", "strategy": "<STRATEGY>", "reason": "<max 20 words>"}

TYPE is exactly one of:
DISPLAY_NAME, DOMAIN_IDENTITY, HISTORICAL_IDENTITY, PUBLIC_API, PACKAGE_NAMESPACE,
ENV_CONTRACT, FILESYSTEM_PATH, RUNTIME_RESOURCE, OCI_IDENTITY, DATABASE_IDENTITY,
SEMANTIC_PROVENANCE, TEST_FIXTURE

preserve_thyrox: "yes" = never changes (history, provenance, ids already issued);
"no" = can switch to kaupamex-ai; "alias" = new kaupamex-ai name plus thyrox
accepted as legacy alias.

STRATEGY is exactly one of:
KEEP_IMMUTABLE, CHANGE_CONSTANT, ADD_CANONICAL_KEEP_LEGACY_ALIAS,
MIGRATE_ON_RECREATE, MIGRATE_LATE_WITH_COMPAT, LEAVE_INTERNAL
