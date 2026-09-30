// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{FX}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Wbt}from"/$bunfs/root/chunk-xbd48fav.js";var o=new Set(["interrupt","stop_task","set_permission_mode","set_model","set_max_thinking_tokens","set_color","mcp_toggle","message_rated","side_question"]),r=new Set(["can_use_tool","request_user_dialog","elicitation"]),i=new Set(["set_model","set_permission_mode","set_max_thinking_tokens"]);function GIt(e){return o.has(e.request.subtype)&&!i.has(e.request.subtype)}function kvr(){FX(!0)}function GDn(e,t){switch(e.type){case"user":return!(t?.hostOwnsOrigin===!0&&Wbt(e.origin,e.isSynthetic));case"bash_command":return!0;case"control_request":return o.has(e.request?.subtype);default:return!1}}function a0e(e){return r.has(e.request.subtype)}var a={refusal_fallback_prompt:"choose: retry on fallback model or edit prompt",auto_mode_outside_reads:"choose: keep allowing reads outside the working directories, or block them"};function WIt(e,t,s,n){return{tool_name:`dialog:${e}`,display_tool_name:"Claude needs your input",action_description:a[e]??`Respond to the ${e} dialog to continue`,raw_command:void 0,tool_use_id:n??"",request_id:s,input:{dialog_kind:e,payload:t}}}
export{WIt,GIt,kvr,GDn,a0e};
