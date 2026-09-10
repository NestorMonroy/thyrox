// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{oL}from"/$bunfs/root/chunk-7pzst5bj.js";import{S,Tc}from"/$bunfs/root/chunk-fy3j7rz0.js";var i=/[\x7f-\x9f]/g,s=(e)=>e.replace(i,(n)=>`\\u${n.charCodeAt(0).toString(16).padStart(4,"0")}`),c=/[\x00-\x1f\x7f-\x9f]/g;function rNt(e){return e.replace(c,"")}function oNt(e,{verbose:n}){if(Object.keys(e).length===0)return"";let r=oL(e);if(r!==null)return r;return Object.entries(e).map(([t,o])=>{let l=s(S(o));return`${s(Tc(t).slice(1,-1))}: ${l}`}).join(", ")}var a=/^[CDG][A-Z0-9]{6,}$/;function $in(e){let n=e.replace(/^#/,"");return a.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var u=new Set(["slack_send_message","slack_post_message"]),Nin="mcp-slack-send";function Idt(e){return u.has(e)}function VGn(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=rNt(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:$in(n)}}function Pdt(){return{uiTableKey:Nin,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?oNt(e,n):""}}}
export{rNt,oNt,$in,Nin,Idt,VGn,Pdt};
