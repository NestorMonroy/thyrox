// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Lk,cP}from"/$bunfs/root/chunk-zwm3fybx.js";import{ts}from"/$bunfs/root/chunk-e8ycfccz.js";import{ea}from"/$bunfs/root/chunk-h56wjcte.js";import{VT,ye}from"/$bunfs/root/chunk-verj0kzw.js";import{cze,Oao,Ugr,Xv,wY,dp,zy}from"/$bunfs/root/chunk-c9jscxk0.js";import{af,bT,mp}from"/$bunfs/root/chunk-1xjxfex5.js";import{LTr,BPt}from"/$bunfs/root/chunk-n8qypqam.js";var a=Ugr.filter((e)=>e!=="userSettings");function URe(e){if(LTr())return!1;if(BPt())return!0;return(e??uyn()).length>0}function uyn(e=pyn()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${ea()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(bT())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&mp(s)&&!u(t,s.url);if(s.source==="settings")return mp(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!af(`${n.name}@${t}`));return!1})}function u(e,r){let o=ts();if(a.some((t)=>o.includes(t)&&Object.hasOwn(ye(t)?.extraKnownMarketplaces??{},e)))return!0;return Oao({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(Xv(),e)}function i(e){if(cP()||zy())return!1;let{servers:r}=dp(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&cze(o)==="rejected")&&wY(o,t))}function pyn(){if(Lk())return[];let e=ts(),r=e.includes("localSettings")?ye("localSettings"):null,o=[];if(e.includes("projectSettings")&&!VT()&&c(ye("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{URe,uyn,pyn};
