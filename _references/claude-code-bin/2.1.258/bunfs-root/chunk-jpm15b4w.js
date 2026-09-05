// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{t0n,n0n}from"/$bunfs/root/chunk-b1z7jvb2.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{u,Re}from"/$bunfs/root/chunk-mrh5xd2h.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{J3t}from"/$bunfs/root/chunk-n6xww8f0.js";function n(){let e=n0n(),o=e===void 0?J3t():void 0,[r,i]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:u(i),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=t0n();if(o.has(e))return!1;return o.add(e),!0}function glt(e,o){if(e===0||!t("tools_added"))return;s("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:u(o)})}function M1n(e){if(!t("bridge_connected"))return;s("tengu_chrome_bridge_connected",{...n(),bridgeStatus:Re(e)})}function O1n(){if(!t("extension_connected"))return;s("tengu_chrome_extension_connected",n())}function N1n(e){s("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{glt,M1n,O1n,N1n};
