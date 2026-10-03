// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Doe}from"/$bunfs/root/chunk-hbjpbz2q.js";import{YBt}from"/$bunfs/root/chunk-4hjp8tw4.js";var s=new Set(["interrupt","stop_task","send_task_message","set_permission_mode","set_model","set_max_thinking_tokens","set_color","mcp_toggle","message_rated","side_question","ui_press","ui_input","ui_select","ui_client_press","ui_pane_show","ui_close","ui_scroll","ui_prompt_edit"]),o=new Set(["can_use_tool","request_user_dialog","elicitation"]),r=new Set(["set_model","set_permission_mode","set_max_thinking_tokens"]);function G6t(e){return n(e.request)&&!r.has(e.request.subtype)}function _ao(){Doe(!0)}function fur(e,t){switch(e.type){case"user":return!(t?.hostOwnsOrigin===!0&&YBt(e.origin,e.isSynthetic));case"bash_command":return!0;case"control_request":return n(e.request);default:return!1}}function n(e){let t=e?.subtype;return typeof t==="string"&&s.has(t)&&e?.by!=="app"}function cHe(e){return o.has(e.request.subtype)}
export{G6t,_ao,fur,cHe};
