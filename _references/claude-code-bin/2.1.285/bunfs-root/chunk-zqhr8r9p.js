// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ET,uE}from"/$bunfs/root/chunk-bxhyh54r.js";import{as}from"/$bunfs/root/chunk-xzfbbx57.js";import{Na}from"/$bunfs/root/chunk-5054mktj.js";import{rE,ge}from"/$bunfs/root/chunk-g6a51st9.js";import{GVe,ISo,PTr,NE,RB,Eu,Lh}from"/$bunfs/root/chunk-qazw855w.js";import{ef,hA,Cu}from"/$bunfs/root/chunk-7jjx4s6h.js";import{e0r,$0t}from"/$bunfs/root/chunk-w57cgxw3.js";var a=PTr.filter((e)=>e!=="userSettings");function GOe(e){if(e0r())return!1;if($0t())return!0;return(e??OZe()).length>0}function OZe(e=PCn()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${Na()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(hA())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Cu(s)&&!u(t,s.url);if(s.source==="settings")return Cu(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!ef(`${n.name}@${t}`));return!1})}function u(e,r){let o=as();if(a.some((t)=>o.includes(t)&&Object.hasOwn(ge(t)?.extraKnownMarketplaces??{},e)))return!0;return ISo({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(NE(),e)}function i(e){if(uE()||Lh())return!1;let{servers:r}=Eu(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&GVe(o)==="rejected")&&RB(o,t))}function PCn(){if(ET())return[];let e=as(),r=e.includes("localSettings")?ge("localSettings"):null,o=[];if(e.includes("projectSettings")&&!rE()&&c(ge("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{GOe,OZe,PCn};
