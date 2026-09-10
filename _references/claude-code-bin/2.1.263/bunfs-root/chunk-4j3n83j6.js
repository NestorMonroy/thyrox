// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{UT,Ex}from"/$bunfs/root/chunk-k6vqz9fa.js";import{ms}from"/$bunfs/root/chunk-v7vff0yy.js";import{Li}from"/$bunfs/root/chunk-bxegdt3f.js";import{Ww,_e}from"/$bunfs/root/chunk-xnx53tr1.js";import{Wwe,A6n,ngn,uv,t2,td,Jm}from"/$bunfs/root/chunk-9wa0ka8p.js";import{Qwn,$Je}from"/$bunfs/root/chunk-5kvz6kq2.js";import{bd,Xb,Cc}from"/$bunfs/root/chunk-1ptcbxz2.js";var a=ngn.filter((e)=>e!=="userSettings");function Rae(e){if(Qwn())return!1;if($Je())return!0;return(e??fxt()).length>0}function fxt(e=pxt()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${Li()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(Xb())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Cc(s)&&!u(t,s.url);if(s.source==="settings")return Cc(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!bd(`${n.name}@${t}`));return!1})}function u(e,r){let o=ms();if(a.some((t)=>o.includes(t)&&Object.hasOwn(_e(t)?.extraKnownMarketplaces??{},e)))return!0;return A6n({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(uv(),e)}function i(e){if(Ex()||Jm())return!1;let{servers:r}=td(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&Wwe(o)==="rejected")&&t2(o,t))}function pxt(){if(UT())return[];let e=ms(),r=e.includes("localSettings")?_e("localSettings"):null,o=[];if(e.includes("projectSettings")&&!Ww()&&c(_e("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{Rae,fxt,pxt};
