// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{UGt,BGt}from"/$bunfs/root/chunk-xwkmjjf0.js";var l=/^[CDG][A-Z0-9]{6,}$/;function w7n(e){let n=e.replace(/^#/,"");return l.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var t=new Set(["slack_send_message","slack_post_message"]),v7n="mcp-slack-send";function NGt(e){return t.has(e)}function VKr(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=UGt(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:w7n(n)}}function $Gt(){return{uiTableKey:v7n,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?BGt(e,n):""}}}
export{w7n,v7n,NGt,VKr,$Gt};
