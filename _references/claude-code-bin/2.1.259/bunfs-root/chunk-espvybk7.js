// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{P$}from"/$bunfs/root/chunk-enjww0fp.js";import{b,Pl}from"/$bunfs/root/chunk-fzpv8ev5.js";var i=/[\x7f-\x9f]/g,s=(e)=>e.replace(i,(n)=>`\\u${n.charCodeAt(0).toString(16).padStart(4,"0")}`),c=/[\x00-\x1f\x7f-\x9f]/g;function F$t(e){return e.replace(c,"")}function B$t(e,{verbose:n}){if(Object.keys(e).length===0)return"";let r=P$(e);if(r!==null)return r;return Object.entries(e).map(([t,o])=>{let l=s(b(o));return`${s(Pl(t).slice(1,-1))}: ${l}`}).join(", ")}var a=/^[CDG][A-Z0-9]{6,}$/;function _on(e){let n=e.replace(/^#/,"");return a.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var u=new Set(["slack_send_message","slack_post_message"]),bon="mcp-slack-send";function lct(e){return u.has(e)}function U2n(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=F$t(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:_on(n)}}function cct(){return{uiTableKey:bon,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?B$t(e,n):""}}}
export{F$t,B$t,_on,bon,lct,U2n,cct};
