// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
function J1(e){if(e?.kind!=="task-notification")return e;return{kind:"task-notification",...e.subkind!==void 0&&{subkind:e.subkind},...e.fireReason!==void 0&&{fireReason:e.fireReason}}}function Cue(e,n){return J1(e)??(n==="task-notification"?{kind:"task-notification"}:void 0)}
export{J1,Cue};
