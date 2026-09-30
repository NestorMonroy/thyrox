// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{wXt,vXt}from"/$bunfs/root/chunk-5c7bp7h8.js";var l=/^[CDG][A-Z0-9]{6,}$/;function dhr(e){let n=e.replace(/^#/,"");return l.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var t=new Set(["slack_send_message","slack_post_message"]),uhr="mcp-slack-send";function _Xt(e){return t.has(e)}function Ddo(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=wXt(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:dhr(n)}}function bXt(){return{uiTableKey:uhr,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?vXt(e,n):""}}}
export{dhr,uhr,_Xt,Ddo,bXt};
