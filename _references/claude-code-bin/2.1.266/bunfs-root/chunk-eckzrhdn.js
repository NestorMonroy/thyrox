// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{dR,pR}from"/$bunfs/root/chunk-t8q7n4ta.js";import{ms}from"/$bunfs/root/chunk-hfjb09vk.js";import{Fi}from"/$bunfs/root/chunk-9fmxymtw.js";import{vE,_e}from"/$bunfs/root/chunk-kcxa79n8.js";import{Fke,HQn,gbn,Fw,iz,cd,_m}from"/$bunfs/root/chunk-yw4jc948.js";import{wCn,pZe}from"/$bunfs/root/chunk-dnemf2n9.js";import{Rd,AS,$c}from"/$bunfs/root/chunk-pg7f51gn.js";var a=gbn.filter((e)=>e!=="userSettings");function cce(e){if(wCn())return!1;if(pZe())return!0;return(e??fMt()).length>0}function fMt(e=mMt()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${Fi()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(AS())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&$c(s)&&!u(t,s.url);if(s.source==="settings")return $c(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!Rd(`${n.name}@${t}`));return!1})}function u(e,r){let o=ms();if(a.some((t)=>o.includes(t)&&Object.hasOwn(_e(t)?.extraKnownMarketplaces??{},e)))return!0;return HQn({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(Fw(),e)}function i(e){if(pR()||_m())return!1;let{servers:r}=cd(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&Fke(o)==="rejected")&&iz(o,t))}function mMt(){if(dR())return[];let e=ms(),r=e.includes("localSettings")?_e("localSettings"):null,o=[];if(e.includes("projectSettings")&&!vE()&&c(_e("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{cce,fMt,mMt};
