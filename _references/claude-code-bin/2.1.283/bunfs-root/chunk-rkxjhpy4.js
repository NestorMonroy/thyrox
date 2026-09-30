// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{rT,PA}from"/$bunfs/root/chunk-nvht7ckf.js";import{fs}from"/$bunfs/root/chunk-sctj0cwn.js";import{ca}from"/$bunfs/root/chunk-v49zfq06.js";import{fA,he}from"/$bunfs/root/chunk-ckctvm5v.js";import{I2e,xho,Pvr,hE,jW,vp,u_}from"/$bunfs/root/chunk-csayct82.js";import{wf,jT,Tp}from"/$bunfs/root/chunk-dw3eh2qr.js";import{qOr,f0t}from"/$bunfs/root/chunk-d310mfjt.js";var a=Pvr.filter((e)=>e!=="userSettings");function HIe(e){if(qOr())return!1;if(f0t())return!0;return(e??xSn()).length>0}function xSn(e=ISn()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${ca()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(jT())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Tp(s)&&!u(t,s.url);if(s.source==="settings")return Tp(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!wf(`${n.name}@${t}`));return!1})}function u(e,r){let o=fs();if(a.some((t)=>o.includes(t)&&Object.hasOwn(he(t)?.extraKnownMarketplaces??{},e)))return!0;return xho({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(hE(),e)}function i(e){if(PA()||u_())return!1;let{servers:r}=vp(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&I2e(o)==="rejected")&&jW(o,t))}function ISn(){if(rT())return[];let e=fs(),r=e.includes("localSettings")?he("localSettings"):null,o=[];if(e.includes("projectSettings")&&!fA()&&c(he("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{HIe,xSn,ISn};
