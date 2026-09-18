// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{blr,Slr}from"/$bunfs/root/chunk-ja309z9r.js";import{c,ge}from"/$bunfs/root/chunk-64dkx51v.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{Mvn}from"/$bunfs/root/chunk-1nwhka6x.js";function n(){let e=Slr(),o=e===void 0?Mvn():void 0,[r,s]=e!==void 0?[Math.max(0,Date.now()-e),"session_switch"]:o!==void 0?[Math.max(0,Date.now()-o),"spawn_stamp"]:[Math.round(process.uptime()*1000),"process_start"];return{msSinceSessionStart:r,startAnchor:c(s),isRemoteSession:Boolean(a.CLAUDE_CODE_REMOTE_SESSION_ID)}}function t(e){let o=blr();if(o.has(e))return!1;return o.add(e),!0}function DPt(e,o){if(e===0||!t("tools_added"))return;i("tengu_chrome_tools_added",{...n(),toolCount:e,discoverySource:c(o)})}function CSr(e){if(!t("bridge_connected"))return;i("tengu_chrome_bridge_connected",{...n(),bridgeStatus:ge(e)})}function RSr(){if(!t("extension_connected"))return;i("tengu_chrome_extension_connected",n())}function xSr(e){i("tengu_chrome_tool_call_disconnected",{...n(),tokenAccountMismatch:e})}
export{DPt,CSr,RSr,xSr};
