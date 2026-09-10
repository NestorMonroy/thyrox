// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{UT,wx}from"/$bunfs/root/chunk-annedm50.js";import{ms}from"/$bunfs/root/chunk-tcap6yb8.js";import{Li}from"/$bunfs/root/chunk-a207t0vs.js";import{Ww,_e}from"/$bunfs/root/chunk-2e0agwm9.js";import{zwe,H6n,tgn,uv,Zj,ed,Jm}from"/$bunfs/root/chunk-vd630rs0.js";import{Jwn,PJe}from"/$bunfs/root/chunk-qsaz58sb.js";import{_d,Yb,Cc}from"/$bunfs/root/chunk-kme0t1a1.js";var a=tgn.filter((e)=>e!=="userSettings");function Cae(e){if(Jwn())return!1;if(PJe())return!0;return(e??dxt()).length>0}function dxt(e=fxt()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${Li()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(Yb())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Cc(s)&&!u(t,s.url);if(s.source==="settings")return Cc(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!_d(`${n.name}@${t}`));return!1})}function u(e,r){let o=ms();if(a.some((t)=>o.includes(t)&&Object.hasOwn(_e(t)?.extraKnownMarketplaces??{},e)))return!0;return H6n({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(uv(),e)}function i(e){if(wx()||Jm())return!1;let{servers:r}=ed(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&zwe(o)==="rejected")&&Zj(o,t))}function fxt(){if(UT())return[];let e=ms(),r=e.includes("localSettings")?_e("localSettings"):null,o=[];if(e.includes("projectSettings")&&!Ww()&&c(_e("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{Cae,dxt,fxt};
