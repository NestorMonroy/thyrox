// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{JT,Xx}from"/$bunfs/root/chunk-x1rrg5j2.js";import{xi}from"/$bunfs/root/chunk-mzmfq60a.js";import{_s}from"/$bunfs/root/chunk-m92n5xra.js";import{pE,Se}from"/$bunfs/root/chunk-67nd7etf.js";import{LEe,m7n,lyn,Wv,B2,ff,fg}from"/$bunfs/root/chunk-qpwbvc04.js";import{Xd,fS,Td}from"/$bunfs/root/chunk-eza32dw3.js";import{MEn,n7e}from"/$bunfs/root/chunk-qyqph83r.js";var a=lyn.filter((e)=>e!=="userSettings");function ole(e){if(MEn())return!1;if(n7e())return!0;return(e??Vxt()).length>0}function Vxt(e=qxt()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${_s()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(fS())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Td(s)&&!u(t,s.url);if(s.source==="settings")return Td(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!Xd(`${n.name}@${t}`));return!1})}function u(e,r){let o=xi();if(a.some((t)=>o.includes(t)&&Object.hasOwn(Se(t)?.extraKnownMarketplaces??{},e)))return!0;return m7n({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(Wv(),e)}function i(e){if(Xx()||fg())return!1;let{servers:r}=ff(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&LEe(o)==="rejected")&&B2(o,t))}function qxt(){if(JT())return[];let e=xi(),r=e.includes("localSettings")?Se("localSettings"):null,o=[];if(e.includes("projectSettings")&&!pE()&&c(Se("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{ole,Vxt,qxt};
