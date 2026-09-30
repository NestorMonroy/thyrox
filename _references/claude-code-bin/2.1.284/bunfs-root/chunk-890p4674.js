// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{P3r,I3r}from"/$bunfs/root/chunk-d37h8mav.js";import{c,ue}from"/$bunfs/root/chunk-czwr6846.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{oJn}from"/$bunfs/root/chunk-kaskbbn0.js";function n(){let e=I3r(),o=e===void 0?oJn():void 0,[r,s]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:c(s),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=P3r();if(o.has(e))return!1;return o.add(e),!0}function e7t(e,o){if(e===0||!t("tools_added"))return;i("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:c(o)})}function vuo(e){if(!t("bridge_connected"))return;i("tengu_chrome_bridge_connected",{...n(),bridgeStatus:ue(e)})}function Euo(){if(!t("extension_connected"))return;i("tengu_chrome_extension_connected",n())}function kuo(e){i("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{e7t,vuo,Euo,kuo};
