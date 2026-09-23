# Stable diagnostic identity and general batch verification

## Question

Can a proposal verifier distinguish a diagnostic moved by an edit from a new
diagnostic, and can the same verifier judge proposers other than the legacy
TS2305 provider repair?

## Observation

The previous key included line and column. Inserting text therefore reported an
unchanged diagnostic as new. The command also accepted only provider names, so
it could not consume the common proposal manifest required by the tsc-zero loop.

## Implementation

The analyzer now publishes a counted diagnostic identity made from file, code,
and message. `batch_verification` compares those counted identities and accepts
a JSONL proposal contract with a proposal id, proposer, target identities, and
touched files. New diagnostics are attributed only when a proposal uniquely
owns the touched file; shared ownership is reported as ambiguous rather than
inventing causality.

## Result

Four analyzer tests and eighteen batch-verification assertions pass. The red
observations preserve the failures for coordinate movement and the missing
JSONL reader; the green output exercises both repaired contracts.

*Metric:* stable diagnostic multisets and proposal verdicts.
*Blind to:* semantic equivalence when TypeScript changes the diagnostic message;
shared-file causality is deliberately left ambiguous and requires bisection.
