// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
function bG(n){if(n?.kind!=="task-notification")return n;return{kind:"task-notification",...n.subkind!==void 0&&{subkind:n.subkind},...n.fireReason!==void 0&&{fireReason:n.fireReason},...n.producer!==void 0&&{producer:n.producer}}}function G9(n,e){return bG(n)??(e==="task-notification"?{kind:"task-notification"}:void 0)}function Zrn(n){return n?.kind==="task-notification"&&n.producer==="session-task"}function eon(n){return n?.kind==="task-notification"&&Object.keys(n).every((e)=>e==="kind"||e==="producer")}
export{bG,G9,Zrn,eon};
