// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
function u(e){let n=e.type==="attachment"?e.attachment:void 0;return typeof n==="object"&&n!==null&&"type"in n&&n.type==="queued_command"&&"source_uuid"in n&&typeof n.source_uuid==="string"&&n.source_uuid?n.source_uuid:void 0}function fjt(e){let n=u(e);return n?[e.uuid,n]:[e.uuid]}
export{fjt};
