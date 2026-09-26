// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{kte}from"/$bunfs/root/chunk-zwm3fybx.js";import{lMt}from"/$bunfs/root/chunk-wbbthbh9.js";var t=new Set(["interrupt","stop_task","set_permission_mode","set_model","set_max_thinking_tokens","set_color","mcp_toggle","message_rated","side_question"]),n=new Set(["can_use_tool","request_user_dialog","elicitation"]),o=new Set(["set_model","set_permission_mode","set_max_thinking_tokens"]);function _Gt(e){return t.has(e.request.subtype)&&!o.has(e.request.subtype)}function $5r(){kte(!0)}function iQn(e,s){switch(e.type){case"user":return!(s?.hostOwnsOrigin===!0&&lMt(e.origin,e.isSynthetic));case"bash_command":return!0;case"control_request":return t.has(e.request?.subtype);default:return!1}}function Mxe(e){return n.has(e.request.subtype)}
export{_Gt,$5r,iQn,Mxe};
