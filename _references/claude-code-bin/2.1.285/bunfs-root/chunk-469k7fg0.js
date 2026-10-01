// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{roe}from"/$bunfs/root/chunk-bxhyh54r.js";import{BFt}from"/$bunfs/root/chunk-f74xvn8g.js";var s=new Set(["interrupt","stop_task","set_permission_mode","set_model","set_max_thinking_tokens","set_color","mcp_toggle","message_rated","side_question","ui_press","ui_input","ui_select","ui_client_press","ui_pane_show","ui_close","ui_scroll","ui_prompt_edit"]),o=new Set(["can_use_tool","request_user_dialog","elicitation"]),r=new Set(["set_model","set_permission_mode","set_max_thinking_tokens"]);function R5t(e){return n(e.request)&&!r.has(e.request.subtype)}function mro(){roe(!0)}function alr(e,t){switch(e.type){case"user":return!(t?.hostOwnsOrigin===!0&&BFt(e.origin,e.isSynthetic));case"bash_command":return!0;case"control_request":return n(e.request);default:return!1}}function n(e){let t=e?.subtype;return typeof t==="string"&&s.has(t)&&e?.by!=="app"}function tHe(e){return o.has(e.request.subtype)}
export{R5t,mro,alr,tHe};
