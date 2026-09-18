// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{RP,C0}from"/$bunfs/root/chunk-ja309z9r.js";import{Uo}from"/$bunfs/root/chunk-q77993h4.js";import{Aa}from"/$bunfs/root/chunk-j96jysac.js";import{cT,me}from"/$bunfs/root/chunk-m0am9fba.js";import{wOe,tDr,Kqn,hk,CK,md,mg}from"/$bunfs/root/chunk-ayyj05ne.js";import{u8n,Pmt}from"/$bunfs/root/chunk-hfkkcqwq.js";import{hp,Yv,Ku}from"/$bunfs/root/chunk-z432q6s1.js";var a=Kqn.filter((e)=>e!=="userSettings");function Wye(e){if(u8n())return!1;if(Pmt())return!0;return(e??N3t()).length>0}function N3t(e=$3t()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${Aa()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(Yv())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Ku(s)&&!u(t,s.url);if(s.source==="settings")return Ku(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!hp(`${n.name}@${t}`));return!1})}function u(e,r){let o=Uo();if(a.some((t)=>o.includes(t)&&Object.hasOwn(me(t)?.extraKnownMarketplaces??{},e)))return!0;return tDr({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(hk(),e)}function i(e){if(C0()||mg())return!1;let{servers:r}=md(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&wOe(o)==="rejected")&&CK(o,t))}function $3t(){if(RP())return[];let e=Uo(),r=e.includes("localSettings")?me("localSettings"):null,o=[];if(e.includes("projectSettings")&&!cT()&&c(me("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{Wye,N3t,$3t};
