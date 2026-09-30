// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{YBr,XBr}from"/$bunfs/root/chunk-zwm3fybx.js";import{c,pe}from"/$bunfs/root/chunk-zxcb8vnv.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Bqn}from"/$bunfs/root/chunk-0bg0s2rp.js";function n(){let e=XBr(),o=e===void 0?Bqn():void 0,[r,s]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:c(s),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=YBr();if(o.has(e))return!1;return o.add(e),!0}function _3t(e,o){if(e===0||!t("tools_added"))return;i("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:c(o)})}function dQr(e){if(!t("bridge_connected"))return;i("tengu_chrome_bridge_connected",{...n(),bridgeStatus:pe(e)})}function uQr(){if(!t("extension_connected"))return;i("tengu_chrome_extension_connected",n())}function pQr(e){i("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{_3t,dQr,uQr,pQr};
