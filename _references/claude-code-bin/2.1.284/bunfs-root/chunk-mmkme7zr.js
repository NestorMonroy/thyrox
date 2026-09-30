// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{yT,VA}from"/$bunfs/root/chunk-d37h8mav.js";import{fs}from"/$bunfs/root/chunk-m399t3d8.js";import{ca}from"/$bunfs/root/chunk-8whxj5sg.js";import{Qv,he}from"/$bunfs/root/chunk-r03mjfax.js";import{eqe,ASo,nAr,ME,uG,Au,x_}from"/$bunfs/root/chunk-77kn462z.js";import{af,uA,xu}from"/$bunfs/root/chunk-m2xq3y2f.js";import{fDr,lLt}from"/$bunfs/root/chunk-ydh20bsp.js";var a=nAr.filter((e)=>e!=="userSettings");function JOe(e){if(fDr())return!1;if(lLt())return!0;return(e??xZe()).length>0}function xZe(e=ICn()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${ca()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(uA())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&xu(s)&&!u(t,s.url);if(s.source==="settings")return xu(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!af(`${n.name}@${t}`));return!1})}function u(e,r){let o=fs();if(a.some((t)=>o.includes(t)&&Object.hasOwn(he(t)?.extraKnownMarketplaces??{},e)))return!0;return ASo({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(ME(),e)}function i(e){if(VA()||x_())return!1;let{servers:r}=Au(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&eqe(o)==="rejected")&&uG(o,t))}function ICn(){if(yT())return[];let e=fs(),r=e.includes("localSettings")?he("localSettings"):null,o=[];if(e.includes("projectSettings")&&!Qv()&&c(he("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{JOe,xZe,ICn};
