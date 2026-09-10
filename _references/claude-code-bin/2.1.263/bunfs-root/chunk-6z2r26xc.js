// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{XD}from"/$bunfs/root/chunk-eqgyf4er.js";import{S,Sc}from"/$bunfs/root/chunk-mh9y4c2z.js";var i=/[\x7f-\x9f]/g,s=(e)=>e.replace(i,(n)=>`\\u${n.charCodeAt(0).toString(16).padStart(4,"0")}`),c=/[\x00-\x1f\x7f-\x9f]/g;function r$t(e){return e.replace(c,"")}function o$t(e,{verbose:n}){if(Object.keys(e).length===0)return"";let r=XD(e);if(r!==null)return r;return Object.entries(e).map(([t,o])=>{let l=s(S(o));return`${s(Sc(t).slice(1,-1))}: ${l}`}).join(", ")}var a=/^[CDG][A-Z0-9]{6,}$/;function orn(e){let n=e.replace(/^#/,"");return a.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var u=new Set(["slack_send_message","slack_post_message"]),srn="mcp-slack-send";function oct(e){return u.has(e)}function mjn(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=r$t(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:orn(n)}}function sct(){return{uiTableKey:srn,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?o$t(e,n):""}}}
export{r$t,o$t,orn,srn,oct,mjn,sct};
