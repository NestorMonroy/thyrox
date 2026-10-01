// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{$T,AE}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Go}from"/$bunfs/root/chunk-3fx39wvj.js";import{za}from"/$bunfs/root/chunk-v5r4yd9z.js";import{CS,ge}from"/$bunfs/root/chunk-j27hwf9z.js";import{cKe,zko,GRr,XE,l1,Ru,ey}from"/$bunfs/root/chunk-kt4703ww.js";import{pf,IA,Ou}from"/$bunfs/root/chunk-1pw818zw.js";import{A$r,YNt}from"/$bunfs/root/chunk-76ncyjb9.js";var a=GRr.filter((e)=>e!=="userSettings");function ZMe(e){if(A$r())return!1;if(YNt())return!0;return(e??ctt()).length>0}function ctt(e=lIn()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${za()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(IA())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Ou(s)&&!u(t,s.url);if(s.source==="settings")return Ou(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!pf(`${n.name}@${t}`));return!1})}function u(e,r){let o=Go();if(a.some((t)=>o.includes(t)&&Object.hasOwn(ge(t)?.extraKnownMarketplaces??{},e)))return!0;return zko({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(XE(),e)}function i(e){if(AE()||ey())return!1;let{servers:r}=Ru(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&cKe(o)==="rejected")&&l1(o,t))}function lIn(){if($T())return[];let e=Go(),r=e.includes("localSettings")?ge("localSettings"):null,o=[];if(e.includes("projectSettings")&&!CS()&&c(ge("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{ZMe,ctt,lIn};
