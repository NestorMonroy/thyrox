// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
function d(e,i){let n=e.type==="attachment"?e.attachment:void 0;if(typeof n!=="object"||n===null||!("type"in n)||n.type!=="queued_command")return;let u=Reflect.get(n,i);return typeof u==="string"&&u?u:void 0}function t(e){return d(e,"source_uuid")}function L3t(e){let i=t(e);return i?[e.uuid,i]:[e.uuid]}
export{L3t};
