// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{tOn,nOn}from"/$bunfs/root/chunk-x1rrg5j2.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{u,Ce}from"/$bunfs/root/chunk-97tbrkcc.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{mXt}from"/$bunfs/root/chunk-0dkpd8qq.js";function n(){let e=nOn(),o=e===void 0?mXt():void 0,[r,i]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:u(i),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=tOn();if(o.has(e))return!1;return o.add(e),!0}function rut(e,o){if(e===0||!t("tools_added"))return;s("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:u(o)})}function J2n(e){if(!t("bridge_connected"))return;s("tengu_chrome_bridge_connected",{...n(),bridgeStatus:Ce(e)})}function Q2n(){if(!t("extension_connected"))return;s("tengu_chrome_extension_connected",n())}function Z2n(e){s("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{rut,J2n,Q2n,Z2n};
