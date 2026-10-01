// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{al}from"/$bunfs/root/chunk-swk3rjnt.js";function u0(t){return(t.type==="user"||t.type==="assistant")&&t.isVirtual===!0}function zte(t){return t.type==="assistant"&&t.isApiErrorMessage===!0&&t.message?.model===al}function tJ(t){return t.type==="system"&&t.subtype==="local_command"}function N_(t){if(t.type==="api_system")return!1;return t.type==="progress"||t.type==="system"&&!tJ(t)||u0(t)||zte(t)||t.type==="attachment"&&(t.attachment?.type==="thinking_drop"||t.attachment?.type==="credential_org"||t.attachment?.type==="prompt_snapshot"||t.attachment?.type==="prompt_render_point"||t.attachment?.type==="deferred_tools_record")}
export{u0,zte,tJ,N_};
