// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Tee}from"/$bunfs/root/chunk-cqc88nqm.js";import{FHt}from"/$bunfs/root/chunk-5khn4tvf.js";var t=new Set(["interrupt","stop_task","set_permission_mode","set_model","set_max_thinking_tokens","set_color","mcp_toggle","message_rated","side_question"]),n=new Set(["can_use_tool","request_user_dialog","elicitation"]),o=new Set(["set_model","set_permission_mode","set_max_thinking_tokens"]);function kjt(e){return t.has(e.request.subtype)&&!o.has(e.request.subtype)}function Gzr(){Tee(!0)}function r9n(e,s){switch(e.type){case"user":return!(s?.hostOwnsOrigin===!0&&FHt(e.origin,e.isSynthetic));case"bash_command":return!0;case"control_request":return t.has(e.request?.subtype);default:return!1}}function lRe(e){return n.has(e.request.subtype)}
export{kjt,Gzr,r9n,lRe};
