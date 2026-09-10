// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{p$n,m$n}from"/$bunfs/root/chunk-annedm50.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{u,He}from"/$bunfs/root/chunk-2y9gqtpa.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{LYt}from"/$bunfs/root/chunk-d5174152.js";function n(){let e=m$n(),o=e===void 0?LYt():void 0,[r,s]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:u(s),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=p$n();if(o.has(e))return!1;return o.add(e),!0}function Qct(e,o){if(e===0||!t("tools_added"))return;i("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:u(o)})}function bjn(e){if(!t("bridge_connected"))return;i("tengu_chrome_bridge_connected",{...n(),bridgeStatus:He(e)})}function Sjn(){if(!t("extension_connected"))return;i("tengu_chrome_extension_connected",n())}function Hjn(e){i("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{Qct,bjn,Sjn,Hjn};
