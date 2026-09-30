// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{ZP,Q0}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Bo}from"/$bunfs/root/chunk-q8sknw7e.js";import{Ia}from"/$bunfs/root/chunk-crr3rzxx.js";import{LT,ge}from"/$bunfs/root/chunk-v49f6nqy.js";import{mDe,O1r,D6n,wE,r4,nd,Tg}from"/$bunfs/root/chunk-q2gh92k2.js";import{o7n,Vht}from"/$bunfs/root/chunk-9apg35nm.js";import{kp,AE,sd}from"/$bunfs/root/chunk-jrnkvm0a.js";var a=D6n.filter((e)=>e!=="userSettings");function gbe(e){if(o7n())return!1;if(Vht())return!0;return(e??wYt()).length>0}function wYt(e=vYt()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${Ia()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(AE())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&sd(s)&&!u(t,s.url);if(s.source==="settings")return sd(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!kp(`${n.name}@${t}`));return!1})}function u(e,r){let o=Bo();if(a.some((t)=>o.includes(t)&&Object.hasOwn(ge(t)?.extraKnownMarketplaces??{},e)))return!0;return O1r({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(wE(),e)}function i(e){if(Q0()||Tg())return!1;let{servers:r}=nd(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&mDe(o)==="rejected")&&r4(o,t))}function vYt(){if(ZP())return[];let e=Bo(),r=e.includes("localSettings")?ge("localSettings"):null,o=[];if(e.includes("projectSettings")&&!LT()&&c(ge("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{gbe,wYt,vYt};
