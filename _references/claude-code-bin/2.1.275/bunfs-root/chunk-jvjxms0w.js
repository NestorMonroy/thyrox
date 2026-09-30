// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{a0t,l0t}from"/$bunfs/root/chunk-6dwc0tzs.js";var l=/^[CDG][A-Z0-9]{6,}$/;function v$n(e){let n=e.replace(/^#/,"");return l.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var t=new Set(["slack_send_message","slack_post_message"]),E$n="mcp-slack-send";function o0t(e){return t.has(e)}function kAr(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=a0t(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:v$n(n)}}function s0t(){return{uiTableKey:E$n,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?l0t(e,n):""}}}
export{v$n,E$n,o0t,kAr,s0t};
