// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{yk,VI}from"/$bunfs/root/chunk-cqc88nqm.js";import{us}from"/$bunfs/root/chunk-3hxvvnfw.js";import{sa}from"/$bunfs/root/chunk-ay603yys.js";import{DI,ye}from"/$bunfs/root/chunk-pw35yar9.js";import{Rje,Gto,Odr,Dv,x6,Ju,Ch}from"/$bunfs/root/chunk-4n4g22z6.js";import{Jp,eT,np}from"/$bunfs/root/chunk-s55tc6b5.js";import{Owr,Uxt}from"/$bunfs/root/chunk-015gmret.js";var a=Odr.filter((e)=>e!=="userSettings");function lCe(e){if(Owr())return!1;if(Uxt())return!0;return(e??Ufn()).length>0}function Ufn(e=Bfn()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${sa()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(eT())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&np(s)&&!u(t,s.url);if(s.source==="settings")return np(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!Jp(`${n.name}@${t}`));return!1})}function u(e,r){let o=us();if(a.some((t)=>o.includes(t)&&Object.hasOwn(ye(t)?.extraKnownMarketplaces??{},e)))return!0;return Gto({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(Dv(),e)}function i(e){if(VI()||Ch())return!1;let{servers:r}=Ju(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&Rje(o)==="rejected")&&x6(o,t))}function Bfn(){if(yk())return[];let e=us(),r=e.includes("localSettings")?ye("localSettings"):null,o=[];if(e.includes("projectSettings")&&!DI()&&c(ye("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{lCe,Ufn,Bfn};
