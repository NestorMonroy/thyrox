// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{AUn,TUn}from"/$bunfs/root/chunk-t8q7n4ta.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{u,ve}from"/$bunfs/root/chunk-vkfaczp9.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{SQt}from"/$bunfs/root/chunk-tmbmk9b2.js";function n(){let e=TUn(),o=e===void 0?SQt():void 0,[r,s]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:u(s),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=AUn();if(o.has(e))return!1;return o.add(e),!0}function Ppt(e,o){if(e===0||!t("tools_added"))return;i("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:u(o)})}function lqn(e){if(!t("bridge_connected"))return;i("tengu_chrome_bridge_connected",{...n(),bridgeStatus:ve(e)})}function cqn(){if(!t("extension_connected"))return;i("tengu_chrome_extension_connected",n())}function uqn(e){i("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{Ppt,lqn,cqn,uqn};
